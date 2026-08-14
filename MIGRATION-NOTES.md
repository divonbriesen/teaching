# Migration notes: web123 → teaching-web monorepo

Migration completed 2026-08-14. This file records what was decided and what is
still open. Delete it once the two remaining items below are settled.

## What happened

- **History preserved.** This repo's first commit carries the old web123 `main`
  as its parent, with that entire tree rewritten under `itis3135/`. All prior
  commits remain reachable, so `git log --follow itis3135/<file>` traces a
  page's full past.
- **Student data removed.** Three `GRADING-intros/RESULTS-*.txt` files and
  `testing.md` paired ~80 students' names with their evaluation findings, and
  had been publicly readable in the old repo. They were purged from history
  here and in web123, verified absent from every commit, and are gitignored
  going forward (`RESULTS-*`, `grading-output/`).
- **web123 still exists, deliberately.** Student pages from past terms hardcode
  `https://divonbriesen.github.io/web123/scripts/standards-check.js`. That repo
  is now a three-file shim serving only that script and the `rules.json` it
  fetches. The old full-content repo is private at `web123-archive-2026`.
- **The evaluator Worker is tracked** at `tools/evaluator-worker/` — it had
  never been committed anywhere. Deploying from this new location is untested;
  the original copy is still in `teaching/web123-archive/worker`.
- **Live at** https://divonbriesen.github.io/teaching-web/

## Still open

**1. `itis3135/`'s 39 pages still use their own local validator copy.** They
load `scripts/standards-check.js` rather than the shared `../tools/` copy, which
is how web123 behaved and is why nothing broke in the move. Switching them is a
mechanical find-replace across 39 files, after which
`itis3135/scripts/standards-check.js` and `itis3135/standards/rules.json` can be
deleted. Until then the shared `tools/` copy is the canonical one but is loaded
by nothing.

**2. Instructor pages now fail the course ruleset — confirmed live.** Because
these pages sit under `/itis3135/`, the Vicunadator's `match_dirs` detection now
applies the *student submission* rules to them. The hub page currently shows 8
failures, all of them rules it was never meant to satisfy: the "Name's Mascot |
COURSEID" site-name format, the footer "Certified in ..." line, required nav
links to the cert/CRAP/Pictures/Introduction-Form pages, and the
`components/header.html` requirement. Nothing is graded against this, but the
llama reads as broken on your own hub. The fix is `data-mode="general"` on the
script tag of each instructor-facing page (`index.html`, `assignments.html`,
`standards.html`, `validation.html`, `commandments.html`, `pprp.html`).

## Known loose ends

- `itis3135/evaluator/scripts/app.js` still calls the Cloudflare Worker at
  `web123-evaluator.web123work.workers.dev`. Renaming the site didn't rename the
  deployed service; it keeps working under its old name.
- `itis3135/GRADING-intros/plan-urlBasedIntroComplianceEvaluator.prompt.md`
  contains hardcoded paths pointing at the old `teaching/web123/` location.
