import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = checkApiKey(req);
  if (!auth.ok) {
    return res.status(401).json({ error: auth.reason });
  }

  const { id } = req.body || {};
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Falta el id de la toma a eliminar' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { error } = await supabase
    .from('tomas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return res.status(500).json({ error: 'Error al eliminar la toma' });
  }

  return res.status(200).json({ ok: true, id });
}
