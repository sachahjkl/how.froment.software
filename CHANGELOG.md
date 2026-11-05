# Changelog

All notable changes to this text and its site are written here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The versions are editions, named by date
(calendar versioning).

## [Unreleased]

### Added
- `/latest`: a stable address for the newest edition.
- `LICENSE`: the text and the diagrams are under CC BY 4.0, and the footer says so.
- `SECURITY.md` and `THREAT_MODEL.md`.
- Who designs it works on it (Goedecke, Bell), and developers are not spare parts (Naur).

### Changed
- The text is for teams of ten to thirty people.

## [2026-11-05]

### Added
- The text, in English and French: an opening on agile, then twenty-five positions in three chapters (people answer,
  the repository is the truth, measurements judge), each with its sources.
- A TL;DR and an order of adoption.
- Six diagrams, drawn once from Mermaid sources (`src/diagrams`, `tools/diagrams.mjs`).
- Contents that mark the position being read.
- Dated, archived editions: `tools/archive.mjs` keeps every edition under `src/site/archive/`.
- Checks on the pages, the diagrams and the archive script (`tests/`).
- IBM Plex Mono and Sans (OFL), bundled: the page loads nothing from another site.
- Publication to GitHub Pages from `src/site`.
