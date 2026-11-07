import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/constants';
import { PenTool, ShieldAlert, KeyRound } from 'lucide-react';

export default function SignView({ onOpenSign, onOpenKeyModal, refreshTrigger }) {
  const { currentProfile, hasKeys } = useAuth();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    loadPendingDocuments();
  }, [refreshTrigger, currentProfile?.id]);

  const loadPendingDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (currentProfile?.role === 'docente') {
        query = query.eq('uploaded_by', currentProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error al cargar pendientes:', err);
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Firma Digital Híbrida</h2>
          <p className="text-sm text-gray-500">Aplica firma clásica RSA-2048 y post-cuántica ML-DSA-87 (FIPS 204)</p>
        </div>
      </div>

      {!hasKeys && (
        <div className="alert alert-warning mb-6 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800" style={{ display: 'flex' }}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">Llaves Criptográficas No Registradas</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Para firmar documentos debe generar previamente su par de llaves protegidas con PIN.
              </p>
            </div>
          </div>
          <button onClick={onOpenKeyModal} className="btn btn-warning btn-sm gap-2 text-white bg-amber-600 hover:bg-amber-700">
            <KeyRound className="w-4 h-4" />
            <span>Generar Llaves Ahora</span>
          </button>
        </div>
      )}

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm">Documentos pendientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[650px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Cargado por</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium truncate max-w-xs" title={doc.name}>
                    📄 {doc.name}
                  </td>
                  <td className="px-6 py-4 text-xs">{doc.category || 'Sin categoría'}</td>
                  <td className="px-6 py-4">{doc.uploaded_by_name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{formatDateTime(doc.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className="status-badge status-pending">⏳ Pendiente</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onOpenSign(doc)}
                      disabled={!hasKeys}
                      className="btn btn-success btn-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Firmar</span>
                    </button>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                    No hay pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
