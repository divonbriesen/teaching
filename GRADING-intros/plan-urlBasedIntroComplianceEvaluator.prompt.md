## Plan: URL-Based Intro Compliance Evaluator

Build a standalone JavaScript file in this workspace that prompts the user for a URL, fetches and parses the page content, evaluates each student introduction against the rules in shared_introductions_instructions.html, and prints a bulleted compliance report of names plus unmet requirements. Include the user’s full request text as a top-of-file comment so the script is self-documenting.

CIS110 Summer 2026 URL TO evaluate: https://docs.google.com/document/d/18ROGelDIEQM8NfgNVzM_GlQjeqTNKl7W8owjBrdmyn8/edit?pli=1&tab=t.0

Published link: https://docs.google.com/document/d/e/2PACX-1vSSY7BzQrZtErlo2hgReTtLYP_TjLSxiRvj7Vih0ujHdmliZ31E16ZfWpaXd6sUdAVd3sANBoXenMc2/pub

ITIS3135 Fall 2026 URL TO evaluate: https://docs.google.com/document/d/1J4rb36h952JLNQSSt_lS-ze3CWRETwzMWe-wtmi1C7U/edit?tab=t.0

Published link: https://docs.google.com/document/d/e/2PACX-1vRJVn0RQegqA83z3kcO51LZdABpNQBq7Ftx-7pPiaoWaAggll9LrcMYVBtGwqIT_zresa-m0CmjYibR/pub
**Steps**

1. Confirm source requirements and map each requirement to a machine-checkable rule from shared_introductions_instructions.html, with explicit handling for optional fields (Funny/Interesting Item and I’d Also Like to Share).
2. Create a new evaluator script in GRADING-intros/ named evaluate-introductions.js using existing project conventions (kebab-case filename, async/await, try/catch, reusable helper functions).
3. Add the requested top comment containing the exact prompt text from the user request. This is required scope.
4. Implement URL collection via browser prompt() and guardrails for empty/cancelled input. If invalid/missing URL, show a clear message and stop.
5. Implement document retrieval and parsing:

- Fetch the provided URL.
- Parse as HTML with DOMParser.
- Identify each intro block by Heading 2 entries and/or surrounding section structure.

6. Implement per-intro validation helpers, each returning pass/fail details:

- Heading 2 name format check: Last, First Middle Initial.
- Public acknowledgment sentence presence with initials + date + italics indicator.
- Display name line format and not using heading element.
- Photo presence plus italic caption below.
- Personal statement minimum sentence count (>=3).
- Required bulleted categories with bold label checks.
- Nested course bullets under Courses I’m Taking, & Why.
- Quote presence plus attribution.
- Spacing rule check (one blank line before quote; otherwise no extra blank lines) as best-effort textual heuristic.

7. Aggregate results into required output shape:

- Bulleted list of each detected person name.
- Under each name, list issues that violate requirements.
- If no issues, show compliant status explicitly.

8. Provide output rendering:

- Primary output to console for detailed review.
- Secondary output as readable text block for easy copy/paste.

9. Add usage note at end-of-file comment describing where to run (browser context on same-origin/CORS-accessible URL) and expected limitations.

**Relevant files**

- /Users/d.i.vonbriesen/Documents/!WebWork/teaching/web123/shared_introductions_instructions.html — source of compliance rules to encode.
- /Users/d.i.vonbriesen/Documents/!WebWork/teaching/web123/scripts/include-repeated-code.js — style/pattern reference for async helpers and error handling.
- /Users/d.i.vonbriesen/Documents/!WebWork/teaching/web123/GRADING-intros/evaluate-introductions.js — new file to create for the evaluator.

**Verification**

1. Static check: confirm top comment includes the exact user prompt text.
2. Functional check with a valid sample URL containing multiple intros: verify prompt appears, fetch succeeds, names are discovered, and issue lists are generated.
3. Edge-case checks:

- Cancel prompt or empty URL.
- Unreachable URL/network error.
- Page with zero identifiable intros.
- One fully compliant intro and one intentionally non-compliant intro.

4. Rule coverage check: verify each requirement from shared_introductions_instructions.html maps to at least one validator in the script.

**Decisions**

- Runtime target: browser JavaScript (because user explicitly asked to prompt for URL).
- Output format: bullet-style textual report with per-person issue list.
- Optional sections are not treated as failures if omitted.
- Spacing-rule validation is heuristic because rendered HTML may normalize whitespace.

**Further Considerations**

1. If strict grading is desired, add a weighted scoring model after baseline pass/fail checks.
2. If cross-origin URLs are common, provide a local fetch proxy fallback in a future enhancement.
3. If intros differ structurally by section template, add configurable selectors near the top of the script.
