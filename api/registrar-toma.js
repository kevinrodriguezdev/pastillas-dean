import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Valida la API key con comparación en tiempo constante para evitar timing attacks.
function checkApiKey(req) {
  const expected = process.env.API_SECRET_KEY;
  if (!expected || expected.length < 16) {
    return { ok: false, reason: 'API_SECRET_KEY no configurada en el servidor' };
  }
  const provided = req.headers['x-api-key'];
  if (!provided) return { ok: false, reason: 'Falta header x-api-key' };
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: 'API key inválida' };
  return crypto.timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: 'API key inválida' };
}

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

  const auth = checkApiKey(req);
  if (!auth.ok) {
    return res.status(401).json({ error: auth.reason });
  }

  const { metodo } = req.body || {};
  if (metodo !== 'manual' && metodo !== 'nfc') {
    return res.status(400).json({ error: 'metodo debe ser "manual" o "nfc"' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { data, error } = await supabase
    .from('tomas')
    .insert({ metodo })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Error al guardar la toma en la base de datos' });
  }

  return res.status(201).json({ ok: true, toma: data });
}
