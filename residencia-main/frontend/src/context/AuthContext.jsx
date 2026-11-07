import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { checkKeysStatus } from '../lib/api';
import { logHistoryEvent } from '../lib/history';

const AuthContext = createContext();

// Capturar indicador de invitación en la URL antes de que Supabase limpie el hash
const INITIAL_URL_HAS_INVITE =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=invite') || window.location.search.includes('type=invite'));

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [needsAccountSetup, setNeedsAccountSetup] = useState(INITIAL_URL_HAS_INVITE);
  const [authNotice, setAuthNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fd_theme') === 'dark');
  const manualLoginInProgress = useRef(false);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('fd_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const refreshKeyStatus = async (userId) => {
    const targetId = userId || currentUser?.id;
    if (!targetId) {
      setHasKeys(false);
      return;
    }
    try {
      const status = await checkKeysStatus(targetId);
      setHasKeys(Boolean(status.has_keys));
    } catch {
      setHasKeys(false);
    }
  };

  const fetchValidProfile = async (user) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error al cargar perfil:', error);
      return null;
    }

    // Sin perfil asignado o inactivo => sin acceso
    if (!data || !data.active) {
      return null;
    }

    return data;
  };

  const applyAuthenticatedSession = async (user, isInviteEvent = false) => {
    const profile = await fetchValidProfile(user);

    if (!profile) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setCurrentProfile(null);
      setHasKeys(false);
      setNeedsAccountSetup(false);
      setAuthNotice('Esta cuenta no tiene acceso activo. Contacta al administrador.');
      return null;
    }

    const pendingSetup =
      isInviteEvent ||
      profile.setup_completed === false ||
      user.user_metadata?.setup_completed === false;

    setCurrentUser(user);
    setCurrentProfile(profile);
    setNeedsAccountSetup(pendingSetup);

    if (!pendingSetup) {
      await refreshKeyStatus(user.id);
    } else {
      setHasKeys(false);
    }

    return profile;
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await applyAuthenticatedSession(session.user, INITIAL_URL_HAS_INVITE);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        const isInvite = event === 'PASSWORD_RECOVERY' || INITIAL_URL_HAS_INVITE;
        await applyAuthenticatedSession(session.user, isInvite);
      } else {
        setCurrentUser(null);
        setCurrentProfile(null);
        setHasKeys(false);
        setNeedsAccountSetup(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setAuthNotice('');
    manualLoginInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error('No se pudo iniciar sesión. Verifica tus credenciales o intenta más tarde.');
      }

      const profile = await applyAuthenticatedSession(data.user, false);
      if (!profile) {
        throw new Error('Esta cuenta no tiene acceso activo. Contacta al administrador.');
      }

      if (profile.setup_completed !== false) {
        await logHistoryEvent(
          'login',
          'Inicio de sesión',
          `${profile.full_name} accedió al sistema.`,
          profile
        );
      }

      return data;
    } finally {
      manualLoginInProgress.current = false;
    }
  };

  const completeAccountSetup = async (fullName, password) => {
    if (!currentUser || !currentProfile) {
      throw new Error('No hay una sesión de invitación activa.');
    }

    const trimmedName = fullName.trim();
    const { error: authErr } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: trimmedName,
        setup_completed: true,
      },
    });

    if (authErr) {
      throw new Error(authErr.message || 'No se pudo configurar la contraseña.');
    }

    const { data: updatedProfile, error: profErr } = await supabase
      .from('profiles')
      .update({
        full_name: trimmedName,
        email: currentUser.email,
        setup_completed: true,
      })
      .eq('id', currentUser.id)
      .select('*')
      .single();

    if (profErr) {
      throw new Error(profErr.message || 'No se pudo guardar tu perfil.');
    }

    setCurrentProfile(updatedProfile);
    setNeedsAccountSetup(false);

    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    await logHistoryEvent(
      'login',
      'Activación de cuenta por invitación',
      `${trimmedName} configuró su nombre y contraseña e ingresó al sistema.`,
      updatedProfile
    );

    await refreshKeyStatus(currentUser.id);
    return updatedProfile;
  };

  const reloadProfile = async () => {
    if (!currentUser) return;
    const profile = await fetchValidProfile(currentUser);
    if (profile) setCurrentProfile(profile);
  };

  const logout = async () => {
    if (currentProfile) {
      await logHistoryEvent(
        'login',
        'Cierre de sesión',
        `${currentProfile.full_name} salió del sistema.`,
        currentProfile
      );
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    setHasKeys(false);
    setNeedsAccountSetup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentProfile,
        hasKeys,
        needsAccountSetup,
        authNotice,
        setAuthNotice,
        loading,
        darkMode,
        setDarkMode,
        login,
        logout,
        completeAccountSetup,
        reloadProfile,
        refreshKeyStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
