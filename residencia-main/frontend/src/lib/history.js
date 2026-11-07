import { supabase } from './supabase';

export async function logHistoryEvent(type, title, description, profile) {
  try {
    await supabase.from('history').insert({
      type,
      title,
      description,
      user_name: profile?.full_name || 'Sistema',
      user_id: profile?.id || null,
    });
  } catch (err) {
    console.error('Error al registrar en historial:', err);
  }
}

