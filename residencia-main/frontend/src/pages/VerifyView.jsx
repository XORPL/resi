import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { verifyDocumentById } from '../lib/api';
import { downloadOriginalPdf, downloadSignatureReceipt } from '../lib/download';
import { formatDateTime } from '../lib/constants';
import { Search, CheckCircle2, XCircle, ShieldCheck, Download, FileCode, Loader2 } from 'lucide-react';

export default function VerifyView({ refreshTrigger }) {
  const { currentProfile } = useAuth();
  const [signedDocs, setSignedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSignedDocuments();
  }, [refreshTrigger]);

  const loadSignedDocuments = async () => {
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'signed')
        .order('signed_at', { ascending: false });
      setSignedDocs(data || []);
    } catch (err) {
      console.error('Error al cargar firmados:', err);
    }
  };

  const handleVerify = async (doc) => {
    setSelectedDoc(doc);
    setVerificationResult(null);
    setLoading(true);

    try {
      const res = await verifyDocumentById(doc.id);
      setVerificationResult(res);
    } catch (err) {
      alert('Error en verificación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verificación de Firmas</h2>
          <p className="text-sm text-gray-500">
            Comprueba la autenticidad e integridad binaria del PDF almacenado junto con sus firmas RSA-2048 y ML-DSA-87
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Documentos firmados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Firmado por</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {signedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedDoc?.id === doc.id ? 'bg-accent/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[160px]" title={doc.name}>
                      📄 {doc.name}
                    </td>
                    <td className="px-4 py-3 text-xs">{doc.signed_by}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(doc.signed_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleVerify(doc)}
                          className="btn btn-accent btn-xs gap-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>Verificar</span>
                        </button>
                        <button
                          onClick={() => downloadOriginalPdf(doc, currentProfile).catch((e) => alert(e.message))}
                          className="btn btn-outline btn-xs"
                          title="Descargar PDF original"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => downloadSignatureReceipt(doc, currentProfile).catch((e) => alert(e.message))}
                          className="btn btn-outline btn-xs"
                          title="Descargar constancia criptográfica (.txt)"
                        >
                          <FileCode className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {signedDocs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500 text-sm">
                      No hay firmados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span>Resultado de Validación Matemática</span>
          </h3>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
              <span className="text-sm">Descargando PDF y verificando hash + firmas RSA-2048 y ML-DSA-87...</span>
            </div>
          )}

          {!loading && verificationResult && (
            <div>
              <div
                className={`p-4 rounded-xl border mb-5 flex items-start gap-3 ${
                  verificationResult.is_valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                }`}
              >
                {verificationResult.is_valid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-base">
                    {verificationResult.is_valid ? '✅ VERIFICACIÓN EXITOSA' : '❌ VERIFICACIÓN FALLIDA'}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">{verificationResult.message}</p>
                  {verificationResult.signed_by && (
                    <p className="text-xs mt-1.5 opacity-80">
                      Firmante: <b>{verificationResult.signed_by}</b> ({verificationResult.signer_role})
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-2">
                    RSA-2048 · Firma Clásica
                  </span>
                  <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <div>
                      <strong>Estado:</strong> {verificationResult.rsa_valid ? '✅ Válida (RSASSA-PSS)' : '❌ Inválida'}
                    </div>
                    <div>
                      <strong>Hash coincide:</strong> {verificationResult.hash_matches ? '✅ Sí' : '❌ No'}
                    </div>
                  </div>
                  {verificationResult.rsa_signature && (
                    <code className="block mt-2 p-2 rounded bg-white dark:bg-gray-800 text-[10px] font-mono break-all text-primary dark:text-blue-300">
                      {verificationResult.rsa_signature.substring(0, 80)}...
                    </code>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 mb-2">
                    ML-DSA-87 · Post-Cuántica
                  </span>
                  <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <div>
                      <strong>Estado:</strong> {verificationResult.mldsa_valid ? '✅ Válida (FIPS 204)' : '❌ Inválida'}
                    </div>
                    <div>
                      <strong>Integridad PDF:</strong> {verificationResult.hash_matches ? '✅ Intacto' : '❌ Alterado'}
                    </div>
                  </div>
                  {verificationResult.mldsa_signature && (
                    <code className="block mt-2 p-2 rounded bg-white dark:bg-gray-800 text-[10px] font-mono break-all text-purple-700 dark:text-purple-300">
                      {verificationResult.mldsa_signature.substring(0, 80)}...
                    </code>
                  )}
                </div>
              </div>

              {verificationResult.doc_hash && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono break-all">
                  <span className="font-bold text-gray-500 block mb-1 font-sans">Hash SHA-256 Registrado:</span>
                  <span className="text-primary dark:text-accent">{verificationResult.doc_hash}</span>
                </div>
              )}
            </div>
          )}

          {!loading && !verificationResult && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Seleccione un documento de la lista y presione "Verificar" para comprobar su hash e integridad matemática.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
