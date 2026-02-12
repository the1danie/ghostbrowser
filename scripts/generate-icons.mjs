import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SIZE = 1024;
const OUTPUT_DIR = path.resolve('build');
const OUTPUT_PNG = path.join(OUTPUT_DIR, 'icon.png');

const pixels = Buffer.alloc(SIZE * SIZE * 4, 0);

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function sdfRoundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const x = Math.abs(px - cx) - halfW + radius;
  const y = Math.abs(py - cy) - halfH + radius;
  const ox = Math.max(x, 0);
  const oy = Math.max(y, 0);
  const outside = Math.hypot(ox, oy);
  const inside = Math.min(Math.max(x, y), 0);
  return outside + inside - radius;
}

function sdfSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lengthSq = vx * vx + vy * vy;
  const t = lengthSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lengthSq);
  const nx = ax + vx * t;
  const ny = ay + vy * t;
  return Math.hypot(px - nx, py - ny);
}

function blendPixel(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return;

  const idx = (y * SIZE + x) * 4;
  const srcA = clamp(a / 255);
  const dstA = pixels[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;

  const outR = (r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA;
  const outG = (g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA;
  const outB = (b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA;

  pixels[idx] = Math.round(clamp(outR, 0, 255));
  pixels[idx + 1] = Math.round(clamp(outG, 0, 255));
  pixels[idx + 2] = Math.round(clamp(outB, 0, 255));
  pixels[idx + 3] = Math.round(clamp(outA * 255, 0, 255));
}

function strokeMask(distance, radius, feather = 1.4) {
  return 1 - smoothstep(0, feather, distance - radius);
}

function generateNebulaIcon() {
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const boxDistance = sdfRoundedRect(px, py, cx, cy, 436, 436, 210);
      const boxMask = 1 - smoothstep(0, 1.6, boxDistance);
      if (boxMask <= 0) continue;

      const verticalMix = y / (SIZE - 1);
      const nx = (px - SIZE * 0.35) / (SIZE * 0.7);
      const ny = (py - SIZE * 0.28) / (SIZE * 0.7);
      const highlight = clamp(1 - Math.hypot(nx, ny));

      const red = lerp(12, 25, verticalMix) + highlight * 14;
      const green = lerp(16, 14, verticalMix) + highlight * 10;
      const blue = lerp(39, 82, verticalMix) + highlight * 22;

      blendPixel(x, y, red, green, blue, 255 * boxMask);

      const edgeMask = 1 - smoothstep(0, 4, Math.abs(boxDistance));
      if (edgeMask > 0) {
        blendPixel(x, y, 95, 84, 255, 95 * edgeMask);
      }
    }
  }

  const leftX = 355;
  const leftTop = 330;
  const leftBottom = 700;
  const rightX = 670;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const distanceFromCenter = Math.hypot(px - cx, py - cy);

      const orbitMask = strokeMask(Math.abs(distanceFromCenter - 292), 15, 1.7);
      if (orbitMask > 0) {
        blendPixel(x, y, 93, 109, 255, 185 * orbitMask);
      }

      const glowMask = strokeMask(Math.abs(distanceFromCenter - 292), 28, 1.8);
      if (glowMask > 0) {
        blendPixel(x, y, 86, 101, 250, 55 * glowMask);
      }

      const coreMask = strokeMask(distanceFromCenter, 18, 1.8);
      if (coreMask > 0) {
        blendPixel(x, y, 125, 211, 252, 245 * coreMask);
      }

      const leftDistance = sdfSegment(px, py, leftX, leftBottom, leftX, leftTop);
      const diagonalDistance = sdfSegment(px, py, leftX, leftTop, rightX, leftBottom);
      const rightDistance = sdfSegment(px, py, rightX, leftBottom, rightX, leftTop);

      const leftGlow = strokeMask(leftDistance, 60, 1.6);
      if (leftGlow > 0) blendPixel(x, y, 229, 231, 235, 36 * leftGlow);
      const leftCore = strokeMask(leftDistance, 44, 1.6);
      if (leftCore > 0) blendPixel(x, y, 229, 231, 235, 255 * leftCore);

      const diagonalGlow = strokeMask(diagonalDistance, 60, 1.6);
      if (diagonalGlow > 0) blendPixel(x, y, 125, 211, 252, 44 * diagonalGlow);
      const diagonalCore = strokeMask(diagonalDistance, 44, 1.6);
      if (diagonalCore > 0) blendPixel(x, y, 125, 211, 252, 255 * diagonalCore);

      const rightGlow = strokeMask(rightDistance, 60, 1.6);
      if (rightGlow > 0) blendPixel(x, y, 229, 231, 235, 36 * rightGlow);
      const rightCore = strokeMask(rightDistance, 44, 1.6);
      if (rightCore > 0) blendPixel(x, y, 229, 231, 235, 255 * rightCore);
    }
  }
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function writePng(filePath) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const pngBuffer = Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, pngBuffer);
}

generateNebulaIcon();
writePng(OUTPUT_PNG);

console.log(`Generated ${OUTPUT_PNG}`);
