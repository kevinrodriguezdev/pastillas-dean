// Genera iconos placeholder (marrón cálido con huella blanca) para la PWA
// "Pastillas para Dean". Puedes sustituirlos por tus propios logos después.
//
// Uso: node scripts/generate-placeholder-icons.mjs
//
// No requiere dependencias externas: usa zlib nativo de Node.

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Devuelve true si el punto (x,y) cae dentro de la huella de Dean
// (4 dedos + almohadilla central), escalada al size con un factor.
// Se trabaja en coordenadas centradas en (cx, cy).
function insidePaw(x, y, cx, cy, s) {
  // Almohadilla central: elipse más abajo del centro
  const padCx = cx;
  const padCy = cy + s * 0.18;
  const padRx = s * 0.22;
  const padRy = s * 0.18;
  const ddx = (x - padCx) / padRx;
  const ddy = (y - padCy) / padRy;
  if (ddx * ddx + ddy * ddy <= 1) return true;

  // 4 dedos
  const dedos = [
    { x: cx - s * 0.26, y: cy - s * 0.16, rx: s * 0.10, ry: s * 0.13 },
    { x: cx - s * 0.09, y: cy - s * 0.30, rx: s * 0.09, ry: s * 0.12 },
    { x: cx + s * 0.09, y: cy - s * 0.30, rx: s * 0.09, ry: s * 0.12 },
    { x: cx + s * 0.26, y: cy - s * 0.16, rx: s * 0.10, ry: s * 0.13 }
  ];
  for (const d of dedos) {
    const ex = (x - d.x) / d.rx;
    const ey = (y - d.y) / d.ry;
    if (ex * ex + ey * ey <= 1) return true;
  }
  return false;
}

/**
 * Crea un PNG RGB con huella blanca sobre fondo marrón.
 * @param {number} size - lado en píxeles
 * @param {[number, number, number]} fill - color de fondo
 * @param {[number, number, number]} mark - color de la huella
 * @param {number} pawScale - escala de la huella (0-0.5) respecto al lado
 */
function makePng(size, fill, mark, pawScale = 0.42) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const cx = size / 2;
  const cy = size / 2;
  const s = size * pawScale;

  const rowSize = size * 3 + 1;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      const color = insidePaw(x, y, cx, cy, s) ? mark : fill;
      const i = y * rowSize + 1 + x * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const marron = [160, 106, 30];
const crema = [251, 246, 237];

// Iconos normales
writeFileSync(resolve(iconsDir, 'icon-192.png'), makePng(192, marron, crema));
writeFileSync(resolve(iconsDir, 'icon-512.png'), makePng(512, marron, crema));
// Apple touch icon (180x180)
writeFileSync(resolve(iconsDir, 'apple-touch-icon.png'), makePng(180, marron, crema));
// Maskable: huella más pequeña (ratio 0.32) para que no se recorte al hacer
// el recorte circular/squircle del sistema operativo.
writeFileSync(
  resolve(iconsDir, 'icon-maskable-512.png'),
  makePng(512, marron, crema, 0.32)
);

console.log(`✓ Iconos de Dean generados en ${iconsDir}`);
