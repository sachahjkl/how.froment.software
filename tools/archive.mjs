// Publishes an edition: node tools/archive.mjs YYYY-MM-DD [--root DIR]
// Writes the lists again, from the editions that exist: node tools/archive.mjs --refresh [--root DIR]
//
// What it does, and nothing else:
//   1. writes the date into the edition line and the metadata of the two current pages (index.html, fr/index.html);
//   2. keeps a copy of both pages as they are now in archive/<date>/ (an edition is never changed afterwards:
//      a date that already exists is refused), with their paths rewritten so that the copy still finds the
//      style, the diagrams and its other language, its own address in the metadata, and an "archived edition" line
//      in place of the edition line;
//   3. writes archive/index.html, latest/index.html, feed.xml and sitemap.xml again, from the folders that exist.
// Then it says what to run to commit and tag the edition. No dependency: Node's own modules.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
// the published site: src/site (the pages, their style, and archive/)
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", "src", "site"));
const date = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
const refresh = args.includes("--refresh");
const SITE = "https://how.froment.software/";

function fail(message) { console.error("archive: " + message); process.exit(1); }

if (!refresh) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { fail("give the date of the edition: node tools/archive.mjs 2026-11-05"); }
  const parsed = new Date(date + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) { fail(date + " is not a date"); }
  if (existsSync(join(root, "archive", date))) { fail("edition " + date + " already exists: an edition is not changed, give a new date"); }
}

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

// The address of a page, in its metadata, becomes the address of its archived copy.
function ownAddress(html, d) {
  return html.replace(/<head>[\s\S]*?<\/head>/, (head) => head.replace(
    /(rel="canonical" href="|hreflang="(?:en|fr|x-default)" href="|property="og:url" content="|"url": ")https:\/\/how\.froment\.software\/(fr\/)?/g,
    (whole, before, fr) => `${before}${SITE}archive/${d}/${fr ?? ""}`));
}

// The date of the edition, in the metadata of a current page.
function dated(html, d) {
  return html
    .replace(/(property="article:modified_time" content=")\d{4}-\d{2}-\d{2}/, `$1${d}`)
    .replace(/("dateModified": ")\d{4}-\d{2}-\d{2}/, `$1${d}`);
}

if (!refresh) {
  const pages = PAGES.map((p) => {
    const path = join(root, p.file);
    if (!existsSync(path)) { fail("missing page " + p.file); }
    const html = readFileSync(path, "utf8");
    if (!MARKER.test(html)) { fail(p.file + " has no <!--edition--> line"); }
    return { ...p, path, html };
  });

  for (const p of pages) {
    const current = dated(p.html.replace(MARKER, LINES[p.lang].current(date)), date);
    writeFileSync(p.path, current);
    const copyPath = join(root, "archive", date, p.file);
    mkdirSync(dirname(copyPath), { recursive: true });
    const now = p.lang === "en" ? "../../" : "../../../fr/";
    const all = p.lang === "en" ? "../" : "../../";
    const up = "../../";
    const copy = ownAddress(rebase(current, up), date).replace(MARKER, LINES[p.lang].archived(date, now, all));
    writeFileSync(copyPath, copy);
    console.log("kept   archive/" + date + "/" + p.file);
  }
}

// archive/index.html: every edition, newest first
mkdirSync(join(root, "archive"), { recursive: true });
const dates = readdirSync(join(root, "archive")).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n) && statSync(join(root, "archive", n)).isDirectory()).sort().reverse();
if (dates.length === 0) { fail("no edition yet"); }
const rows = dates.map((d) => `        <tr><td><time datetime="${d}">${d}</time></td><td><a href="${d}/">English</a></td><td><a href="${d}/fr/" hreflang="fr" lang="fr">Français</a></td></tr>`).join("\n");
writeFileSync(join(root, "archive", "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>how. Editions</title>
<meta name="description" content="Every edition of How to make software, with its date.">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#111111">
<link rel="canonical" href="${SITE}archive/">
<link rel="alternate" type="application/atom+xml" title="how. Editions" href="${SITE}feed.xml">
<link rel="icon" href="../favicon.ico" sizes="32x32">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<link rel="manifest" href="../site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="how.">
<meta property="og:title" content="how. Editions">
<meta property="og:description" content="Every edition of How to make software, with its date.">
<meta property="og:url" content="${SITE}archive/">
<meta property="og:image" content="${SITE}social-card-en.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
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
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#111111">
<meta http-equiv="refresh" content="0; url=../archive/${dates[0]}/">
<link rel="canonical" href="${SITE}archive/${dates[0]}/">
<style>html { background: #111111; }</style>
</head>
<body>
<p><a href="../archive/${dates[0]}/">Edition ${dates[0]}</a></p>
</body>
</html>
`);
// feed.xml: every edition, newest first
const entry = (d) => `  <entry>
    <id>${SITE}archive/${d}/</id>
    <title>Edition ${d}</title>
    <link rel="alternate" href="${SITE}archive/${d}/" hreflang="en"/>
    <link rel="alternate" href="${SITE}archive/${d}/fr/" hreflang="fr"/>
    <updated>${d}T00:00:00Z</updated>
    <summary>How to make software, edition ${d}.</summary>
  </entry>`;
writeFileSync(join(root, "feed.xml"), `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${SITE}</id>
  <title>how. Editions</title>
  <subtitle>People answer. The repository is the truth. Measurements judge.</subtitle>
  <link rel="self" type="application/atom+xml" href="${SITE}feed.xml"/>
  <link rel="alternate" type="text/html" href="${SITE}"/>
  <icon>${SITE}icon-192.png</icon>
  <rights>CC BY 4.0</rights>
  <author><name>Sacha Froment</name><uri>https://froment.software</uri></author>
  <updated>${dates[0]}T00:00:00Z</updated>
${dates.map(entry).join("\n")}
</feed>
`);
// sitemap.xml: the current pages, the list of editions, every edition
const page = (loc, d, en, fr) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${d}</lastmod>${en ? `
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="fr" href="${fr}"/>` : ""}
  </url>`;
const pair = (base, d) => [page(base, d, base, base + "fr/"), page(base + "fr/", d, base, base + "fr/")];
writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...pair(SITE, dates[0]), page(SITE + "archive/", dates[0]), ...dates.flatMap((d) => pair(`${SITE}archive/${d}/`, d))].join("\n")}
</urlset>
`);
console.log("wrote  archive/index.html, latest/, feed.xml, sitemap.xml (" + dates.length + " edition" + (dates.length === 1 ? "" : "s") + ")");
if (!refresh) { console.log("\nNext:  git add -A && git commit -m \"feat(edition): " + date + " (HOW-n)\" && git tag -a " + date + " -m \"Edition " + date + "\""); }
