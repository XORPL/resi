import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { signDocument } from '../lib/api';
import { downloadOriginalPdf, downloadSignatureReceipt } from '../lib/download';
import { formatFileSize } from '../lib/constants';
import { FileText, CheckCircle2, Lock, Download, FileCode, Loader2 } from 'lucide-react';

export default function SignModal({ document: doc, isOpen, onClose, onSuccess }) {
  const { currentProfile } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setResult(null);
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const handleSign = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!pin) {
      setError('Por favor ingrese su PIN de seguridad.');
      return;
    }

    setLoading(true);
    try {
      const res = await signDocument(doc.id, currentProfile.id, pin);
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Error al firmar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const signedDocRecord = result
    ? {
        ...doc,
        status: 'signed',
        signed_by: currentProfile?.full_name,
        signed_at: new Date().toISOString(),
        doc_hash: result.doc_hash,
        rsa_signature: result.rsa_signature,
        mldsa_signature: result.mldsa_signature,
      }
    : doc;

  const handleDownloadPdf = async () => {
    try {
      await downloadOriginalPdf(signedDocRecord, currentProfile);
    } catch (err) {
      alert('Error al descargar PDF: ' + err.message);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      await downloadSignatureReceipt(signedDocRecord, currentProfile);
    } catch (err) {
      alert('Error al descargar constancia: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg">Firma Digital Híbrida (RSA-2048 + ML-DSA-87)</h3>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info mb-4" style={{ display: 'flex' }}>
            <span>
              📄 Documento: <b>{doc.name}</b> · Categoría: <b>{doc.category || 'Sin categoría'}</b> ({formatFileSize(doc.size)})
            </span>
          </div>

          {error && (
            <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSign}>
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1.5">
                  Ingrese su PIN de Seguridad para Desbloquear su Llave Privada
                </label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN de seguridad (6+ caracteres)"
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                  <span className="absolute left-3">🔒</span>
                </div>
              </div>

              <div className="modal-footer mt-6 px-0 pb-0">
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{loading ? 'Descifrando y Firmando con ML-DSA-87...' : 'Firmar Documento'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="sign-result mt-2">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <h4 className="font-bold text-base">¡Firmas Criptográficas Aplicadas Correctamente!</h4>
              </div>

              <p className="text-xs mb-1.5"><strong>Hash SHA-256 Binario Real:</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2.5 rounded text-xs break-all font-mono text-primary dark:text-accent mb-3">
                {result.doc_hash}
              </code>

              <p className="text-xs mb-1.5"><strong>Firma Clásica RSA-2048 (RSASSA-PSS):</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2.5 rounded text-xs break-all font-mono text-primary dark:text-blue-300 mb-3">
                {result.rsa_signature.substring(0, 96)}...
              </code>

              <p className="text-xs mb-1.5"><strong>Firma Post-Cuántica ML-DSA-87 (FIPS 204):</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2.5 rounded text-xs break-all font-mono text-purple-700 dark:text-purple-300 mb-4">
                {result.mldsa_signature.substring(0, 120)}... [4,627 Bytes]
              </code>

              <div className="modal-footer mt-6 px-0 pb-0 flex-wrap">
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-outline gap-2" onClick={handleDownloadReceipt}>
                  <FileCode className="w-4 h-4" />
                  <span>Constancia (.txt)</span>
                </button>
                <button type="button" className="btn btn-success gap-2" onClick={handleDownloadPdf}>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
