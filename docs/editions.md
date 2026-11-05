# Editions

The text changes, so it has editions. An edition is a dated copy of both pages, kept for good.

## The rule

- The pages in `src/site/` are the **current** text. Edit them freely between editions.
- An **edition** is published with a date: `YYYY-MM-DD`. Once published it is never changed.
  A correction is a new edition.
- Every page shows its edition at the top, and links to the list of all editions.

## Publish an edition

```
node --test
node tools/archive.mjs 2026-11-05
git add -A
git commit -m "feat(edition): 2026-11-05 (HOW-n)"
git tag -a 2026-11-05 -m "Edition 2026-11-05"
```

`tools/archive.mjs`:

1. writes the date in the edition line of the two current pages;
2. copies both pages to `src/site/archive/<date>/` (English) and `src/site/archive/<date>/fr/` (French),
   rewriting their paths so the copy still finds the style, the diagrams and its other language, and
   replacing the edition line with an "archived edition" line;
3. writes `src/site/archive/index.html` again, from the folders that exist;
4. points `/latest` at the new edition.

It refuses a date that already exists.

## Two copies of the history

The archive on the site is for readers. The git history is for the authors: the tag of each edition
(`2026-11-05`) points to the commit that published it. If the two ever disagree, git is right.

## What an archived edition does not freeze

The style (`style.css`) and the diagram script are shared, not copied: an old edition looks like the
current one. Its **words** are what is kept.
