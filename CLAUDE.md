# teaching

Monorepo for D. von Briesen's course sites, replacing separate per-course repos.
Live root (once pushed + Pages enabled): https://divonbriesen.github.io/teaching/

Built by Claude (Cowork) on 2026-08-14 from a restructure of the existing `web123`
repo (itis3135's old standalone site). Read this before doing anything else here —
it carries context from that planning conversation that isn't visible anywhere else.

## Why a monorepo (vs. one repo per course, which is how web123 worked)

Decided in favor of one repo with course subfolders because: this is a solo
instructor (no TA/co-instructor access-control need that would favor separate
repos), shared assets (the validator script, rules.json, standards/commandments
content) can be truly shared via relative paths instead of hosted-by-URL
workarounds, and cross-course consistency edits become one commit instead of N.
The tradeoff accepted: no way to grant repo access to just one course later, and
git history is one combined stream across all courses.

## Structure

- `index.html` — home page, links to all 6 courses.
- `itis3135/` — pristine copy of web123's current content (ITIS 3135). Its own
  `scripts/standards-check.js` + `standards/rules.json` are untouched copies,
  identical behavior to web123 today (see open decision 2 below).
- `cis110/`, `itsc1110/`, `web115/`, `web215/`, `web250/` — placeholder pages only
  ("coming soon"). Build these out course by course.
- `tools/standards-check.js` — the new canonical validator, meant to be linked
  (not copied) by every course going forward. Has one real code fix vs. the
  original: the `RULES_URL` regex was generalized to match any parent folder
  name, not just literal `scripts/`, since this copy lives in `tools/`.
- `standards/rules.json` — shared rules config. Already lists all 6 course
  codes in `sites.course.match_dirs` — no edits needed there.

## Hard constraint: do not touch the separate `web123` repo's live URL

Students (current and past) link `scripts/standards-check.js` directly from
`https://divonbriesen.github.io/web123/scripts/standards-check.js` on their own
pages. That repo must keep existing, unchanged, at that URL — it is NOT being
folded into or deleted in favor of this monorepo. A deprecation notice
(comment banner + console.warn, no behavior change) was added to that file in
a local sandbox clone but has NOT been pushed to the real web123 repo yet —
that's still a pending push, separate from this repo's work.

## Open decisions — read MIGRATION-NOTES.md for full detail

1. **Git history**: this folder's `itis3135/` was built by copying files, not
   `git mv`/`git subtree`. If web123's commit history should carry into this
   repo, do a history-preserving merge (exact commands in MIGRATION-NOTES.md)
   instead of just committing this folder as-is.
2. **Should itis3135 switch to the shared `tools/` copy?** Currently itis3135
   keeps its own local script copy (39 HTML files reference
   `scripts/standards-check.js` by relative path), matching web123's existing
   pattern. Switching all 39 to `../tools/standards-check.js` and deleting the
   local copy would eliminate the duplication but wasn't done automatically —
   confirm with the user first.
3. **Site-detection behavior change**: moving this content under a literal
   `itis3135/` path means the Vicunadator will now match `match_dirs` and
   evaluate these instructor-facing pages (assignments.html, standards.html,
   etc.) against student "course" rules for the first time — they were
   previously unmatched at web123's root. Expect the llama badge to show new
   failures on pages that were never meant to pass those checks; not harmful,
   but confirm whether specific pages should opt out via `data-mode="general"`.
4. **Repo name**: the repo is `divonbriesen/teaching`, served at
   https://divonbriesen.github.io/teaching/. It was renamed from
   `teaching-web` on 2026-08-21; a redirect shim still lives at the old
   name, because GitHub redirects repository URLs but not Pages URLs.

## Related context not visible to you here

The user also has a Claude.ai Project ("ITIS3135") with a course syllabus and
a "Teaching-Site-Standards.md" doc (general web dev standards, the Seven
Commandments, validator usage) extracted from web123 — written for reuse
across future course sites. That Project isn't reachable from this repo; if
its content and this repo drift apart, that's on whoever's driving to keep in
sync manually.
