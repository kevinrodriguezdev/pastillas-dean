import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const INTERVALO_OBJETIVO_HORAS = 12;
const ANTI_SPAM_HORAS = 6;
const MS_POR_HORA = 60 * 60 * 1000;

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Trigger manual protegido (útil para pruebas desde el navegador).
  // Vercel Cron llama sin ?key= porque el path es secreto.
  const triggerKey = req.query?.key;
  if (triggerKey) {
    const expected = process.env.API_SECRET_KEY;
    if (!expected || triggerKey !== expected) {
      return res.status(401).json({ error: 'API key inválida' });
    }
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
    configurarWebPush();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // 1. Última toma
  const { data: ultimaToma, error: errToma } = await supabase
    .from('tomas')
    .select('id, fecha_hora')
    .order('fecha_hora', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errToma) {
    console.error('Error leyendo última toma:', errToma);
    return res.status(500).json({ error: 'Error leyendo última toma' });
  }

  if (!ultimaToma) {
    return res.status(200).json({ ok: true, accion: 'sin-tomas-aun' });
  }

  const horasPasadas =
    (Date.now() - new Date(ultimaToma.fecha_hora).getTime()) / MS_POR_HORA;

  if (horasPasadas < INTERVALO_OBJETIVO_HORAS) {
    return res.status(200).json({
      ok: true,
      accion: 'aun-a-tiempo',
      horasPasadas: Math.round(horasPasadas * 10) / 10
    });
  }

  // 2. Ventana anti-spam: no notificar si la última fue hace < ANTI_SPAM_HORAS
  const { data: ultimaNotif, error: errNotif } = await supabase
    .from('notificaciones_enviadas')
    .select('enviado_en')
    .order('enviado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errNotif) {
    console.error('Error leyendo notificaciones:', errNotif);
    return res.status(500).json({ error: 'Error leyendo notificaciones' });
  }

  if (ultimaNotif) {
    const horasDesdeNotif =
      (Date.now() - new Date(ultimaNotif.enviado_en).getTime()) / MS_POR_HORA;
    if (horasDesdeNotif < ANTI_SPAM_HORAS) {
      return res.status(200).json({
        ok: true,
        accion: 'anti-spam',
        horasDesdeNotif: Math.round(horasDesdeNotif * 10) / 10
      });
    }
  }

  // 3. Recuperar suscripciones
  const { data: suscripciones, error: errSubs } = await supabase
    .from('suscripciones')
    .select('id, subscription');

  if (errSubs) {
    console.error('Error leyendo suscripciones:', errSubs);
    return res.status(500).json({ error: 'Error leyendo suscripciones' });
  }

  // Insertar registro de notificación igualmente (para que la próxima
  // ejecución respete la ventana anti-spam)
  const { error: errInsert } = await supabase
    .from('notificaciones_enviadas')
    .insert({});
  if (errInsert) {
    console.error('Error insertando notificacion:', errInsert);
  }

  if (!suscripciones || suscripciones.length === 0) {
    return res.status(200).json({ ok: true, accion: 'sin-suscriptores' });
  }

  const payload = JSON.stringify({
    title: 'Pastillas del perro',
    body: 'Toca dar la pastilla al perro, han pasado más de 12h.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/'
  });

  const resultados = await Promise.allSettled(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payload);
        return { id: s.id, ok: true };
      } catch (err) {
        // 404/410: suscripción caducada → eliminar
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('suscripciones').delete().eq('id', s.id);
        }
        return { id: s.id, ok: false, error: err.message, statusCode: err.statusCode };
      }
    })
  );

  const okCount = resultados.filter(
    (r) => r.status === 'fulfilled' && r.value.ok
  ).length;
  const fallidas = resultados.length - okCount;

  return res.status(200).json({
    ok: true,
    accion: 'notificaciones-enviadas',
    horasPasadas: Math.round(horasPasadas * 10) / 10,
    enviadas: okCount,
    fallidas,
    total: resultados.length
  });
}
