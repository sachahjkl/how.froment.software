// Checks on the pages and on the archive script. Run: node --test
// No dependency: Node's own test runner.

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(repo, "src", "site");
const script = join(repo, "tools", "archive.mjs");
const PAGES = ["index.html", "fr/index.html"];

const read = (root, page) => readFileSync(join(root, page), "utf8");
const sectionIds = (html) => [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);

// The files a page names that are not on another site: the ones that must exist.
function missingFiles(root, page) {
  const html = read(root, page);
  const base = dirname(join(root, page));
  const missing = [];
  for (const m of html.matchAll(/<(?:a|link|script)\b[^>]*?\b(?:href|src)="([^"]*)"/g)) {
    const value = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(value)) { continue; }
    const target = resolve(base, value.split("#")[0]);
    const ok = existsSync(target) && (!statSync(target).isDirectory() || existsSync(join(target, "index.html")));
    if (!ok) { missing.push(value); }
  }
  return missing;
}

test("both languages have the same sections in the same order", () => {
  assert.deepEqual(sectionIds(read(site, "fr/index.html")), sectionIds(read(site, "index.html")));
});

test("every link inside a page points to an id that exists", () => {
  for (const page of PAGES) {
    const html = read(site, page);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(ids.has(decodeURIComponent(m[1])), `${page}: #${m[1]} has no id`);
    }
  }
});

test("every file a page names exists", () => {
  for (const page of PAGES) { assert.deepEqual(missingFiles(site, page), [], page); }
});

test("every diagram is drawn from its source, in both languages", () => {
  const names = PAGES.map((p) => [...read(site, p).matchAll(/data-diagram="([^"]+)"/g)].map((m) => m[1]));
  assert.deepEqual(names[0], names[1]);
  assert.ok(names[0].length >= 4, "the text has its diagrams");
  PAGES.forEach((page, i) => {
    const lang = ["en", "fr"][i];
    const html = read(site, page);
    assert.ok(!html.includes('class="mermaid"'), page + " draws nothing in the browser");
    for (const name of names[i]) {
      const source = readFileSync(join(repo, "src", "diagrams", lang, name + ".mmd"), "utf8");
      const hash = createHash("sha256").update(source).digest("hex");
      const block = html.match(new RegExp(`data-diagram="${name}" data-hash="([0-9a-f]+)"><svg`));
      assert.ok(block, `${page}: ${name} is drawn`);
      assert.equal(block[1], hash, `${page}: ${name} is older than its source: node tools/diagrams.mjs`);
    }
  });
});

test("every section ends with its sources", () => {
  for (const page of PAGES) {
    const html = read(site, page);
    const sections = [...html.matchAll(/<section id="([^"]+)">([\s\S]*?)<\/section>/g)];
    const without = sections.filter((s) => !/class="src"/.test(s[2]) && !/class="note"/.test(s[2])).map((s) => s[1]);
    assert.deepEqual(without, [], `${page}: a section with neither sources nor a note saying it is a position`);
  }
});

test("the text states things: it does not present, excuse or explain itself", () => {
  const banned = [/not a manifesto/i, /not commandments/i, /take what fits/i, /each one is useful/i, /with their sources/i, /a position, not/i, /first draft/i, /\bsoup/i,
    /pas un manifeste/i, /pas des commandements/i, /prenez ce qui convient/i, /avec leurs sources/i, /premier jet/i, /\bsoupe/i];
  for (const page of PAGES) {
    const text = read(site, page).replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ");
    for (const phrase of banned) { assert.ok(!phrase.test(text), `${page}: ${phrase}`); }
  }
});

test("the TL;DR has one line per position, in order", () => {
  for (const page of PAGES) {
    const html = read(site, page);
    const list = html.match(/<ol class="tldr">([\s\S]*?)<\/ol>/);
    assert.ok(list, `${page} has a TL;DR`);
    const targets = [...list[1].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(targets, sectionIds(html).filter((id) => id !== "agile"), page);
    assert.match(html, /href="#tldr"/, `${page} links to it`);
  }
});

test("latest/ leads to the newest edition", () => {
  const dates = readdirSync(join(site, "archive")).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  assert.match(read(site, "latest/index.html"), new RegExp(`url=\\.\\./archive/${dates.at(-1)}/`));
});

test("nothing is loaded from another site", () => {
  for (const page of PAGES) {
    const html = read(site, page);
    assert.ok(!/<script[^>]+src="https?:/.test(html), `${page} loads a script from another site`);
    assert.ok(!/<link[^>]+rel="stylesheet"[^>]+href="https?:/.test(html), `${page} loads a style from another site`);
  }
});

const meta = (html, name) => html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`))?.[1];
const SITE = "https://how.froment.software/";

test("every page says what it is when it is shared", () => {
  for (const [page, address, card] of [["index.html", SITE, "card-en.png"], ["fr/index.html", SITE + "fr/", "card-fr.png"]]) {
    const html = read(site, page);
    assert.match(html, new RegExp(`<link rel="canonical" href="${address}">`), page);
    assert.equal(meta(html, "og:url"), address, page);
    assert.equal(meta(html, "og:image"), SITE + card, page);
    assert.equal(meta(html, "twitter:card"), "summary_large_image", page);
    for (const name of ["og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description", "twitter:image"]) {
      assert.ok(meta(html, name), `${page}: ${name}`);
    }
    assert.ok(existsSync(join(site, card)), card);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.url, address, page);
    for (const lang of ["en", "fr", "x-default"]) { assert.match(html, new RegExp(`hreflang="${lang}" href="https:`), page); }
  }
});

test("the files around the pages exist and agree", () => {
  for (const file of ["404.html", "robots.txt", "llms.txt", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", ".well-known/security.txt"]) {
    assert.ok(existsSync(join(site, file)), file);
  }
  for (const icon of JSON.parse(read(site, "site.webmanifest")).icons) { assert.ok(existsSync(join(site, icon.src)), icon.src); }
  const dates = readdirSync(join(site, "archive")).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n));
  const sitemap = read(site, "sitemap.xml");
  const feed = read(site, "feed.xml");
  for (const d of dates) {
    assert.ok(sitemap.includes(`<loc>${SITE}archive/${d}/fr/</loc>`), `sitemap: ${d}`);
    assert.ok(feed.includes(`<id>${SITE}archive/${d}/</id>`), `feed: ${d}`);
  }
  const expires = read(site, ".well-known/security.txt").match(/^Expires: (.+)$/m)[1];
  assert.ok(new Date(expires) > new Date(), "security.txt has not expired");
});

