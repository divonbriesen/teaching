# Handoff

Running notes for D.I. and for whoever picks this up next (Claude or a person).
Update this file at least once a week. Newest entry goes at the top of the log.

Last updated: 2026-11-25 (id naming changed to dashes, see below)

## How D.I. wants me to work

- Commit and push straight to `main` on `divonbriesen/teaching`. No pull requests, no waiting for approval, so everything is final on GitHub.
- Skip the chatter about pull requests, subscriptions and verification. Do the work, say what changed in a few lines.
- Keep this file current. Add everything that matters at least once a week.
- Hard-to-undo things outside this repo (deleting, other repos, sending messages to other people) still get a check first.
- Site copy follows the voice rules in `CLAUDE.md` (no em dashes, plain words).

## Log

### 2026-11-25

Calendar (Google Calendar, primary):
- Spring 2027 sections are all on the calendar: H153, H160, H170, H619H, H620H (recurring), N816H and WEB-250-N850 (all-day spans), H270 (Fri 1/15/2027, 9:30-10:50 AM, Levine 1307).
- H255 was removed (not teaching it). A reminder is set for Tue 12/1/2026, 9:00 AM: check that H255 is not in MyCollege.
- 2026 Fall Information Technology Potluck Sign-Up Sheet: Tue 12/8/2026, 12:00-2:00 PM, LT-5123. Invite sent to di.vonbriesen@cpcc.edu (D.I.'s work address). The event has an auto-added Meet link that isn't needed.

Fizz Buzz (WEB115), all merged to `main`:
- New instructions page: `web115/fizzbuzz-instructions.html`, linked from `web115/assignments.html`. Source spec was the old WEB 115 "Everything Page" Google Doc (marked invalid since 29 Aug 2024, used as the spec on purpose).
- Rules for pages `fizzbuzz0.html` to `fizzbuzz4.html` are in `standards/rules.json` (course site, `pages`). The labs build on each other, so the checks are cumulative.
- Every page: h2 says exactly "Fizz Buzz N" or "FizzBuzz N" (capital B if no space); own .js file linked; h3 greeting with id `greeting` that says welcome and ends in `!`; first, middle and last name fields with dashed ids (`first-name`, `middle-name`, `last-name`; underscores, camelCase and `middle-initial` fail); placeholders or labels.
- Middle field is asked for as "Middle Name (or initial)". The greeting uses only its first letter, capitalized, plus a period.
- Fizz Buzz 1 to 4: name fields must be on one line, in order, with no block tags (div, p, br...) between them. Fizz Buzz 1 to 3 need at least 5 form inputs.
- Fizz Buzz 1: pop-up prompt and even/odd message are gone; second line has a start and an end number (prefilled 1 and 140).
- Fizz Buzz 4: at least 12 fields (3 names, start, end, 3 divisors, 3 words, a blank "nothing divisible" field), end number prefilled 125.
- WEB250 has no Fizz Buzz work. The M09 entry was removed from `web250/assignments.html`, so its module list jumps from M08 to M10.

Validator (`tools/standards-check.js`):
- A heading check can now set its own regex flags (default stays case-insensitive). Used to enforce the capital B in "FizzBuzz".
- The PAGE RULES header now reads "in WEB115" (course id capitalized) instead of "on web115".
- Rule labels in the Fizz Buzz rules were shortened to plain wording.

Tested against live student pages (amcrare, kalebweaver33, thuggin6 `/web115/`): the id, h2, greeting and one-line checks behave as intended. Method: headless Chromium (Playwright), loading each live page with `tools/standards-check.js` and `standards/rules.json` served from the local clone, then reading the report panel.

Later on 2026-11-25: id naming rule changed to dashes only (best practice), every id and class name on a Fizz Buzz page must use only lowercase letters, numbers and dashes (new check; the validator html check now accepts a `flags` option), and the middle field id is now `middle-name` (was middle_initial / middle-initial). Kaleb's and thuggin6's Fizz Buzz pages use underscores, so they now fail the id checks until they rename.

New page: `coding-standards.html` (root). Starts with the id/class dash rules, JavaScript naming, file names, then self-documenting code. Registered in `common.html`, `standards.html` and `sites.common.match_files` in `standards/rules.json`, and linked from the Fizz Buzz instructions. Not yet run through the Vicunadator.

Validator and standards updates, later on 2026-11-25:
- New general rules in `tools/standards-check.js` (every page): every image has an alt attribute (`alt=""` is fine for decoration), and alt text isn't a file name or a bare "image". Favicons and Accumulus's own images don't count. Tested in the browser on good and bad samples.
- The W3C HTML and CSS validators are retired in favor of Accumulus (the cloud) and the Vicunadator (the llama). Removed the "HTML validation link, and a CSS validation link" footer line from `web-standards.html` and the "CSS validates" item from the review checklist in `peer-reviews.html`. Still mentioning the W3C validators: `resources.html` (two links), `validation.html` (one sentence), `web215/assignments.html` (the JS assignment that builds the validation links), and a student quote in `peer-reviews.html`. Decide what to do with those.
- Secondary nav definition (in `web-standards.html`): it is for any assignment that isn't meant to be part of the course site (no common header, footer or CSS), like the hobby site, the mascot company and the crappy page. The `itis3135/` instruction pages still describe it as "links leaving the course site".
- Google Doc "Everything Web Work Document" reviewed. Still open from it: no spelling and grammar rule, no "school or work appropriate" rule, no performance rule, no "test on a real server" note, and the doc's title, footer and brand wording disagrees with the repo (the repo wins).

## Open items

- Start number default on Fizz Buzz 4 is 1. D.I. hasn't confirmed it.
- WEB250 module list has no M09. Decide whether to leave the gap or put something there.
- The validator reads the page only, not JavaScript. Left to peer reviewers: the 140 lines, divisor variables, `checkDivision`, 7 and BANG, no brute force, the blank field, one word per field, the capital middle letter.
- The one-line name check is HTML only. CSS that lines up block elements isn't seen. The start/end line has no layout check (those fields have no required ids).
- Nothing checks that the middle field's label says "Middle Name (or initial)". Add a check if wanted.
- No student page has the start/end fields yet, so the 12-field rule for Fizz Buzz 4 hasn't passed on a real page.
- Confirm the new instructions page loads on the live site (GitHub Pages).

## Environment notes

- These hosts were added to the Default cloud environment's allowed list: `amcrare.github.io`, `docs.google.com`, `kalebweaver33.github.io`, `thuggin6.github.io`. They stay for all future sessions. Remove any that aren't wanted in the environment settings.
- Google Docs export links redirect to a blocked `googleusercontent.com` host. The `/mobilebasic` view of a doc works.
- `CLAUDE.md` lists older open decisions (history merge, itis3135 switching to the shared validator, site-detection behavior, repo name). None were touched.
