// Genera iconos placeholder (PNG sólidos verde esmeralda con círculo blanco)
// para que la PWA tenga iconos válidos antes del primer build.
// Puedes sustituirlos por tus propios logos después.
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

// Tabla CRC32 (estándar PNG)
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

/**
 * Crea un PNG RGB.
 * @param {number} size - lado en píxeles
 * @param {[number, number, number]} fill - color de fondo
 * @param {[number, number, number]} center - color del círculo central
 * @param {number} ratio - radio del círculo respecto al lado (0-0.5)
 */
function makePng(size, fill, center, ratio = 0.36) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: adaptive
  ihdr[12] = 0; // interlace: none

  const cx = size / 2;
  const cy = size / 2;
  const r = size * ratio;
  const r2 = r * r;

  const rowSize = size * 3 + 1; // 1 byte de filtro + RGB
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inside = (dx * dx + dy * dy) <= r2;
      const color = inside ? center : fill;
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

const esmeralda = [16, 185, 129];
const blanco = [255, 255, 255];

// Iconos normales
writeFileSync(resolve(iconsDir, 'icon-192.png'), makePng(192, esmeralda, blanco));
writeFileSync(resolve(iconsDir, 'icon-512.png'), makePng(512, esmeralda, blanco));
// Apple touch icon (180x180)
writeFileSync(resolve(iconsDir, 'apple-touch-icon.png'), makePng(180, esmeralda, blanco));
// Maskable: necesita un "safe zone" central más pequeño (ratio 0.25) para que
// el círculo no se recorte al recortar el sistema.
writeFileSync(
  resolve(iconsDir, 'icon-maskable-512.png'),
  makePng(512, esmeralda, blanco, 0.25)
);

console.log(`✓ Iconos placeholder generados en ${iconsDir}`);
