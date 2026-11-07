import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { OFFICE_LABELS, formatDateTime } from '../lib/constants';
import { Trash2, Edit3, Landmark, ScrollText } from 'lucide-react';

export default function HistoryView({ refreshTrigger }) {
  const { currentProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('activity');
  const [history, setHistory] = useState([]);
  const [leadershipHistory, setLeadershipHistory] = useState([]);

  // Estado del formulario de cargos académicos
  const [editingId, setEditingId] = useState(null);
  const [officeType, setOfficeType] = useState('presidente_academia');
  const [officeName, setOfficeName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [leadershipError, setLeadershipError] = useState('');
  const [savingLeadership, setSavingLeadership] = useState(false);

  const canClearHistory = currentProfile?.role === 'jefe_division';
  const canEditLeadership = currentProfile?.role === 'presidente_academia';

  useEffect(() => {
    loadHistory();
    loadLeadershipHistory();
  }, [refreshTrigger]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (!error) setHistory(data || []);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  };

  const loadLeadershipHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('academy_office_history')
        .select('*')
        .order('year_start', { ascending: false });
      if (!error) setLeadershipHistory(data || []);
    } catch (err) {
      console.error('Error al cargar cargos académicos:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!canClearHistory) return;
    if (!window.confirm('¿Limpiar todo el historial de actividad del sistema?')) return;

    const { error } = await supabase
      .from('history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      alert('No se pudo limpiar el historial. Verifica tus permisos.');
      return;
    }

    setHistory([]);
  };

  const resetLeadershipForm = () => {
    setEditingId(null);
    setOfficeType('presidente_academia');
    setOfficeName('');
    setYearStart('');
    setYearEnd('');
    setLeadershipError('');
  };

  const handleSaveLeadership = async (e) => {
    e.preventDefault();
    if (!canEditLeadership) return;

    const trimmedName = officeName.trim();
    const startNum = Number(yearStart);
    const endNum = Number(yearEnd);

    if (!trimmedName || !startNum || !endNum || startNum < 1900 || endNum > 2200 || startNum > endNum) {
      setLeadershipError('Completa el nombre y un periodo de años válido (año inicial menor o igual al final).');
      return;
    }

    setLeadershipError('');
    setSavingLeadership(true);

    try {
      const record = {
        office_type: officeType,
        office_name: trimmedName,
        year_start: startNum,
        year_end: endNum,
      };

      const query = editingId
        ? supabase.from('academy_office_history').update(record).eq('id', editingId)
        : supabase.from('academy_office_history').insert({ ...record, created_by: currentProfile.id });

      const { error } = await query;
      if (error) throw error;

      resetLeadershipForm();
      await loadLeadershipHistory();
    } catch (err) {
      setLeadershipError(err.message || 'No se pudo guardar el periodo.');
    } finally {
      setSavingLeadership(false);
    }
  };

  const handleEditLeadership = (row) => {
    if (!canEditLeadership) return;
    setEditingId(row.id);
    setOfficeType(row.office_type);
    setOfficeName(row.office_name);
    setYearStart(String(row.year_start));
    setYearEnd(String(row.year_end));
    setLeadershipError('');
  };

  const handleDeleteLeadership = async (id) => {
    if (!canEditLeadership) return;
    if (!window.confirm('¿Eliminar este periodo del historial de cargos?')) return;

    const { error } = await supabase.from('academy_office_history').delete().eq('id', id);
    if (error) {
      setLeadershipError(error.message || 'No se pudo eliminar el periodo.');
      return;
    }
    if (editingId === id) resetLeadershipForm();
    await loadLeadershipHistory();
  };

  const historyIcons = {
    login: '🔐',
    sign: '✍️',
    verify: '🔍',
    upload: '📤',
    download: '⬇️',
    delete: '🗑️',
    user: '👤',
    error: '⚠️',
  };

  const borderByType = {
    sign: 'border-l-emerald-500',
    verify: 'border-l-accent',
    login: 'border-l-amber-500',
    delete: 'border-l-red-500',
    error: 'border-l-red-500',
    upload: 'border-l-blue-500',
    download: 'border-l-indigo-500',
    user: 'border-l-purple-500',
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h2>
          <p className="text-sm text-gray-500">Consulta la actividad del sistema o los cargos académicos.</p>
        </div>
      </div>

      {/* Pestañas */}
      <div
        className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto"
        role="tablist"
        aria-label="Secciones del historial"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3 text-sm font-semibold border-b-3 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'activity'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>Actividad del sistema</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'leadership'}
          onClick={() => setActiveTab('leadership')}
          className={`px-4 py-3 text-sm font-semibold border-b-3 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'leadership'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Cargos académicos</span>
        </button>
      </div>

      {/* Panel 1: Actividad del sistema */}
      {activeTab === 'activity' && (
        <div role="tabpanel">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Actividad del sistema</h3>
              <p className="text-xs text-gray-500">Registro cronológico de operaciones recientes.</p>
            </div>
            {canClearHistory && (
              <button onClick={handleClearHistory} className="btn btn-outline btn-sm gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${
                  borderByType[item.type] || 'border-l-accent'
                } flex items-start gap-4`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                  {historyIcons[item.type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5">{item.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                    {item.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-400">
                    <span>👤 {item.user_name}</span>
                    <span>🕒 {formatDateTime(item.date)}</span>
                  </div>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">No hay eventos registrados</div>
            )}
          </div>
        </div>
      )}

      {/* Panel 2: Cargos académicos */}
      {activeTab === 'leadership' && (
        <div role="tabpanel">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cargos académicos</h3>
            <p className="text-xs text-gray-500">Consulta quién ocupó cada cargo y durante qué años.</p>
          </div>

          {canEditLeadership && (
            <form
              onSubmit={handleSaveLeadership}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6"
            >
              <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-4">
                {editingId ? 'Editar periodo' : 'Agregar periodo'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
                  <select
                    value={officeType}
                    onChange={(e) => setOfficeType(e.target.value)}
                    disabled={savingLeadership}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  >
                    <option value="presidente_academia">Presidente de academia</option>
                    <option value="secretario_academia">Secretario de academia</option>
                    <option value="jefe_division">Jefe de división</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="Nombre completo"
                    disabled={savingLeadership}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Año inicial
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2200}
                    value={yearStart}
                    onChange={(e) => setYearStart(e.target.value)}
                    placeholder="Ej. 2023"
                    disabled={savingLeadership}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Año final
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2200}
                    value={yearEnd}
                    onChange={(e) => setYearEnd(e.target.value)}
                    placeholder="Ej. 2026"
                    disabled={savingLeadership}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>
              </div>

              {leadershipError && (
                <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
                  <span>⚠️ {leadershipError}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={savingLeadership} className="btn btn-accent btn-sm">
                  {editingId ? 'Guardar cambios' : 'Guardar periodo'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetLeadershipForm}
                    disabled={savingLeadership}
                    className="btn btn-outline btn-sm"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="space-y-3">
            {leadershipHistory.map((row) => (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-accent flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                  🏛️
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5">
                    {OFFICE_LABELS[row.office_type] || row.office_type} · {row.office_name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Periodo: {row.year_start}–{row.year_end}
                  </p>

                  {canEditLeadership && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleEditLeadership(row)}
                        className="btn btn-outline btn-xs gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeadership(row.id)}
                        className="btn btn-danger btn-xs gap-1 text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {leadershipHistory.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">No hay periodos registrados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
