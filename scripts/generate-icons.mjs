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

function sdfCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdfEllipse(px, py, cx, cy, rx, ry) {
  return Math.hypot((px - cx) / rx, (py - cy) / ry) - 1;
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

function generateGhostIcon() {
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
      const nx = (px - SIZE * 0.34) / (SIZE * 0.7);
      const ny = (py - SIZE * 0.26) / (SIZE * 0.7);
      const highlight = clamp(1 - Math.hypot(nx, ny));

      const red = lerp(12, 24, verticalMix) + highlight * 13;
      const green = lerp(17, 16, verticalMix) + highlight * 10;
      const blue = lerp(44, 89, verticalMix) + highlight * 24;

      blendPixel(x, y, red, green, blue, 255 * boxMask);

      const edgeMask = 1 - smoothstep(0, 4, Math.abs(boxDistance));
      if (edgeMask > 0) {
        blendPixel(x, y, 102, 92, 255, 100 * edgeMask);
      }
    }
  }

  const head = { cx, cy: 390, r: 190 };
  const torso = { cx, cy: 560, hw: 188, hh: 165, r: 92 };
  const feet = [
    { cx: 382, cy: 736, r: 82 },
    { cx: 512, cy: 748, r: 86 },
    { cx: 642, cy: 736, r: 82 },
  ];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      let ghostDistance = sdfCircle(px, py, head.cx, head.cy, head.r);
      ghostDistance = Math.min(ghostDistance, sdfRoundedRect(px, py, torso.cx, torso.cy, torso.hw, torso.hh, torso.r));
      for (const foot of feet) {
        ghostDistance = Math.min(ghostDistance, sdfCircle(px, py, foot.cx, foot.cy, foot.r));
      }

      const ghostMask = 1 - smoothstep(0, 1.8, ghostDistance);
      if (ghostMask > 0) {
        const tone = clamp((py - 250) / 560);
        const baseR = lerp(245, 225, tone);
        const baseG = lerp(249, 234, tone);
        const baseB = lerp(255, 251, tone);
        blendPixel(x, y, baseR, baseG, baseB, 255 * ghostMask);
      }

      const edgeMask = 1 - smoothstep(0, 3.2, Math.abs(ghostDistance));
      if (edgeMask > 0) {
        blendPixel(x, y, 124, 139, 255, 130 * edgeMask);
      }

      if (ghostDistance > 0) {
        const glowMask = 1 - smoothstep(0, 36, ghostDistance);
        if (glowMask > 0) {
          blendPixel(x, y, 116, 130, 255, 34 * glowMask);
        }
      }

      const eyeLeft = 1 - smoothstep(0, 1.4, sdfCircle(px, py, 450, 435, 31));
      const eyeRight = 1 - smoothstep(0, 1.4, sdfCircle(px, py, 574, 435, 31));
      if (eyeLeft > 0) blendPixel(x, y, 24, 33, 64, 245 * eyeLeft);
      if (eyeRight > 0) blendPixel(x, y, 24, 33, 64, 245 * eyeRight);

      const mouthOuter = 1 - smoothstep(0, 0.045, sdfEllipse(px, py, 512, 548, 72, 96));
      const mouthInner = 1 - smoothstep(0, 0.05, sdfEllipse(px, py, 512, 534, 48, 68));
      const mouthMask = clamp(mouthOuter - mouthInner, 0, 1);
      if (mouthMask > 0) {
        blendPixel(x, y, 34, 44, 82, 220 * mouthMask);
      }
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

generateGhostIcon();
writePng(OUTPUT_PNG);

console.log(`Generated ${OUTPUT_PNG}`);
