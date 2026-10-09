// Cloudflare Pages build: copies only the public site into dist/ and writes
// dist/_headers from firebase.json, so both hosts send the same security
// headers (CSP etc.). Cloudflare Pages settings:
//   Build command:          node scripts/build-pages.mjs
//   Build output directory: dist
// Run locally the same way to check what gets published.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "dist");

// Public files only (everything else in the repo stays private).
const PUBLIC = ["index.html", "_nuxt", "images", "models", "hdri", "textures", "fonts", "fav.png", "OpenGraph.jpg", "robots.txt", "sitemap.xml", "rulebooks"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const p of PUBLIC) {
  const src = join(root, p);
  if (!existsSync(src)) continue;
  cpSync(src, join(out, p), { recursive: true, filter: (f) => !/(^|\/)\.[^/]+$/.test(f) && !f.endsWith(".py") });
}

// _headers: global security headers + the cache rules from firebase.json.
const fb = JSON.parse(readFileSync(join(root, "firebase.json"), "utf8")).hosting.headers;
const global = fb.find((h) => h.source === "**").headers;
const cacheOf = (re) => fb.find((h) => h.source && re.test(h.source))?.headers.find((x) => x.key === "Cache-Control")?.value;
const block = (path, headers) => `${path}\n${headers.map(([k, v]) => `  ${k}: ${v}`).join("\n")}\n`;
const immutable = cacheOf(/glb/);
const fonts = cacheOf(/woff/);
const images = cacheOf(/webp/);
writeFileSync(
  join(out, "_headers"),
  [
    block("/*", global.map((h) => [h.key, h.value])),
    ...["/models/*", "/hdri/*", "/textures/*"].map((p) => block(p, [["Cache-Control", immutable]])),
    block("/fonts/*", [["Cache-Control", fonts]]),
    block("/images/*", [["Cache-Control", images]]),
    block("/_nuxt/*", [["Cache-Control", "no-cache"]]),
  ].join("\n")
);

// No 404.html at the top level = Cloudflare serves index.html for every
// unknown path (the app's own routes like /events), same as firebase.json.
const size = (d) => readdirSync(d).reduce((s, f) => { const p = join(d, f); const st = statSync(p); return s + (st.isDirectory() ? size(p) : st.size); }, 0);
console.log(`dist/ ready: ${(size(out) / 1e6).toFixed(1)} MB`);
