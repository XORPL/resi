import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { inviteUserByEmail, deleteUserAccount } from '../lib/api';
import { getRoleLabel } from '../lib/constants';
import { logHistoryEvent } from '../lib/history';
import { UserPlus, Edit3, Trash2, Mail, Loader2 } from 'lucide-react';

export default function UsersView() {
  const { currentProfile, reloadProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Modal de Invitación (solo correo + rol)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('docente');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Modal de Edición (username, full_name, role)
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('docente');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const isJefe = currentProfile?.role === 'jefe_division';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setUsers(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!isJefe) return;
    setInviteError('');
    setStatusMessage('');

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setInviteError('Ingresa el correo electrónico del nuevo usuario.');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await inviteUserByEmail(cleanEmail, inviteRole);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('docente');
      setStatusMessage(res.message || `Invitación enviada a ${cleanEmail}.`);
      setTimeout(() => setStatusMessage(''), 6000);
      await loadUsers();
    } catch (err) {
      setInviteError(err.message || 'No se pudo enviar la invitación.');
    } finally {
      setInviteLoading(false);
    }
  };

  const openEditModal = (u) => {
    if (!isJefe) return;
    setEditingUser(u);
    setEditUsername(u.username || '');
    setEditFullName(u.full_name || '');
    setEditRole(u.role || 'docente');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!isJefe || !editingUser) return;
    setEditError('');

    if (!editUsername.trim() || !editFullName.trim()) {
      setEditError('El usuario y el nombre completo son obligatorios.');
      return;
    }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim(),
          full_name: editFullName.trim(),
          role: editRole,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      await logHistoryEvent(
        'user',
        'Usuario actualizado',
        `Se actualizaron los datos de "${editFullName.trim()}" (${getRoleLabel(editRole)}).`,
        currentProfile
      );

      if (editingUser.id === currentProfile.id) {
        await reloadProfile();
      }

      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.message || 'No se pudo actualizar el usuario.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (u) => {
    if (!isJefe || u.id === currentProfile.id) return;
    const nextState = !u.active;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: nextState })
        .eq('id', u.id);

      if (error) throw error;

      await logHistoryEvent(
        'user',
        nextState ? 'Cuenta reactivada' : 'Cuenta suspendida',
        `El acceso de "${u.full_name}" quedó ${nextState ? 'activo' : 'inactivo'}.`,
        currentProfile
      );

      await loadUsers();
    } catch (err) {
      alert('No se pudo cambiar el estado de la cuenta: ' + err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!isJefe || u.id === currentProfile.id) return;
    if (!window.confirm(`¿Eliminar permanentemente al usuario "${u.full_name}"?`)) return;

    try {
      await deleteUserAccount(u.id);
      await loadUsers();
    } catch (err) {
      alert('No se pudo eliminar el usuario: ' + err.message);
    }
  };

  const roleBadgeStyle = (role) => {
    if (role === 'jefe_division') return { background: '#fdecea', color: '#c0392b' };
    if (role === 'presidente_academia') return { background: '#fef9e7', color: '#b7950b' };
    if (role === 'secretario_academia') return { background: '#e8f8f5', color: '#1e8449' };
    return { background: '#e3f2fd', color: '#1565c0' };
  };

  return (
    <div className="content-section active">
      <div className="section-header flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Administración de Usuarios</h2>
          <p className="text-sm text-gray-500">
            {isJefe
              ? 'Invita nuevos usuarios por correo y gestiona roles y estados de acceso'
              : 'Consulta del directorio institucional de usuarios y roles'}
          </p>
        </div>

        {isJefe && (
          <button
            type="button"
            onClick={() => {
              setInviteError('');
              setInviteOpen(true);
            }}
            className="btn btn-accent gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="alert alert-success mb-4" style={{ display: 'flex' }}>
          <span>✅ {statusMessage}</span>
        </div>
      )}

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[650px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                {isJefe && <th className="px-5 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-4 font-mono text-xs">{u.username}</td>
                  <td className="px-5 py-4 font-semibold">{u.full_name}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{u.email || '—'}</td>
                  <td className="px-5 py-4">
                    <span className="status-badge" style={roleBadgeStyle(u.role)}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {u.setup_completed === false ? (
                      <span className="status-badge status-pending">📧 Invitación pendiente</span>
                    ) : (
                      <span className={`status-badge ${u.active ? 'status-signed' : 'status-pending'}`}>
                        {u.active ? '✅ Activo' : '⛔ Inactivo'}
                      </span>
                    )}
                  </td>
                  {isJefe && (
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="btn btn-outline btn-xs"
                          title="Editar usuario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {u.id !== currentProfile?.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="btn btn-outline btn-xs"
                              title={u.active ? 'Suspender cuenta' : 'Activar cuenta'}
                            >
                              {u.active ? '⛔' : '✅'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="btn btn-danger btn-xs text-white"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={isJefe ? 6 : 5} className="text-center py-8 text-gray-500 text-sm">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Invitación de Nuevo Usuario (exclusivo Jefe de División) */}
      {inviteOpen && isJefe && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && !inviteLoading && setInviteOpen(false)}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="font-bold text-lg">Invitar Nuevo Usuario</h3>
              <button
                className="modal-close"
                onClick={() => setInviteOpen(false)}
                disabled={inviteLoading}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info mb-4" style={{ display: 'flex' }}>
                <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Se enviará un correo de invitación al usuario. Al aceptarlo, definirá su nombre completo y contraseña.
                </span>
              </div>

              {inviteError && (
                <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
                  <span>⚠️ {inviteError}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico del nuevo usuario
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="correo@tesjo.edu.mx"
                      required
                      disabled={inviteLoading}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                    />
                    <span className="absolute left-3">📧</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Rol que tendrá en el sistema
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={inviteLoading}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                    >
                      <option value="docente">Docente</option>
                      <option value="secretario_academia">Secretario de Academia</option>
                      <option value="presidente_academia">Presidente de Academia</option>
                      <option value="jefe_division">Jefe de División</option>
                    </select>
                    <span className="absolute left-3">🎭</span>
                  </div>
                </div>

                <div className="modal-footer mt-6 px-0 pb-0">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setInviteOpen(false)}
                    disabled={inviteLoading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-accent gap-2" disabled={inviteLoading}>
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>{inviteLoading ? 'Enviando invitación...' : 'Enviar Invitación'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Usuario */}
      {editingUser && isJefe && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && !editLoading && setEditingUser(null)}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="font-bold text-lg">Editar Usuario</h3>
              <button
                className="modal-close"
                onClick={() => setEditingUser(null)}
                disabled={editLoading}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {editError && (
                <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
                  <span>⚠️ {editError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    disabled={editLoading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                    disabled={editLoading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Rol institucional
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={editLoading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  >
                    <option value="docente">Docente</option>
                    <option value="secretario_academia">Secretario de Academia</option>
                    <option value="presidente_academia">Presidente de Academia</option>
                    <option value="jefe_division">Jefe de División</option>
                  </select>
                </div>

                <div className="modal-footer mt-6 px-0 pb-0">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setEditingUser(null)}
                    disabled={editLoading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={editLoading}>
                    {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
