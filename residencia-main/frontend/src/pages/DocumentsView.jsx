import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DOCUMENT_CATEGORIES, formatFileSize, formatDateTime, getRoleLabel } from '../lib/constants';
import { logHistoryEvent } from '../lib/history';
import { downloadOriginalPdf, downloadSignatureReceipt } from '../lib/download';
import { UploadCloud, FileText, Trash2, PenTool, Download, FileCode, Filter, Loader2 } from 'lucide-react';

export default function DocumentsView({ onOpenSign, refreshTrigger }) {
  const { currentProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger, currentProfile?.id]);

  const loadDocuments = async () => {
    try {
      let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (currentProfile?.role === 'docente') {
        query = query.eq('uploaded_by', currentProfile.id);
      }
      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error al cargar documentos:', err);
    }
  };

  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setError('');
    setSuccess('');

    const pdfs = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfs.length === 0) {
      setError('Solo se permiten archivos PDF.');
      return;
    }

    setUploading(true);
    let addedCount = 0;
    const uploadErrors = [];

    try {
      for (const file of pdfs) {
        if (file.size > 10 * 1024 * 1024) {
          uploadErrors.push(`${file.name}: supera el límite de 10 MB.`);
          continue;
        }

        const filePath = `original/${currentProfile.id}/${Date.now()}_${file.name}`;
        const { error: storageErr } = await supabase.storage.from('documents').upload(filePath, file);

        if (storageErr) {
          uploadErrors.push(`${file.name}: ${storageErr.message}`);
          continue;
        }

        const { error: dbErr } = await supabase.from('documents').insert({
          name: file.name,
          category: selectedCategory,
          size: file.size,
          original_storage_path: filePath,
          status: 'pending',
          uploaded_by: currentProfile.id,
          uploaded_by_name: currentProfile.full_name,
        });

        if (dbErr) {
          await supabase.storage.from('documents').remove([filePath]);
          uploadErrors.push(`${file.name}: no se pudo registrar en BD (${dbErr.message}).`);
          continue;
        }

        addedCount++;
        await logHistoryEvent(
          'upload',
          file.name,
          `Categoría: ${selectedCategory} · Rol: ${getRoleLabel(currentProfile.role)}.`,
          currentProfile
        );
      }

      if (addedCount > 0) {
        setSuccess(`${addedCount} archivo(s) cargado(s) correctamente.`);
        setTimeout(() => setSuccess(''), 5000);
        await loadDocuments();
      }

      if (uploadErrors.length > 0) {
        setError(uploadErrors.join(' '));
      }
    } catch (err) {
      setError(err.message || 'Error inesperado durante la carga.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (currentProfile?.role !== 'jefe_division') return;
    if (!window.confirm(`¿Eliminar el documento "${doc.name}"?`)) return;

    try {
      if (doc.original_storage_path) {
        await supabase.storage.from('documents').remove([doc.original_storage_path]);
      }
      const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id);
      if (delErr) throw delErr;

      await logHistoryEvent('delete', 'Documento eliminado', doc.name, currentProfile);
      await loadDocuments();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const filteredDocuments =
    filterCategory === 'all'
      ? documents
      : documents.filter((d) => d.category === filterCategory);

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Documentos</h2>
          <p className="text-sm text-gray-500">Carga archivos PDF clasificados por categoría académica para su firma digital</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={(e) => {
          if (e.target.closest('select') || e.target.closest('label')) return;
          fileInputRef.current?.click();
        }}
        className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-6 ${
          dragOver
            ? 'border-accent bg-accent/5'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-accent'
        }`}
      >
        <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          Arrastra y suelta tus archivos PDF aquí
        </h3>
        <p className="text-xs text-gray-500 mb-4">o haz clic para seleccionar (máx. 10MB · Solo PDF)</p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto mb-5"
          onClick={(e) => e.stopPropagation()}
        >
          <label htmlFor="fileCategorySelect" className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
            Categoría del archivo:
          </label>
          <select
            id="fileCategorySelect"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={uploading}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileUpload(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-accent gap-2"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          <span>{uploading ? 'Cargando PDF...' : 'Seleccionar archivos'}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4" style={{ display: 'flex' }}>
          <span>✅ {success}</span>
        </div>
      )}

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Documentos cargados</h3>
            <span className="text-xs text-gray-500 font-mono">{filteredDocuments.length} archivo(s)</span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filtrar por categoría"
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 focus:border-accent outline-none"
            >
              <option value="all">Todas las categorías</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Tamaño</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-4 font-medium truncate max-w-[220px]" title={doc.name}>
                    📄 {doc.name}
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {doc.category || 'Sin categoría'}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 font-mono">{formatFileSize(doc.size)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDateTime(doc.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className={`status-badge ${doc.status === 'signed' ? 'status-signed' : 'status-pending'}`}>
                      {doc.status === 'signed' ? '✅ Firmado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => onOpenSign(doc)}
                          className="btn btn-success btn-xs gap-1"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Firmar</span>
                        </button>
                      )}

                      <button
                        onClick={() => downloadOriginalPdf(doc, currentProfile).catch((e) => alert(e.message))}
                        className="btn btn-outline btn-xs gap-1"
                        title="Descargar PDF original"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>

                      {doc.status === 'signed' && (
                        <button
                          onClick={() => downloadSignatureReceipt(doc, currentProfile).catch((e) => alert(e.message))}
                          className="btn btn-outline btn-xs gap-1"
                          title="Descargar constancia criptográfica (.txt)"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>.txt</span>
                        </button>
                      )}

                      {currentProfile?.role === 'jefe_division' && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="btn btn-danger btn-xs text-white"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                    No hay documentos
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
