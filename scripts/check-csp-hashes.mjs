// Fails if any executable inline <script> in index.html lacks its sha256 hash in a CSP.
// Run: node scripts/check-csp-hashes.mjs   (after ANY edit to an inline script in index.html)
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("..", import.meta.url);
const read = (f) => readFileSync(new URL(f, root), "utf8");
const DATA_TYPES = /^application\/(ld\+)?json$/i; // non-executing blocks need no hash

const hashes = [];
for (const [, attrs, body] of read("index.html").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/i.test(attrs)) continue;
  const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || "";
  if (DATA_TYPES.test(type)) continue;
  hashes.push(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
}

const csps = {
  "firebase.json": JSON.parse(read("firebase.json")).hosting.headers
    .flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value,
  "netlify.toml": read("netlify.toml").match(/Content-Security-Policy\s*=\s*"([^"]*)"/)?.[1],
  "vercel.json": JSON.parse(read("vercel.json")).headers
    .flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value,
};

let failed = false;
for (const [file, csp] of Object.entries(csps)) {
  const scriptSrc = csp?.match(/script-src([^;]*)/)?.[1] || "";
  const missing = hashes.filter((h) => !scriptSrc.includes(h));
  if (!csp) { console.error(`FAIL ${file}: no Content-Security-Policy found`); failed = true; continue; }
  if (/'unsafe-inline'/.test(scriptSrc)) { console.error(`FAIL ${file}: script-src still has 'unsafe-inline'`); failed = true; }
  if (missing.length) {
    console.error(`FAIL ${file}: script-src is missing ${missing.length} hash(es):\n  ${missing.join("\n  ")}`);
    failed = true;
  }
}
if (failed) {
  console.error(`\nCurrent hashes for script-src:\n${hashes.join(" ")}`);
  process.exit(1);
}
console.log(`OK: ${hashes.length} inline script hashes present in firebase.json, netlify.toml, vercel.json`);
