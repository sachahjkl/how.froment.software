// Draws the diagrams: node tools/diagrams.mjs
//
// The source of a diagram is Mermaid text, in src/diagrams/<lang>/<name>.mmd. This script draws them once, in a local
// Chromium (CHROME, or Edge or Chrome where they usually are), and writes the SVG into the pages, in place of
// <div class="diagram" data-diagram="name" ...>. The site then needs neither Mermaid nor JavaScript for them.
// data-hash is the SHA-256 of the source: `node --test` fails when a page is older than its source.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(repo, "src", "site");
const PAGES = [{ lang: "en", file: "index.html" }, { lang: "fr", file: "fr/index.html" }];

const browser = [
  process.env.CHROME,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((p) => p && existsSync(p));
if (!browser) { console.error("diagrams: no Chromium found: set CHROME"); process.exit(1); }

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const hash = (s) => createHash("sha256").update(s).digest("hex");

function draw(lang, names) {
  const dir = mkdtempSync(join(tmpdir(), "how-diagrams-"));
  const sources = names.map((n) => readFileSync(join(repo, "src", "diagrams", lang, n + ".mmd"), "utf8"));
  const page = join(dir, "render.html");
  const url = (p) => pathToFileURL(p).href;
  writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: "Plex Mono"; src: url("${url(join(site, "fonts/ibm-plex-mono-400.woff2"))}"); font-weight: 400; }
@font-face { font-family: "Plex Mono"; src: url("${url(join(site, "fonts/ibm-plex-mono-700.woff2"))}"); font-weight: 700; }
body { width: 760px; }
</style>
${names.map((n, i) => `<div data-name="${n}"><pre class="mermaid">${escape(sources[i])}</pre></div><!--end-->`).join("\n")}
<script src="${url(join(repo, "tools/vendor/mermaid.min.js"))}"></script>
<script>
  var mono = "'Plex Mono', ui-monospace, Consolas, monospace", k = "#1a1a1a", w = "#f2f2f2", y = "#29c659";
  mermaid.initialize({
    startOnLoad: false, securityLevel: "strict", deterministicIds: true, theme: "base", fontFamily: mono, htmlLabels: false,
    flowchart: { curve: "linear", htmlLabels: false, padding: 14 },
    gitGraph: { rotateCommitLabel: false },
    themeVariables: {
      fontFamily: mono, fontSize: "13px",
      background: k, primaryColor: k, primaryTextColor: w, primaryBorderColor: w,
      lineColor: w, secondaryColor: k, tertiaryColor: k, textColor: w,
      mainBkg: k, nodeBorder: w, clusterBkg: k, clusterBorder: w, edgeLabelBackground: k,
      git0: y, git1: w, git2: "#ff5a4f", git3: w,
      gitBranchLabel0: "#000000", gitBranchLabel1: "#000000", gitBranchLabel2: "#000000", gitBranchLabel3: "#000000",
      commitLabelColor: w, commitLabelBackground: k, tagLabelColor: "#000000", tagLabelBackground: y, tagLabelBorder: y
    }
  });
  Promise.all([document.fonts.load("400 13px 'Plex Mono'"), document.fonts.load("700 13px 'Plex Mono'")]).then(function () {
    mermaid.run({ querySelector: "pre.mermaid" });
  });
</script>`);
  const dom = execFileSync(browser, ["--headless=new", "--disable-gpu", "--allow-file-access-from-files", `--user-data-dir=${join(dir, "profile")}`,
    "--virtual-time-budget=20000", "--dump-dom", url(page)], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  const out = {};
  for (const n of names) {
    const part = dom.match(new RegExp(`<div data-name="${n}">([\\s\\S]*?)<!--end-->`));
    const svg = part && part[1].match(/<svg[\s\S]*<\/svg>/);
    if (!svg) { console.error(`diagrams: ${lang}/${n} was not drawn`); process.exit(1); }
    out[n] = svg[0].replace(/id="mermaid-/g, `id="d-${n}-`).replace(/#mermaid-(\d+)/g, `#d-${n}-$1`).replace(/url\(#mermaid-/g, `url(#d-${n}-`);
  }
  return out;
}

for (const { lang, file } of PAGES) {
  const path = join(site, file);
  let html = readFileSync(path, "utf8");
  const names = [...html.matchAll(/data-diagram="([^"]+)"/g)].map((m) => m[1]);
  const svgs = draw(lang, names);
  for (const n of names) {
    const source = readFileSync(join(repo, "src", "diagrams", lang, n + ".mmd"), "utf8");
    const block = new RegExp(`<div class="diagram" data-diagram="${n}"[^>]*>[\\s\\S]*?</div>`);
    html = html.replace(block, () => `<div class="diagram" data-diagram="${n}" data-hash="${hash(source)}">${svgs[n]}</div>`);
  }
  writeFileSync(path, html);
  console.log(`${file}: ${names.length} diagrams, ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
}