test("publishing an edition keeps both pages, dated, and refuses the same date twice", () => {
  const dir = mkdtempSync(join(tmpdir(), "how-edition-"));
  try {
    cpSync(site, dir, { recursive: true });
    const run = (date) => spawnSync(process.execPath, [script, date, "--root", dir], { encoding: "utf8" });

    const first = run("2099-01-02");
    assert.equal(first.status, 0, first.stderr);
    for (const page of PAGES) {
      const copy = join("archive", "2099-01-02", page);
      assert.ok(existsSync(join(dir, copy)), copy + " is kept");
      assert.deepEqual(missingFiles(dir, copy), [], copy + " still finds its files");
      assert.match(read(dir, copy), /class="edition archived"/, copy + " says it is archived");
      assert.match(read(dir, page), /<time datetime="2099-01-02">/, page + " shows the edition");
      assert.equal(meta(read(dir, page), "article:modified_time"), "2099-01-02", page + " is dated");
      const own = SITE + "archive/2099-01-02/" + page.replace("index.html", "");
      assert.equal(meta(read(dir, copy), "og:url"), own, copy + " has its own address");
      assert.match(read(dir, copy), new RegExp(`<link rel="canonical" href="${own}">`), copy);
    }
    assert.match(read(dir, "archive/index.html"), /2099-01-02/);
    assert.ok(read(dir, "feed.xml").includes("archive/2099-01-02/"), "the feed has the edition");
    assert.ok(read(dir, "sitemap.xml").includes("archive/2099-01-02/fr/"), "the sitemap has the edition");

    const again = run("2099-01-02");
    assert.equal(again.status, 1, "the same date is refused");
    assert.match(again.stderr, /already exists/);

    assert.equal(run("2099-02-30").status, 1, "a date that does not exist is refused");
    assert.equal(run("tomorrow").status, 1, "a word is not a date");

    const second = run("2099-03-04");
    assert.equal(second.status, 0, second.stderr);
    const index = read(dir, "archive/index.html");
    assert.ok(index.indexOf("2099-03-04") < index.indexOf("2099-01-02"), "newest first");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
