import { supabase } from './supabase';
import { formatDateTime } from './constants';
import { logHistoryEvent } from './history';

export async function downloadOriginalPdf(doc, profile) {
  if (!doc?.original_storage_path) {
    throw new Error('No se encontró la ruta del archivo PDF en el almacenamiento.');
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .download(doc.original_storage_path);

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo descargar el PDF desde Supabase Storage.');
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.name.toLowerCase().endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  await logHistoryEvent('download', 'Documento PDF descargado', `"${doc.name}".`, profile);
}

export async function downloadSignatureReceipt(doc, profile) {
  if (!doc) return;

  const receipt = [
    '====================================================',
    '  CONSTANCIA DE FIRMA DIGITAL HÍBRIDA · TESJo',
    '====================================================',
    `Documento:   ${doc.name}`,
    `Categoría:   ${doc.category || 'Sin categoría'}`,
    `Firmado por: ${doc.signed_by || profile?.full_name || '—'}`,
    `Fecha firma: ${formatDateTime(doc.signed_at || new Date().toISOString())}`,
    '',
    '--- HASH SHA-256 BINARIO ---',
    doc.doc_hash || 'N/A',
    '',
    '--- FIRMA CLÁSICA RSA-2048 (RSASSA-PSS) ---',
    doc.rsa_signature || 'N/A',
    '',
    '--- FIRMA POST-CUÁNTICA ML-DSA-87 (FIPS 204) ---',
    doc.mldsa_signature || 'N/A',
    '====================================================',
  ].join('\n');

  const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/\.pdf$/i, '')}_constancia_firma.txt`;
  a.click();
  URL.revokeObjectURL(url);

  await logHistoryEvent('download', 'Constancia criptográfica descargada', `"${doc.name}".`, profile);
}

