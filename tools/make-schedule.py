#!/usr/bin/env python3
"""Regenerate schedule.html from the two academic calendars.

Weeks run Monday-Sunday. A week that carries class meetings gets a number; a
week with none gets a letter code instead and doesn't consume a number, so
week numbers stay in step with module numbers.

The character between the two dates flags what interrupts that week, and the
legend under each block spells it out. Output is monospace and column-aligned
so it survives a copy and paste into Canvas or a syllabus.

Edit TERMS when the calendars come out, then run:
    python3 tools/make-schedule.py
"""
import datetime as dt
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "D.I. von Briesen's Dapper Innovative Vicuña Buck"

TERMS = [
    dict(
        name="Fall 2026", school="Central Piedmont",
        first_class=dt.date(2026, 8, 17),
        term_end=dt.date(2026, 12, 15),
        marks=[
            (dt.date(2026, 9, 7), "*"),
            (dt.date(2026, 11, 26), "^"),
            (dt.date(2026, 12, 15), "x"),
        ],
        break_weeks={dt.date(2026, 10, 12): ("FB", "+")},
        legend=[
            "*Labor & PD Days (Mon-Tue)",
            "+Fall Break (Mon-Fri)",
            "^Thanksgiving (Thu-Sun)",
            "xEnd of Term (Tuesday 12/15)",
        ],
    ),
    dict(
        name="Spring 2027", school="Central Piedmont",
        first_class=dt.date(2027, 1, 11),
        term_end=dt.date(2027, 5, 11),
        marks=[
            (dt.date(2027, 1, 18), "*"),
            (dt.date(2027, 3, 26), "^"),
            (dt.date(2027, 5, 11), "x"),
        ],
        break_weeks={dt.date(2027, 3, 8): ("SB", "+")},
        legend=[
            "*MLK & PD Days (Mon-Tue)",
            "+Spring Break (Mon-Sun)",
            "^Spring Holiday (Fri-Sun)",
            "xEnd of Term (Tuesday 5/11)",
        ],
    ),
    dict(
        name="Fall 2026", school="Charlotte",
        first_class=dt.date(2026, 8, 17),
        term_end=dt.date(2026, 12, 10),
        marks=[
            (dt.date(2026, 9, 7), "*"),
            (dt.date(2026, 10, 12), "+"),
            (dt.date(2026, 11, 25), "^"),
            (dt.date(2026, 12, 2), "x"),
        ],
        exam_from=dt.date(2026, 12, 7),
        legend=[
            "*Labor Day (Mon)",
            "+Student Recess (Mon-Tue)",
            "^Thanksgiving (Wed-Sat)",
            "xLast Class 12/2, Reading Day 12/3, Exams begin 12/4",
            "=Exams only, through Thursday 12/10",
        ],
    ),
    dict(
        name="Spring 2027", school="Charlotte",
        first_class=dt.date(2027, 1, 11),
        term_end=dt.date(2027, 5, 6),
        marks=[
            (dt.date(2027, 1, 18), "*"),
            (dt.date(2027, 4, 9), "^"),
            (dt.date(2027, 4, 28), "x"),
        ],
        break_weeks={dt.date(2027, 3, 8): ("SR", "+")},
        exam_from=dt.date(2027, 5, 3),
        legend=[
            "*MLK Day (Mon)",
            "+Student Spring Recess (Mon-Sat)",
            "^Refresh Weekend (Fri-Sat)",
            "xLast Class 4/28, Reading Day 4/29, Exams begin 4/30",
            "=Exams only, through Thursday 5/6",
        ],
    ),
]


def fmt(d):
    return f"{d.day:02d}{d.strftime('%b')}"


def block(term):
    monday = term["first_class"] - dt.timedelta(days=term["first_class"].weekday())
    lines, n, d = [], 0, monday
    while d <= term["term_end"]:
        end = min(d + dt.timedelta(days=6), term["term_end"])
        sep = "-"
        for when, ch in term["marks"]:
            if d <= when <= end:
                sep = ch
        code = None
        for start, (label, ch) in term.get("break_weeks", {}).items():
            if d <= start <= end:
                code, sep = label, ch
        if code is None and term.get("exam_from") and d >= term["exam_from"]:
            code, sep = "EX", "="
        if code is None:
            n += 1
            code = f"{n:02d}"
        lines.append(f"{code}) {fmt(d)} {sep} {fmt(end)}")
        d += dt.timedelta(days=7)
    return lines, n


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def term_html(term):
    lines, weeks = block(term)
    body = ["SCHEDULE", "Week/Module #", "(Monday - Sunday)", ""]
    body += lines
    body += [""] + term["legend"]
    return (f'      <h3>{esc(term["school"])} &bull; {esc(term["name"])}</h3>\n'
            f'      <pre>{esc(chr(10).join(body))}</pre>'), weeks


