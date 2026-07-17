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

// Devuelve el nivel de stock:
//   > 6  -> 'normal'   (más de 3 días)
//   5-6  -> 'bajo'     (2-3 días)
//   <= 4 -> 'critico'  (menos de 2 días)
function calcularNivel(cantidad) {
  if (cantidad > 6) return 'normal';
  if (cantidad <= 4) return 'critico';
  return 'bajo';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await getStock(req, res);
  }
  if (req.method === 'POST') {
    return await reponerStock(req, res);
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getStock(req, res) {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { data: rows, error } = await supabase
    .from('stock')
    .select('cantidad, ultimo_aviso_nivel, actualizado_en')
    .order('actualizado_en', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error leyendo stock:', error);
    return res.status(500).json({ error: 'Error leyendo stock' });
  }

  const stock = rows && rows[0];
  if (!stock) {
    return res.status(200).json({ cantidad: 0, nivel: 'normal', actualizadoEn: null });
  }

  return res.status(200).json({
    cantidad: stock.cantidad,
    nivel: calcularNivel(stock.cantidad),
    actualizadoEn: stock.actualizado_en
  });
}

async function reponerStock(req, res) {
  const { cantidad } = req.body || {};
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return res.status(400).json({ error: 'cantidad debe ser un entero >= 1' });
  }
  if (cantidad > 9999) {
    return res.status(400).json({ error: 'cantidad demasiado grande' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // Leer fila actual
  const { data: rows, error: readError } = await supabase
    .from('stock')
    .select('id, cantidad, ultimo_aviso_nivel')
    .order('actualizado_en', { ascending: false })
    .limit(1);

  if (readError) {
    console.error('Error leyendo stock:', readError);
    return res.status(500).json({ error: 'Error leyendo stock' });
  }

  let stockId;
  let cantidadAnterior;
  if (!rows || rows.length === 0) {
    // No hay fila, crear una
    const { data: inserted, error: insertError } = await supabase
      .from('stock')
      .insert({ cantidad: 0 })
      .select('id, cantidad')
      .single();
    if (insertError) {
      console.error('Error inicializando stock:', insertError);
      return res.status(500).json({ error: 'Error inicializando stock' });
    }
    stockId = inserted.id;
    cantidadAnterior = 0;
  } else {
    stockId = rows[0].id;
    cantidadAnterior = rows[0].cantidad;
  }

  const nuevaCantidad = cantidadAnterior + cantidad;
  const nuevoNivel = calcularNivel(nuevaCantidad);
  // Si volvemos a 'normal' (cantidad > 6), reseteamos el aviso para que
  // la próxima vez que baje vuelva a notificar.
  const nuevoAvisoNivel = nuevoNivel === 'normal' ? null : nuevoNivel;
  const ahora = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('stock')
    .update({
      cantidad: nuevaCantidad,
      actualizado_en: ahora,
      ultimo_aviso_nivel: nuevoAvisoNivel,
      ultimo_aviso_en: nuevoAvisoNivel ? ahora : null
    })
    .eq('id', stockId);

  if (updateError) {
    console.error('Error actualizando stock:', updateError);
    return res.status(500).json({ error: 'Error actualizando stock' });
  }

  return res.status(200).json({
    ok: true,
    cantidad: nuevaCantidad,
    nivel: nuevoNivel,
    anadidas: cantidad
  });
}
