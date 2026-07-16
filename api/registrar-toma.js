import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import crypto from 'node:crypto';

const MAX_DOSIS_EN_24H = 2;
const MS_24H = 24 * 60 * 60 * 1000;

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

function configurarWebPush() {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    throw new Error('Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails(subject, pub, priv);
}

function formatearHora(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid'
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

  // 1. Comprobar límite de dosis en las últimas 24h
  const hace24h = new Date(Date.now() - MS_24H).toISOString();
  const { count: count24h, error: errCount } = await supabase
    .from('tomas')
    .select('id', { count: 'exact', head: true })
    .gte('fecha_hora', hace24h);

  if (errCount) {
    console.error('Error contando tomas 24h:', errCount);
    return res.status(500).json({ error: 'Error comprobando el límite diario' });
  }

  if ((count24h || 0) >= MAX_DOSIS_EN_24H) {
    return res.status(429).json({
      error: `Ya se han registrado ${MAX_DOSIS_EN_24H} pastillas en las últimas 24h. Si necesitas corregir, elimina alguna del historial.`,
      count24h,
      max: MAX_DOSIS_EN_24H
    });
  }

  // 2. Insertar la toma
  const { data, error } = await supabase
    .from('tomas')
    .insert({ metodo })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Error al guardar la toma en la base de datos' });
  }

  // 3. Notificar a la familia (best-effort, no bloquea la respuesta)
  notifyFamilia(data).catch((e) => {
    console.error('Error enviando push de nueva toma:', e);
  });

  return res.status(201).json({ ok: true, toma: data });
}

async function notifyFamilia(toma) {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
    configurarWebPush();
  } catch (e) {
    console.error('notifyFamilia config:', e.message);
    return;
  }

  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('id, subscription');

  if (!suscripciones || suscripciones.length === 0) return;

  const hora = formatearHora(toma.fecha_hora);
  const payload = JSON.stringify({
    title: 'Pastilla del perro',
    body: `Acaban de registrar una pastilla (${hora}).`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag: 'pastilla-registrada'
  });

  await Promise.allSettled(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('suscripciones').delete().eq('id', s.id);
        }
        console.error(`Push failed for sub ${s.id}:`, err.message);
      }
    })
  );
}
