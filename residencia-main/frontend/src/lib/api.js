import { supabase } from './supabase';

// En producción (Vercel) usa rutas relativas Same-Origin (/api/...), evitando exponer puertos o problemas de CORS
const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');

async function getAuthHeaders(includeJson = true) {
  const headers = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function checkKeysStatus(userId) {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`${API_BASE_URL}/api/keys/status/${userId}`, { headers });
  if (!res.ok) throw new Error('Error al consultar estado de llaves');
  return await res.json();
}

export async function generateUserKeys(userId, pin) {
  const headers = await getAuthHeaders(true);
  const res = await fetch(`${API_BASE_URL}/api/keys/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al generar llaves criptográficas');
  return data;
}

export async function signDocument(documentId, userId, pin) {
  const headers = await getAuthHeaders(true);
  const res = await fetch(`${API_BASE_URL}/api/sign/document`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ document_id: documentId, user_id: userId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error durante el proceso de firma');
  return data;
}

export async function verifyDocumentById(documentId) {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`${API_BASE_URL}/api/verify/${documentId}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al verificar documento');
  return data;
}

export async function inviteUserByEmail(email, role) {
  const headers = await getAuthHeaders(true);
  const res = await fetch(`${API_BASE_URL}/api/users/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al enviar invitación');
  return data;
}

export async function deleteUserAccount(userId) {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al eliminar usuario');
  return data;
}
