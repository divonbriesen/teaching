# Migration notes: web123 → teaching-web monorepo

Prepared by Claude (Cowork), 2026-08-14. Read this, then decide the open items with Claude Code before pushing. Delete this file once it's no longer useful.

## What's in this folder right now

- `index.html` — new teaching hub, links to all 6 courses.
- `itis3135/` — a **pristine, unmodified copy** of web123's current content (from git HEAD, not my locally-edited copy). Its own `scripts/standards-check.js` and `standards/rules.json` are untouched — same behavior as web123 today.
- `tools/standards-check.js` — the new, actively-maintained copy of the validator. Two real code changes vs. the original: (1) the `RULES_URL` regex was generalized from matching literal `scripts/standards-check.js` to matching `[^/]+/standards-check.js`, because it now lives in a `tools/` folder, not `scripts/` — the original regex would have silently failed to find `rules.json` otherwise. (2) header comment updated to point at its own URL and note the frozen fallback.
- `standards/rules.json` — copy of web123's rules config. Unchanged content — it already lists all 6 course codes (`itis3135, web115, web215, web250, itsc1110, cis110`) in `sites.course.match_dirs`, so no edits were needed there.
- `cis110/`, `itsc1110/`, `web115/`, `web215/`, `web250/` — placeholder `index.html` only ("coming soon"), since there's no content yet.

## What was NOT touched (deliberately)

- **The live `web123` GitHub repo itself.** It needs to keep existing at its current URL, unchanged, because `scripts/standards-check.js` there is linked directly by student pages (current and past). I added a deprecation notice inside that file only (a comment banner + one `console.warn`) — no behavior change, still fully functional. Do not delete or restructure the web123 repo.
- **The 39 HTML pages inside `itis3135/`** still reference their own local `scripts/standards-check.js` via relative path, exactly as web123 does today. I did not repoint them at the shared `tools/` copy. See "Open decision 2" below.
- **`evaluator/scripts/app.js`** inside `itis3135/` still calls the Cloudflare Worker at `web123-evaluator.web123work.workers.dev`. Renaming the site doesn't rename that deployed service — it'll keep working under its old name unless you redeploy it separately. Not something a file move can fix.
- **`itis3135/GRADING-intros/plan-urlBasedIntroComplianceEvaluator.prompt.md`** contains hardcoded local paths like `/Users/d.i.vonbriesen/Documents/!WebWork/teaching/web123/...` — internal planning notes, not site content. Now stale since the folder moved. Left as-is; update if you still use that file.

## Open decisions to make (not mine to guess)

**1. Git history.** This folder was built by copying files, not by `git mv`/`git subtree` — so plugging it into a real repo naively would lose web123's commit history for the itis3135 content. If you want that history preserved inside the new monorepo, do a history-preserving merge instead of a plain copy, e.g. from a fresh clone of `teaching-web` (after creating the empty GitHub repo):

```
git remote add web123-history https://github.com/divonbriesen/web123.git
git fetch web123-history
git merge -s ours --no-commit --allow-unrelated-histories web123-history/main
git read-tree --prefix=itis3135/ -u web123-history/main
git commit -m "Import itis3135 (web123) history into monorepo"
```

Then layer the new files (`index.html`, `tools/`, `standards/`, stub course folders, the regenerated `itis3135/scripts/standards-check.js` if you go with decision 2 below) on top as normal commits. This folder's contents are a correct end-state to diff against — just don't `cp -r` it wholesale over a fresh clone if you want history intact.

**2. Should `itis3135/`'s 39 pages switch to the shared `tools/` copy?** Right now itis3135 keeps its own local `scripts/standards-check.js` (identical to web123's), which matches the script's own stated philosophy of "one canonical copy, don't duplicate it" — the duplication already existed in web123 itself, I just carried it forward unchanged. If you want itis3135 to actually use the new shared canonical copy, every `<script src="scripts/standards-check.js" defer>` becomes `<script src="../tools/standards-check.js" defer>` (mechanical find-replace across 39 files), and `itis3135/scripts/standards-check.js` + `itis3135/standards/rules.json` can then be deleted.

**3. Site-detection behavior change.** web123's own instructional pages (`assignments.html`, `standards.html`, `index.html`, etc.) currently live at the *root* of the web123 site, so the Vicunadator's directory-matching (`match_dirs: itis3135, web115, ...`) doesn't fire on them — they're only checked against general rules. Once this content moves to `teaching-web/itis3135/`, the path *does* contain `/itis3135/`, so these same instructor-facing pages will now be evaluated against the **course** ruleset (built for student submissions — footer "Certified in..." line, mascot nav links, etc.). The llama badge will likely show failures on pages that were never meant to pass those checks. Not harmful (nothing is graded against it), but worth deciding whether to exclude these specific pages from course-mode detection (e.g. via `data-mode="general"` on their own script tags) before it looks alarming.

**4. Repo name.** Everything above assumes the new GitHub repo (and live URL) will be named `teaching-web`, matching this local folder — confirm that's actually what you want to create on GitHub before pushing.

## Suggested next step in Claude Code

Open this folder, confirm the four decisions above, then create the `teaching-web` GitHub repo, do the history-preserving import (decision 1), layer in these files, enable GitHub Pages, and verify `https://divonbriesen.github.io/teaching-web/` and `https://divonbriesen.github.io/teaching-web/itis3135/` both load with the llama badge working.
