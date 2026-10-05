/**
 * ============================================================================
 * Chaitanya 2k26 — Minimal QR Code generator (no dependencies)
 * ============================================================================
 * Byte mode, error-correction level M, versions 1–10 (up to 213 bytes),
 * which comfortably fits the ID-verification URLs used by the Digital ID.
 * Implements ISO/IEC 18004: Reed–Solomon ECC, block interleaving, function
 * patterns, format/version info and penalty-based mask selection.
 */

// Level M parameters for versions 1..10 (index 0 unused).
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const ALIGNMENT = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];
const ECL_M_FORMAT_BITS = 0; // M = 00

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree) {
  const result = new Array(degree - 1).fill(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)));
  }
  return result;
}

function dataCapacityBytes(version) {
  return TOTAL_CODEWORDS[version] - ECC_PER_BLOCK[version] * NUM_BLOCKS[version];
}

function encodeData(bytes) {
  for (let version = 1; version <= 10; version++) {
    const countBits = version < 10 ? 8 : 16;
    const capacityBits = dataCapacityBytes(version) * 8;
    const needed = 4 + countBits + bytes.length * 8;
    if (needed > capacityBits) continue;

    const bits = [];
    const push = (value, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    push(0b0100, 4);
    push(bytes.length, countBits);
    bytes.forEach((b) => push(b, 8));
    push(0, Math.min(4, capacityBits - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      codewords.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
    }
    return { version, codewords };
  }
  throw new Error("QR payload too long");
}

function addEccAndInterleave(version, data) {
  const numBlocks = NUM_BLOCKS[version];
  const blockEccLen = ECC_PER_BLOCK[version];
  const raw = TOTAL_CODEWORDS[version];
  const numShortBlocks = numBlocks - (raw % numBlocks);
  const shortBlockLen = Math.floor(raw / numBlocks);
  const divisor = rsDivisor(blockEccLen);

  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }

  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function buildMatrix(version, codewords, mask) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    isFn[y][x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Finder patterns + separators
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Alignment patterns
  const pos = ALIGNMENT[version];
  pos.forEach((ay, i) => {
    pos.forEach((ax, j) => {
      const corner = (i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0);
      if (corner) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    });
  });

  // Format information
  const fmtData = (ECL_M_FORMAT_BITS << 3) | mask;
  let rem = fmtData;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const fmt = ((fmtData << 10) | rem) ^ 0x5412;
  const fbit = (i) => ((fmt >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, fbit(i));
  set(8, 7, fbit(6));
  set(8, 8, fbit(7));
  set(7, 8, fbit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, fbit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fbit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, fbit(i));
  set(8, size - 8, true);

  // Version information (v7+)
  if (version >= 7) {
    let vrem = version;
    for (let i = 0; i < 12; i++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1f25);
    const vbits = (version << 12) | vrem;
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // Data (zig-zag)
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && bitIndex < totalBits) {
          modules[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }

  // Mask
  const maskFns = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFn[y][x] && maskFns[mask](x, y)) modules[y][x] = !modules[y][x];
    }
  }
  return modules;
}

// Simplified penalty (runs, 2x2 blocks, dark balance) for mask selection.
function penalty(m) {
  const size = m.length;
  let score = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = pass ? m[b][a] : m[a][b];
        const prev = pass ? m[b - 1][a] : m[a][b - 1];
        if (cur === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else run = 1;
      }
    }
  }
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y][x]) dark++;
      if (y < size - 1 && x < size - 1) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    }
  }
  const total = size * size;
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return score;
}

/**
 * Encode text and return the module matrix (true = dark).
 */
export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  const { version, codewords } = encodeData(bytes);
  const all = addEccAndInterleave(version, codewords);
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = buildMatrix(version, all, mask);
    const s = penalty(m);
    if (s < bestScore) {
      best = m;
      bestScore = s;
    }
  }
  return best;
}

/**
 * Render a QR code as an SVG string (with the standard 4-module quiet zone).
 */
export function qrSvg(text, { dark = "#000000", light = "#ffffff", label = "QR code" } = {}) {
  const m = qrMatrix(text);
  const quiet = 4;
  const dim = m.length + quiet * 2;
  let path = "";
  m.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
    })
  );
  const safeLabel = String(label).replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="${safeLabel}"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
