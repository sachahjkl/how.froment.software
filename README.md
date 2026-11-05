# how.froment.software

How to make software: a short text on collaborative, iterative development, in English and French.
People answer. The repository is the truth. Measurements judge.

## Layout

```
README.md          this file
CONTRIBUTING.md    how to change it
CHANGELOG.md       what changed, edition by edition
CODEOWNERS         who to ask
src/site/          the published site: the pages (EN, FR), their style, the dated archive
src/md/            the intent: why the text says what it says
src/diagrams/      the sources of the diagrams, in Mermaid
docs/              how editions work, the sources, the backlog
tests/             checks on the pages and on the archive script
tools/             the scripts that draw the diagrams and publish an edition
```

## Run it

The site is plain HTML and CSS. Open `src/site/index.html`, or serve the folder with any static server.
IBM Plex (OFL) is bundled in `src/site/fonts/`. The diagrams are SVG in the pages, drawn from `src/diagrams/` by `node tools/diagrams.mjs` (Mermaid, MIT, in `tools/vendor/`; needs a local Chromium).

## Test it

```
node --test
```

Needs Node 20 or later. No dependency to install.

## Publish an edition

```
node tools/archive.mjs YYYY-MM-DD
```

See [docs/editions.md](docs/editions.md).
