/* Generates the PWA PNG icons from the brand mark, so they can be regenerated
   if the brand colour changes instead of being opaque binaries in git.

   Hand-rolled PNG encoder (zlib is in Node core) — no image dependency for
   three flat-colour icons. Run: node scripts/generate-icons.cjs
*/
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BRAND = [0x2b, 0x5c, 0xfa];
const WHITE = [0xff, 0xff, 0xff];

/* --- PNG encoding ------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** rgba: Uint8Array of size*size*4 */
const encodePNG = (size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10-12: compression, filter, interlace = 0

  /* One filter byte (0 = None) per scanline. */
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy
      ? rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4)
      : Buffer.from(rgba.subarray(y * size * 4, (y + 1) * size * 4)).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/* --- Drawing ------------------------------------------------------------ */

/* 4x supersampling keeps the rounded corners and the W's diagonals smooth. */
const SS = 4;

const insideRoundedRect = (x, y, size, radius) => {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const rx = Math.min(Math.max(x, radius), size - radius);
  const ry = Math.min(Math.max(y, radius), size - radius);
  const dx = x - rx;
  const dy = y - ry;
  return dx * dx + dy * dy <= radius * radius;
};

/** Point-in-polygon (even-odd rule). */
const insidePolygon = (x, y, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/* The "W" as a single outline, in a 0..1 box; drawn as a thick zigzag. */
const wPolygon = (box) => {
  const { x, y, w, h } = box;
  const t = w * 0.17; // stroke thickness
  const P = (fx, fy) => [x + fx * w, y + fy * h];
  return [
    P(0, 0),
    P(t / w, 0),
    P(0.285, 0.74),
    P(0.5 - t / w / 2, 0.28),
    P(0.5 + t / w / 2, 0.28),
    P(0.715, 0.74),
    P(1 - t / w, 0),
    P(1, 0),
    P(0.75, 1),
    P(0.66, 1),
    P(0.5, 0.55),
    P(0.34, 1),
    P(0.25, 1),
  ];
};

const renderIcon = (size, { maskable }) => {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  /* Maskable icons get a safe zone: the mark must sit inside the middle 80%. */
  const markScale = maskable ? 0.44 : 0.58;
  const mw = size * markScale;
  const mh = size * markScale * 0.86;
  const box = { x: (size - mw) / 2, y: (size - mh) / 2, w: mw, h: mh };
  const poly = wPolygon(box);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const inBg = maskable ? true : insideRoundedRect(x, y, size, radius);
          if (inBg) bg++;
          if (inBg && insidePolygon(x, y, poly)) fg++;
        }
      }
      const total = SS * SS;
      const bgA = bg / total;
      const fgA = fg / total;
      const i = (py * size + px) * 4;
      /* Composite white mark over the brand square, then over transparency. */
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(
          bgA > 0 ? (BRAND[c] * (bgA - fgA) + WHITE[c] * fgA) / bgA : 0,
        );
      }
      rgba[i + 3] = Math.round(bgA * 255);
    }
  }
  return encodePNG(size, rgba);
};

/* --- Output ------------------------------------------------------------- */

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }], // iOS crops corners itself
];

for (const [name, size, opts] of targets) {
  const png = renderIcon(size, opts);
  fs.writeFileSync(path.join(outDir, name), png);
  console.log(`${name}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
