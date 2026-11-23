const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePng(width, height, drawFn) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Point-in-polygon test for stylized lightning bolt
// Normalized coords from 0 to 1
const boltPolygon = [
  [0.55, 0.15],
  [0.32, 0.48],
  [0.48, 0.48],
  [0.40, 0.85],
  [0.68, 0.44],
  [0.52, 0.44],
  [0.62, 0.15],
];

function isInsidePolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance to polygon center for glow
function getBoltDistance(px, py) {
  // Approximate distance to the bolt center axis (0.5, 0.5)
  const dx = px - 0.5;
  const dy = py - 0.5;
  return Math.sqrt(dx * dx + dy * dy);
}

function createIconDrawer(isMaskable = false) {
  return function(x, y, w, h) {
    const nx = x / w;
    const ny = y / h;

    // Background: Deep Carbon #0b0e0b
    let bgR = 11;
    let bgG = 14;
    let bgB = 11;

    // Ambient radial glow from center
    const distFromCenter = Math.hypot(nx - 0.5, ny - 0.5);
    const ambientGlow = Math.max(0, 1 - distFromCenter * 2.2);
    bgR = Math.min(255, Math.round(bgR + ambientGlow * 16));
    bgG = Math.min(255, Math.round(bgG + ambientGlow * 45));
    bgB = Math.min(255, Math.round(bgB + ambientGlow * 25));

    // Outer badge squircle (only if not maskable, or centered if maskable)
    const padding = isMaskable ? 0.08 : 0.06;
    const cornerRadius = 0.22;

    // Inside squircle check
    const qx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - padding - cornerRadius));
    const qy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - padding - cornerRadius));
    const isInsideSquircle = Math.hypot(qx, qy) <= cornerRadius;

    // Border of squircle
    const borderDist = Math.abs(Math.hypot(qx, qy) - cornerRadius);
    const isBorder = borderDist < 0.015 && isInsideSquircle;

    // Inner badge gradient
    if (isInsideSquircle) {
      // Subtly lighter dark surface inside badge (#131913)
      bgR = 16;
      bgG = 22;
      bgB = 17;

      if (isBorder) {
        // Emerald border highlight
        bgR = 30;
        bgG = 80;
        bgB = 45;
      }
    }

    // Lightning bolt scaling
    const boltScale = isMaskable ? 0.8 : 0.95;
    const bx = (nx - 0.5) / boltScale + 0.5;
    const by = (ny - 0.5) / boltScale + 0.5;

    // Neon drop glow around bolt
    const distToCenter = getBoltDistance(bx, by);
    if (distToCenter < 0.35) {
      const glow = Math.pow(Math.max(0, 1 - distToCenter / 0.35), 2) * 0.45;
      bgR = Math.min(255, Math.round(bgR * (1 - glow) + 16 * glow));
      bgG = Math.min(255, Math.round(bgG * (1 - glow) + 185 * glow));
      bgB = Math.min(255, Math.round(bgB * (1 - glow) + 129 * glow));
    }

    // Inside lightning bolt check
    if (bx >= 0.2 && bx <= 0.8 && by >= 0.1 && by <= 0.9) {
      if (isInsidePolygon(bx, by, boltPolygon)) {
        // Electric Emerald / Lime Gradient from top (#c5f600) to bottom (#10b981)
        const t = (by - 0.15) / 0.7; // 0 at top, 1 at bottom
        // Top: #c5f600 (197, 246, 0), Bottom: #10b981 (16, 185, 129)
        const boltR = Math.round(197 * (1 - t) + 16 * t);
        const boltG = Math.round(246 * (1 - t) + 185 * t);
        const boltB = Math.round(0 * (1 - t) + 129 * t);
        return [boltR, boltG, boltB, 255];
      }
    }

    return [bgR, bgG, bgB, 255];
  };
}

const publicDir = path.resolve(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');

const icons = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-192x192.png', size: 192, maskable: false },
];

for (const icon of icons) {
  const filePath = path.join(publicDir, icon.name);
  const buf = generatePng(icon.size, icon.size, createIconDrawer(icon.maskable));
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${icon.name} (${icon.size}x${icon.size}) - ${buf.length} bytes`);
}

console.log('All PWA icons generated successfully!');
