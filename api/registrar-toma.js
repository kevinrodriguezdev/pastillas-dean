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

  // 3. Decrementar stock y comprobar si hay que avisar (umbral 3/2 días).
  //    Best-effort: si falla, no bloqueamos el registro de la toma.
  const stockInfo = await decrementarStock(supabase);

  // 4. Notificar a la familia. Importante: hay que hacer AWAIT, no fire-and-forget.
  // Vercel Functions congelan el contexto de ejecución en cuanto se envía la
  // respuesta al cliente, por lo que una promesa suelta nunca llegaría a llamar
  // a web-push y el push a iOS/Android se perdería.
  try {
    const resultado = await notifyFamilia(data);
    if (resultado) {
      console.log(
        `[push] nueva toma ${data.id}: enviadas=${resultado.enviadas} ` +
        `fallidas=${resultado.fallidas} total=${resultado.total}`
      );
    } else {
      console.log(`[push] nueva toma ${data.id}: sin suscriptores`);
    }
  } catch (e) {
    console.error('Error enviando push de nueva toma:', e);
  }

  // 5. Si el stock cruzó un umbral nuevo, avisar (también best-effort).
  if (stockInfo && stockInfo.nivelCambio && stockInfo.nuevoNivel) {
    try {
      const resultado = await notifyStockBajo(
        stockInfo.nuevaCantidad,
        stockInfo.nuevoNivel
      );
      if (resultado) {
        console.log(
          `[push] stock ${stockInfo.nuevoNivel} (${stockInfo.nuevaCantidad} uds): ` +
          `enviadas=${resultado.enviadas} fallidas=${resultado.fallidas} ` +
          `total=${resultado.total}`
        );
      }
    } catch (e) {
      console.error('Error enviando push de stock bajo:', e);
    }
  }

  return res.status(201).json({
    ok: true,
    toma: data,
    stock: stockInfo
      ? { cantidad: stockInfo.nuevaCantidad, nivel: stockInfo.nuevoNivel }
      : null
  });
}

// Decrementa el stock en 1 (sin bajar de 0) y devuelve el nuevo estado.
// Devuelve null si no hay fila de stock configurada.
async function decrementarStock(supabase) {
  try {
    const { data: rows, error: readError } = await supabase
      .from('stock')
      .select('id, cantidad, ultimo_aviso_nivel')
      .order('actualizado_en', { ascending: false })
      .limit(1);

    if (readError) {
      console.error('Error leyendo stock:', readError);
      return null;
    }
    if (!rows || rows.length === 0) return null;

    const stock = rows[0];
    const nuevaCantidad = Math.max(0, stock.cantidad - 1);
    let nuevoNivel;
    if (nuevaCantidad > 6) nuevoNivel = null;
    else if (nuevaCantidad <= 4) nuevoNivel = 'critico';
    else nuevoNivel = 'bajo';

    const nivelCambio = nuevoNivel !== stock.ultimo_aviso_nivel;
    const ahora = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('stock')
      .update({
        cantidad: nuevaCantidad,
        actualizado_en: ahora,
        ultimo_aviso_nivel: nuevoNivel,
        ultimo_aviso_en: nivelCambio && nuevoNivel ? ahora : undefined
      })
      .eq('id', stock.id);

    if (updateError) {
      console.error('Error actualizando stock:', updateError);
      return null;
    }

    return { nuevaCantidad, nuevoNivel, nivelCambio };
  } catch (e) {
    console.error('decrementarStock:', e);
    return null;
  }
}

async function notifyFamilia(toma) {
  const hora = formatearHora(toma.fecha_hora);
  return await enviarPushATodos({
    title: 'Pastilla para Dean',
    body: `Acaban de registrar una pastilla (${hora}).`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag: 'pastilla-registrada'
  });
}

async function notifyStockBajo(cantidad, nivel) {
  const dias = Math.max(0, Math.floor(cantidad / 2));
  let title;
  let body;
  let tag;
  if (nivel === 'critico') {
    title = '🚨 Pastillas para Dean';
    body = cantidad === 0
      ? 'Dean se ha quedado sin pastillas. Compra ya.'
      : `Quedan solo ${cantidad} pastillas (${dias} ${dias === 1 ? 'día' : 'días'}). ¡Compra ya!`;
    tag = 'stock-critico';
  } else {
    title = '⚠️ Pastillas para Dean';
    body = `Quedan ${cantidad} pastillas (${dias} ${dias === 1 ? 'día' : 'días'}). Ve pensando en reponer.`;
    tag = 'stock-bajo';
  }
  return await enviarPushATodos({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag
  });
}

async function enviarPushATodos(payload) {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
    configurarWebPush();
  } catch (e) {
    console.error('enviarPushATodos config:', e.message);
    return;
  }

  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('id, subscription');

  if (!suscripciones || suscripciones.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  const resultados = await Promise.allSettled(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payloadStr);
        return { id: s.id, ok: true };
      } catch (err) {
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

  return { enviadas: okCount, fallidas, total: resultados.length };
}
