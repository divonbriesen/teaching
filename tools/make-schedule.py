#!/usr/bin/env python3
"""Regenerate schedule.html from the academic calendars.

Weeks run Monday–Sunday. Instructional weeks get a number; a week with no
class meetings at all gets a letter code instead and does not consume a
number. The separator character between the two dates flags what interrupts
that week, matching the convention students already know:

    -  an ordinary week
    *  a holiday closing (Labor Day, MLK Day)
    +  a recess of one or more days
    ^  Thanksgiving, or a no-class weekend
    x  classes end this week
    =  final examinations only

Edit TERMS below when the calendars come out, then run:  python3 tools/make-schedule.py
"""
import datetime as dt
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "D.I. von Briesen's Dapper Innovative Vicuña Buck"

# (start, end) are the first and last dates the term touches, including exams.
# events maps a date to (separator, note). A note on a week with no classes
# also supplies the letter code via code=.
TERMS = [
    dict(
        name="Fall 2026",
        school="UNC Charlotte",
        source="https://registrar.charlotte.edu/calendar-schedules/",
        first_class=dt.date(2026, 8, 17),
        last_class=dt.date(2026, 12, 2),
        term_end=dt.date(2026, 12, 10),
        marks=[
            (dt.date(2026, 9, 7), "*", "Labor Day — university closed (Mon)"),
            (dt.date(2026, 10, 12), "+", "Student Recess (Mon–Tue)"),
            (dt.date(2026, 11, 25), "^", "Thanksgiving — no classes (Wed–Sat)"),
            (dt.date(2026, 12, 2), "x", "Last day of classes (Wed) • Reading Day (Thu) • exams begin (Fri)"),
            (dt.date(2026, 12, 7), "=", "Final examinations, through Thu 10 Dec"),
        ],
        exam_only_from=dt.date(2026, 12, 7),
    ),
    dict(
        name="Spring 2027",
        school="UNC Charlotte",
        source="https://registrar.charlotte.edu/calendar-schedules/",
        first_class=dt.date(2027, 1, 11),
        last_class=dt.date(2027, 4, 28),
        term_end=dt.date(2027, 5, 6),
        marks=[
            (dt.date(2027, 1, 18), "*", "Dr. Martin Luther King Jr. Day — university closed (Mon)"),
            (dt.date(2027, 3, 8), "+", "Student Spring Recess (Mon–Sat) — no classes all week"),
            (dt.date(2027, 4, 9), "^", "Refresh Weekend — no classes (Fri–Sat)"),
            (dt.date(2027, 4, 28), "x", "Last day of classes (Wed) • Reading Day (Thu) • exams begin (Fri)"),
            (dt.date(2027, 5, 3), "=", "Final examinations, through Thu 6 May"),
        ],
        exam_only_from=dt.date(2027, 5, 3),
        no_class_weeks=[dt.date(2027, 3, 8)],
        no_class_code="SR",
    ),
]

LEGEND = [
    ("-", "an ordinary week"),
    ("*", "a holiday closing"),
    ("+", "a recess of one or more days"),
    ("^", "Thanksgiving, or a no-class weekend"),
    ("x", "classes end this week"),
    ("=", "final examinations only"),
]


def fmt(d):
    return f"{d.day:02d}{d.strftime('%b')}"


def build(term):
    start = term["first_class"] - dt.timedelta(days=term["first_class"].weekday())
    rows, n = [], 0
    d = start
    while d <= term["term_end"]:
        end = min(d + dt.timedelta(days=6), term["term_end"])
        sep, notes = "-", []
        for when, ch, text in term["marks"]:
            if d <= when <= end:
                sep = ch
                notes.append(text)
        exam_only = term.get("exam_only_from") and d >= term["exam_only_from"]
        no_class = any(d <= w <= end for w in term.get("no_class_weeks", []))
        if exam_only:
            code = "EX"
        elif no_class:
            code = term.get("no_class_code", "BR")
        else:
            n += 1
            code = f"{n:02d}"
        rows.append((code, fmt(d), sep, fmt(end), " • ".join(notes)))
        d += dt.timedelta(days=7)
    return rows


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def term_html(term):
    rows = build(term)
    out = [f'      <h3>{esc(term["name"])} — {esc(term["school"])}</h3>',
           '      <table>',
           f'        <caption>Weeks run Monday through Sunday. Dates from the '
           f'<a href="{term["source"]}">{esc(term["school"])} academic calendar</a>.</caption>',
           '        <thead>',
           '          <tr><th scope="col">Week</th><th scope="col">Dates</th>'
           '<th scope="col">What is different</th></tr>',
           '        </thead>',
           '        <tbody>']
    for code, a, sep, b, note in rows:
        out.append(f'          <tr><th scope="row">{code}</th>'
                   f'<td class="dates">{a} {esc(sep)} {b}</td>'
                   f'<td>{esc(note)}</td></tr>')
    out += ['        </tbody>', '      </table>']
    return "\n".join(out)


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
         rule or caveat, dates keeps a week's date range on one line, and
         mirrored flips the second camel so the pair faces
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
      <nav aria-label="Primary">
        <a href="index.html">Home</a>
        <a href="about.html">About DI</a>
        <a href="philosophy.html">Philosophy</a>
        <a href="schedule.html">Schedule</a>
        <a href="ai-policy.html">AI Policy</a>
        <a href="recommendations.html">Recommendations</a>
        <a href="course-standards.html">Course Standards</a>
        <a href="web-standards.html">Web Standards</a>
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
        is the first week that carries class meetings, weeks run Monday
        through Sunday, and a week with no meetings at all takes a letter code
        instead of a number so the numbering keeps pace with the modules.
      </p>

      <blockquote class="note">
        <p>
          Canvas still owns the due dates. This page tells you which week a
          module lands in; Canvas tells you the hour it is due, and Canvas
          wins whenever the two disagree.
        </p>
      </blockquote>

{terms}

      <h3>Reading the separator</h3>
      <ul>
{legend}      </ul>
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

terms = "\n\n".join(term_html(t) for t in TERMS)
legend = "".join(f"        <li><strong>{esc(ch)}</strong> — {text}</li>\n"
                 for ch, text in LEGEND)
(ROOT / "schedule.html").write_text(
    PAGE.format(site=SITE, terms=terms, legend=legend), encoding="utf-8")
print("wrote schedule.html")
for t in TERMS:
    rows = build(t)
    print(f"  {t['name']}: {sum(1 for r in rows if r[0].isdigit())} numbered weeks, "
          f"{len(rows)} rows")
