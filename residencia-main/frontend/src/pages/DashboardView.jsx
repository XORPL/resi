import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/constants';
import { FileText, Clock, CheckCircle, ShieldCheck } from 'lucide-react';

export default function DashboardView({ refreshTrigger }) {
  const { currentProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, currentProfile?.id]);

  const fetchData = async () => {
    try {
      const [docRes, verifyRes] = await Promise.all([
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('history').select('id', { count: 'exact', head: true }).eq('type', 'verify'),
      ]);

      if (docRes.data) setDocuments(docRes.data);
      setVerifiedCount(verifyRes.count || 0);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    }
  };

  const totalDocs = documents.length;
  const pendingDocs = documents.filter((d) => d.status === 'pending').length;
  const signedDocs = documents.filter((d) => d.status === 'signed').length;

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {currentProfile?.full_name?.split(' ')[0] || 'Usuario'}
          </h2>
          <p className="text-sm text-gray-500">Resumen general del sistema</p>
        </div>
      </div>

      <div className="cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{totalDocs}</div>
          <div className="stat-label text-xs text-gray-500">Documentos totales</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{pendingDocs}</div>
          <div className="stat-label text-xs text-gray-500">Pendientes de firma</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{signedDocs}</div>
          <div className="stat-label text-xs text-gray-500">Firmados con ML-DSA-87</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{verifiedCount}</div>
          <div className="stat-label text-xs text-gray-500">Validaciones</div>
        </div>
      </div>

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm">Actividad reciente</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.slice(0, 5).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium max-w-xs truncate" title={doc.name}>
                    {doc.name}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                    {doc.category || 'Sin categoría'}
                  </td>
                  <td className="px-6 py-4">{doc.uploaded_by_name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{formatDateTime(doc.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${doc.status === 'signed' ? 'status-signed' : 'status-pending'}`}>
                      {doc.status === 'signed' ? '✅ Firmado' : '⏳ Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                    No hay actividad reciente
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
