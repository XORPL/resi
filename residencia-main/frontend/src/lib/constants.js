export const ROLE_LABELS = {
  jefe_division: 'Jefe de División',
  presidente_academia: 'Presidente de Academia',
  secretario_academia: 'Secretario de Academia',
  docente: 'Docente',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Sin rol';
}

export const DOCUMENT_CATEGORIES = [
  'Fotesjo 6',
  'Fotesjo 4',
  'Minutas',
  'Plan de trabajo presidente',
  'Tutorías',
  'Fotesjo 111',
  'Fotesjo 113',
];

export const OFFICE_LABELS = {
  presidente_academia: 'Presidente de academia',
  secretario_academia: 'Secretario de academia',
  jefe_division: 'Jefe de división',
};

export function formatFileSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

