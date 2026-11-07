import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../lib/constants';
import { Shield, User, Lock, Eye, EyeOff, CheckCircle2, Loader2, LogOut } from 'lucide-react';

export default function CompleteInviteView() {
  const { currentUser, currentProfile, completeAccountSetup, logout } = useAuth();
  const [fullName, setFullName] = useState(
    currentProfile?.full_name && currentProfile.full_name !== 'Invitación pendiente'
      ? currentProfile.full_name
      : ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await completeAccountSetup(fullName, password);
    } catch (err) {
      setError(err.message || 'No se pudo completar la configuración de tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-white shadow">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Activar Cuenta Institucional</h1>
            <p className="text-xs text-gray-500">Completa tu registro para ingresar a FirmaDigital</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs mb-6 space-y-1">
          <div className="text-gray-700 dark:text-gray-300">
            <strong>Correo invitado:</strong> {currentUser?.email}
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            <strong>Rol asignado:</strong>{' '}
            <span className="font-semibold text-accent">{getRoleLabel(currentProfile?.role)}</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Nombre completo
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Mtro. Juan Pérez García"
                maxLength={120}
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Crear contraseña (mín. 6 caracteres)
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                required
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-accent py-3 gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{loading ? 'Guardando configuración...' : 'Guardar y Acceder al Sistema'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancelar y salir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

