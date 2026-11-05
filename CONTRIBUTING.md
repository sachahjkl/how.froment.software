# Contributing

This repository follows what the text says. Read the text first.

## Where things go

| What | Where |
| --- | --- |
| The pages (English, French) | `src/site/index.html`, `src/site/fr/index.html` |
| Their style | `src/site/style.css` |
| The diagrams | `src/diagrams/<lang>/*.mmd`, then `node tools/diagrams.mjs` |
| Why the text says what it says | `src/md/` |
| Sources, editions, backlog | `docs/` |
| Checks | `tests/` |
| Publishing an edition | `tools/archive.mjs` |

Do not edit `src/site/archive/`: an edition is never changed after it is published.

## Voice

State the thing and stop. The text never presents itself, never explains why it exists, never excuses itself and
never answers an objection nobody made. No "this is not a manifesto", no "take what fits". Opinions are sharp on
ideas and never on people. `node --test` refuses the phrases that crept in before.

## Rules

- **Both languages change together.** A change to one page is a change to the other, in the same commit.
  `node --test` checks that both have the same sections.
- **A claim has a source.** Every section ends with its sources. Check a link before you add it, and add it
  to [docs/sources.md](docs/sources.md) with the date you checked it.
- **Every change has a task number** from [docs/backlog.md](docs/backlog.md) (`HOW-n`, never reused).
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** with the number:
  `docs(site): sharpen the section on Conway (HOW-12)`.
- **The changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).** Add a line under
  `Unreleased` for every change a reader can see.
- **Formats are open.** Markdown, HTML, CSS, Mermaid. No tool that someone must pay for or log in to.
- `.editorconfig` is the style. Do not debate it.

## Before you push

```
node --test
```

## Editions

A change to the text is a new edition, dated. See [docs/editions.md](docs/editions.md).
