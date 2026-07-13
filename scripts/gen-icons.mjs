// Generate PWA PNG icons without any image library.
// Draws a Dobble-like mark: rounded blue tile, white disc, a few colored spots.
// Run: node scripts/gen-icons.mjs

import { deflateSync, crc32 as zlibCrc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// --- tiny RGBA raster -------------------------------------------------------
function raster(size) {
  const buf = new Uint8Array(size * size * 4);
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    // simple source-over blend
    const ia = a / 255;
    buf[i] = buf[i] * (1 - ia) + r * ia;
    buf[i + 1] = buf[i + 1] * (1 - ia) + g * ia;
    buf[i + 2] = buf[i + 2] * (1 - ia) + b * ia;
    buf[i + 3] = Math.max(buf[i + 3], a);
  };
  return { buf, size, set };
}

function roundRect(r, x0, y0, w, h, radius, colorTop, colorBot) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const col = [
      Math.round(colorTop[0] + (colorBot[0] - colorTop[0]) * t),
      Math.round(colorTop[1] + (colorBot[1] - colorTop[1]) * t),
      Math.round(colorTop[2] + (colorBot[2] - colorTop[2]) * t),
      255,
    ];
    for (let x = 0; x < w; x++) {
      // rounded-corner mask
      const dx = Math.min(x, w - 1 - x);
      const dy = Math.min(y, h - 1 - y);
      if (dx < radius && dy < radius) {
        const cx = radius,
          cy = radius;
        const px = dx,
          py = dy;
        if (Math.hypot(px - cx, py - cy) > radius) continue;
      }
      r.set(x0 + x, y0 + y, col);
    }
  }
}

function disc(r, cx, cy, rad, color) {
  const r0 = Math.ceil(rad);
  for (let y = -r0; y <= r0; y++)
    for (let x = -r0; x <= r0; x++) {
      const d = Math.hypot(x, y);
      if (d <= rad) {
        // antialias the edge
        const a = d > rad - 1.2 ? Math.max(0, rad - d) / 1.2 : 1;
        r.set(Math.round(cx + x), Math.round(cy + y), [color[0], color[1], color[2], Math.round(255 * a)]);
      }
    }
}

const SPOTS = [
  [0.0, -0.42, [242, 100, 122]],
  [0.4, 0.08, [123, 216, 143]],
  [-0.42, 0.02, [247, 185, 85]],
  [0.18, 0.44, [149, 130, 246]],
  [-0.2, 0.42, [91, 141, 239]],
  [0.02, 0.02, [50, 60, 90]],
];

function drawIcon(size, { maskable = false } = {}) {
  const r = raster(size);
  const pad = maskable ? Math.round(size * 0.12) : 0;
  const tile = size - pad * 2;
  const radius = maskable ? Math.round(tile * 0.16) : Math.round(size * 0.22);
  roundRect(r, pad, pad, tile, tile, radius, [106, 151, 242], [72, 108, 216]);

  const cx = size / 2;
  const cy = size / 2;
  const discR = tile * 0.36;
  disc(r, cx, cy, discR, [255, 255, 255]);

  for (const [fx, fy, col] of SPOTS) {
    disc(r, cx + fx * discR, cy + fy * discR, discR * 0.22, col);
  }
  return r;
}

// --- PNG encoding -----------------------------------------------------------
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function crc32(buf) {
  return zlibCrc32(buf) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(r) {
  const { size, buf } = r;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // rows with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(buf.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size, opts) {
  const png = encodePNG(drawIcon(size, opts));
  writeFileSync(new URL(name, OUT), png);
  console.log(`wrote public/${name} (${png.length} bytes)`);
}

write('icon-192.png', 192);
write('icon-512.png', 512);
write('icon-512-maskable.png', 512, { maskable: true });
write('apple-touch-icon.png', 180);

// crisp SVG favicon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6a97f2"/><stop offset="1" stop-color="#486cd8"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <circle cx="32" cy="32" r="21" fill="#fff"/>
  <circle cx="32" cy="15.5" r="4.4" fill="#f2647a"/>
  <circle cx="46" cy="34" r="4.4" fill="#7bd88f"/>
  <circle cx="18" cy="33" r="4.4" fill="#f7b955"/>
  <circle cx="38" cy="47" r="4.4" fill="#9582f6"/>
  <circle cx="25" cy="46" r="4.4" fill="#5b8def"/>
  <circle cx="32" cy="32" r="3.4" fill="#323c5a"/>
</svg>
`;
writeFileSync(new URL('favicon.svg', OUT), svg);
console.log('wrote public/favicon.svg');
