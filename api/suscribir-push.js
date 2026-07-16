import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription } = req.body || {};

  if (
    !subscription ||
    typeof subscription !== 'object' ||
    !subscription.endpoint ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== 'string' ||
    typeof subscription.keys.auth !== 'string'
  ) {
    return res
      .status(400)
      .json({ error: 'subscription inválida: faltan endpoint o keys' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // Upsert por endpoint único (índice en supabase/schema.sql).
  // Si el mismo dispositivo se re-suscribe, actualizamos en vez de duplicar.
  const { data, error } = await supabase
    .from('suscripciones')
    .upsert(
      { subscription },
      { onConflict: 'subscription->>endpoint' }
    )
    .select()
    .single();

  if (error) {
    console.error('Supabase upsert error:', error);
    return res.status(500).json({ error: 'Error al guardar la suscripción' });
  }

  return res.status(201).json({ ok: true, suscripcion: data });
}