PAGE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{site} | Teaching | Schedule</title>
    <link rel="stylesheet" href="styles/default.css" />
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg" />
    <script
      src="https://lint.page/kit/4d0fe3.js"
      crossorigin="anonymous"
    ></script>
  </head>
  <body>
    <!-- classes below are styling hooks with no semantic element available:
         site-header/site-footer match the shared stylesheet's landmark rules,
         home-logo and home-logo-end size the two facing vicuñas, note boxes a
         rule or caveat, and mirrored flips the second camel so the pair faces
         inward -->
    <header class="site-header">
      <h1>
        <a href="index.html" class="home-logo"
          ><img
            src="images/vicuna.svg"
            alt="Camelid Software vicuña logo — home"
            width="40"
            height="40"
        /></a>
        {site} | Teaching
        <img
          class="home-logo-end"
          src="images/vicuna.svg"
          alt=""
          width="40"
          height="40"
        />
      </h1>
      <p class="tagline"><em>Schedule — week numbers for 2026&ndash;27</em></p>
      <nav aria-label="Teaching">
        <a href="index.html">Home</a>
        <a href="about.html">About DI</a>
        <a href="faq.html">FAQ</a>
        <a href="schedule.html">Schedule</a>
        <a href="ai-policy.html">AI Policy</a>
        <a href="grading.html">Grading</a>
        <a href="standards.html">Standards</a>
        <a href="resources.html">Resources</a>
      </nav>
      <nav aria-label="Courses">
        <a href="cis110/">CIS110</a>
        <a href="web115/">WEB115</a>
        <a href="web215/">WEB215</a>
        <a href="web250/">WEB250</a>
        <a href="itsc1110/">ITSC1110</a>
        <a href="itis3135/">ITIS3135</a>
      </nav>
    </header>

    <main>
      <h2>Schedule</h2>

      <p>
        Module numbers on my assignments refer to these week numbers. Week 01
        is the first week carrying class meetings, weeks run Monday through
        Sunday, and a week with no meetings takes a letter code instead of a
        number so the numbering keeps pace with the modules. Copy any block
        below straight into a syllabus; the columns hold their alignment.
      </p>

      <p>
        Week and module usually mean the same thing. In a short or summer
        session, where a sixteen-week course runs in eight, each week carries
        <strong>two</strong> modules — so whatever a week holds in a normal
        session, you do twice as much of it, including journals and peer
        reviews.
      </p>

      <blockquote class="note">
        <p>
          Your LMS still owns the due dates. This page tells you which week
          a module lands
          in; the LMS tells you the hour it's due, and the LMS wins whenever
          the two disagree.
        </p>
      </blockquote>

      <p>
        Central Piedmont runs CIS110, WEB115, WEB215, and WEB250. Charlotte
        runs ITSC1110 and ITIS3135. The two calendars differ, so read the one
        matching your course.
      </p>

{terms}
    </main>

    <footer class="site-footer">
      <p>
        <em
          >If you keep on doin' what you've been doin' yer gonna keep on
          gettin' what you've been gettin!</em
        >
      </p>
      <p>
        <span class="mirrored">&#128042;</span> This site is a Camelid Software
        Production, who'd-wanna-copy-this 2026 &#128043;
      </p>
    </footer>
    <script src="tools/standards-check.js" defer data-mode="general"></script>
  </body>
</html>
"""

parts, summary = [], []
for t in TERMS:
    html, weeks = term_html(t)
    parts.append(html)
    summary.append(f"  {t['school']:18} {t['name']:12} {weeks} numbered weeks")

(ROOT / "schedule.html").write_text(
    PAGE.format(site=SITE, terms="\n\n".join(parts)), encoding="utf-8")
print("wrote schedule.html")
print("\n".join(summary))
