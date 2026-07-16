// Devuelve la VAPID public key al frontend para que pueda suscribirse a push.
// No requiere auth: la public key es pública por diseño.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID_PUBLIC_KEY no configurada' });
  }

  // Cache corto para evitar fetches repetidos
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ publicKey });
}
