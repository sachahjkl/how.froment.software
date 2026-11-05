# Threat model

## What we are working on

A static site, in plain HTML, CSS and a small script, published by GitHub Pages at how.froment.software. The page
loads nothing from another site. It holds no accounts and no data about readers. What we defend is the integrity of
the text and of the dated editions, and the name how.froment.software.

## What can go wrong

| Threat | What it would do |
| --- | --- |
| Someone takes over the GitHub account | Changes the text, an edition or the workflow |
| Someone takes over the Cloudflare account | Points the name at another site |
| The Pages site is removed and the DNS record stays | Someone else claims the name on GitHub |
| A GitHub Action in the workflow is compromised | Publishes a changed site |
| An edition is changed after publication | Readers cite a text that moved |

## What we do about it

- Commits and edition tags are signed. An edition can be compared with its tag.
- `node tools/archive.mjs` refuses a date that already exists.
- The workflow runs `node --test` before it publishes, with no dependency to install.
- HTTPS is enforced.
- Remove the DNS record before the Pages site, never after.
- Mermaid stays in `tools/vendor/`: it draws the diagrams here and is never sent to the reader.

## Did we do a good enough job

Read this file again at each edition, and change it in the same commit as whatever it describes. Known gap: the
workflow's Actions are pinned by tag, not by commit hash.
