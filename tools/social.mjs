// Draws the images the site is shared and installed with: node tools/social.mjs
//
// Writes, in src/site: social-card-en.png and social-card-fr.png (1200x630), apple-touch-icon.png (180),
// icon-192.png, icon-512.png and favicon.ico (32), from favicon.svg and the bundled fonts, in a local Chromium
// (CHROME, or Edge or Chrome where they usually are). The site needs none of this at run time.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(repo, "src", "site");

const browser = [
  process.env.CHROME,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((p) => p && existsSync(p));
if (!browser) { console.error("social: no Chromium found: set CHROME"); process.exit(1); }

const url = (p) => pathToFileURL(p).href;
const font = (name) => url(join(site, "fonts", name));

const CARDS = {
  en: { title: "How to make software", lines: ["People <b>answer</b>.", "The repository is the <b>truth</b>.", "Measurements <b>judge</b>."] },
  fr: { title: "Comment faire du logiciel", lines: ["Les gens <b>répondent</b>.", "Le dépôt <b>fait foi</b>.", "Les mesures <b>jugent</b>."] },
};

const card = ({ title, lines }) => `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: "Mono"; src: url("${font("ibm-plex-mono-700.woff2")}"); font-weight: 700; }
@font-face { font-family: "Sans"; src: url("${font("ibm-plex-sans-400.woff2")}"); font-weight: 400; }
@font-face { font-family: "Sans"; src: url("${font("ibm-plex-sans-600.woff2")}"); font-weight: 600; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #111; color: #f2f2f2; }
main { box-sizing: border-box; width: 1200px; height: 630px; padding: 64px 72px; border-left: 16px solid #29c659;
  display: flex; flex-direction: column; font-family: "Sans", sans-serif; }
.mark { font: 700 44px "Mono", monospace; }
.mark span { color: #29c659; }
h1 { margin: auto 0 28px; font-size: 84px; line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; }
p { margin: 0; font-size: 36px; line-height: 1.35; color: #c8c8c8; }
b { color: #29c659; font-weight: 600; }
.url { margin-top: auto; font: 700 26px "Mono", monospace; color: #8a8a8a; }
</style><main><div class="mark">how<span>.</span></div><h1>${title}</h1>
${lines.map((l) => `<p>${l}</p>`).join("")}<div class="url">how.froment.software</div></main>`;

const icon = (svg) => `<!doctype html><meta charset="utf-8"><style>html, body { margin: 0; background: #29c659; overflow: hidden; }
svg { display: block; width: 100vw; height: 100vh; }</style>${svg}`;

// A page, as a PNG of exactly width x height. The window is never smaller than Chromium allows: the scale does the rest.
function shot(html, width, height, base = width) {
  const dir = mkdtempSync(join(tmpdir(), "how-social-"));
  try {
    const page = join(dir, "page.html");
    const out = join(dir, "out.png");
    writeFileSync(page, html);
    const scale = width / base;
    execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
      `--user-data-dir=${join(dir, "profile")}`, "--virtual-time-budget=5000", `--force-device-scale-factor=${scale}`,
      `--window-size=${base},${Math.round(height / scale)}`, `--screenshot=${out}`, url(page)], { stdio: "ignore" });
    const png = readFileSync(out);
    const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (size[0] !== width || size[1] !== height) { console.error(`social: got ${size.join("x")}, wanted ${width}x${height}`); process.exit(1); }
    return png;
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
}

// An .ico holding one PNG.
function ico(png, size) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head[6] = size;
  head[7] = size;
  head.writeUInt16LE(1, 10);
  head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
}

for (const [lang, text] of Object.entries(CARDS)) {
  writeFileSync(join(site, `social-card-${lang}.png`), shot(card(text), 1200, 630));
  console.log(`social-card-${lang}.png`);
}
const svg = readFileSync(join(site, "favicon.svg"), "utf8");
for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  writeFileSync(join(site, file), shot(icon(svg), size, size, 512));
  console.log(file);
}
writeFileSync(join(site, "favicon.ico"), ico(shot(icon(svg), 32, 32, 512), 32));
console.log("favicon.ico");
