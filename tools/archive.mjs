// Publishes an edition: node tools/archive.mjs YYYY-MM-DD [--root DIR]
//
// What it does, and nothing else:
//   1. writes the date into the edition line of the two current pages (index.html, fr/index.html);
//   2. keeps a copy of both pages as they are now in archive/<date>/ (an edition is never changed afterwards:
//      a date that already exists is refused), with their paths rewritten so that the copy still finds the
//      style, the diagrams and its other language, and with an "archived edition" line in place of the edition line;
//   3. writes archive/index.html again, from the folders that exist.
// Then it says what to run to commit and tag the edition. No dependency: Node's own modules.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
// the published site: src/site (the pages, their style, and archive/)
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", "src", "site"));
const date = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");

function fail(message) { console.error("archive: " + message); process.exit(1); }

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { fail("give the date of the edition: node tools/archive.mjs 2026-11-05"); }
const parsed = new Date(date + "T00:00:00Z");
if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) { fail(date + " is not a date"); }
const target = join(root, "archive", date);
if (existsSync(target)) { fail("edition " + date + " already exists: an edition is not changed, give a new date"); }

const MARKER = /<!--edition-->[\s\S]*?<!--\/edition-->/;
const PAGES = [
  { lang: "en", file: "index.html" },
  { lang: "fr", file: "fr/index.html" },
];

// The edition line of a page that is current, and of its archived copy. `depth` is how far the copy is below archive/.
const LINES = {
  en: {
    current: (d) => `<!--edition--><p class="edition">Edition <time datetime="${d}">${d}</time> &middot; <a href="archive/">All editions</a></p><!--/edition-->`,
    archived: (d, now, all) => `<!--edition--><p class="edition archived">Archived edition <time datetime="${d}">${d}</time>. <a href="${now}">Current edition</a> &middot; <a href="${all}">All editions</a></p><!--/edition-->`,
  },
  fr: {
    current: (d) => `<!--edition--><p class="edition">Édition <time datetime="${d}">${d}</time> &middot; <a href="../archive/">Toutes les éditions</a></p><!--/edition-->`,
    archived: (d, now, all) => `<!--edition--><p class="edition archived">Édition archivée <time datetime="${d}">${d}</time>. <a href="${now}">Édition courante</a> &middot; <a href="${all}">Toutes les éditions</a></p><!--/edition-->`,
  },
};

// Every relative href/src goes up to the root, except the links a tag marks with data-keep (they stay inside the copy).
function rebase(html, up) {
  return html.replace(/<(a|link|script)\b[^>]*>/g, (tag) => {
    if (/\bdata-keep\b/.test(tag)) { return tag; }
    return tag.replace(/\b(href|src)="([^"]*)"/g, (whole, attr, value) =>
      /^(https?:|mailto:|data:|#|\/)/.test(value) ? whole : `${attr}="${up}${value}"`);
  });
}

const pages = PAGES.map((p) => {
  const path = join(root, p.file);
  if (!existsSync(path)) { fail("missing page " + p.file); }
  const html = readFileSync(path, "utf8");
  if (!MARKER.test(html)) { fail(p.file + " has no <!--edition--> line"); }
  return { ...p, path, html };
});

for (const p of pages) {
  const current = p.html.replace(MARKER, LINES[p.lang].current(date));
  writeFileSync(p.path, current);
  const copyPath = join(target, p.file);
  mkdirSync(dirname(copyPath), { recursive: true });
  const now = p.lang === "en" ? "../../" : "../../../fr/";
  const all = p.lang === "en" ? "../" : "../../";
  const up = "../../";
  const copy = rebase(current, up).replace(MARKER, LINES[p.lang].archived(date, now, all));
  writeFileSync(copyPath, copy);
  console.log("kept   archive/" + date + "/" + p.file);
}

// archive/index.html: every edition, newest first
mkdirSync(join(root, "archive"), { recursive: true });
const dates = readdirSync(join(root, "archive")).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n) && statSync(join(root, "archive", n)).isDirectory()).sort().reverse();
const rows = dates.map((d) => `        <tr><td><time datetime="${d}">${d}</time></td><td><a href="${d}/">English</a></td><td><a href="${d}/fr/" hreflang="fr" lang="fr">Français</a></td></tr>`).join("\n");
writeFileSync(join(root, "archive", "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>how. Editions</title>
<meta name="description" content="Every edition of How to make software, with its date.">
<meta name="theme-color" content="#111111">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../style.css">
</head>
<body>

<header class="cover">
  <div class="bar">
    <a class="wordmark" href="../">how<span>.</span></a>
  </div>
  <h1>Editions</h1>
</header>

<main class="list">
  <div class="roles">
    <table>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
</main>

</body>
</html>
`);
// latest/: a stable address for the newest edition (GitHub Pages has no server redirects)
mkdirSync(join(root, "latest"), { recursive: true });
writeFileSync(join(root, "latest", "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>how. Latest edition</title>
<meta http-equiv="refresh" content="0; url=../archive/${dates[0]}/">
<link rel="canonical" href="https://how.froment.software/archive/${dates[0]}/">
</head>
<body>
<p><a href="../archive/${dates[0]}/">Edition ${dates[0]}</a></p>
</body>
</html>
`);
console.log("wrote  archive/index.html (" + dates.length + " edition" + (dates.length === 1 ? "" : "s") + ")");
console.log("\nNext:  git add -A && git commit -m \"feat(edition): " + date + " (HOW-n)\" && git tag -a " + date + " -m \"Edition " + date + "\"");
