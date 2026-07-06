/* Standards self-check badge.
 *
 * Add to any page, linked from the course hub (do not copy it — a copy
 * goes stale as the standards evolve):
 *   <script src="https://divonbriesen.github.io/web123/scripts/standards-check.js" defer></script>
 *
 * A llama appears bottom-right: right-side up = all checks pass,
 * upside down = something failed. Click it for the full report.
 * Optional: <script ... data-mode="general"> to skip course-site rules
 * (mode is auto-detected from the h1 otherwise).
 */
(function () {
  "use strict";
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  const RULES_URL = SCRIPT_SRC
    ? SCRIPT_SRC.replace(/scripts\/standards-check\.js.*$/, "standards/rules.json")
    : "standards/rules.json";
  const BANNED_FONTS = ["times new roman", "comic sans", "papyrus"];
  const CREDIT_RE = /designed by|created by|a product of|brought to you by|production/i;
  const results = [];
  const add = (level, rule, detail) => results.push({ level, rule, detail: detail || "" });

  const short = (s) => (s && s.startsWith("data:") ? s.slice(0, 20) + "…" : (s || "").slice(0, 80));

  async function ok(url) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      return r.ok;
    } catch (e) { return false; }
  }

  async function getText(url) {
    try {
      const r = await fetch(url);
      return r.ok ? await r.text() : "";
    } catch (e) { return ""; }
  }

  function isLocal(u) {
    if (!u) return false;
    const low = u.toLowerCase();
    // slashes built by concat: some validators misread "//" in a string as a comment
    const ss = "/" + "/";
    const external = ["http:" + ss, "https:" + ss, ss, "data:", "mailto:", "#"];
    return !external.some(function (p) { return low.startsWith(p); });
  }

  async function runChecks() {
    const d = document;
    const h1 = d.querySelector("h1");
    const h1Text = h1 ? h1.textContent.trim() : "";
    // Self-aware mode detection: rules.json declares which directories are
    // course sites (match_dirs); a pattern guess would misfire on things
    // like web123 (the hub). data-mode still overrides.
    let rules = null;
    try { rules = await (await fetch(RULES_URL)).json(); } catch (e) { rules = null; }
    const SCRIPT_EL = d.querySelector('script[src*="standards-check"]');
    const scriptMode = SCRIPT_EL && SCRIPT_EL.dataset.mode;
    const matchDirs = (rules && rules.sites && rules.sites.course && rules.sites.course.match_dirs) || [];
    const lowPath = location.pathname.toLowerCase();
    const inCourseDir = matchDirs.some((dir) => lowPath.includes("/" + dir + "/"));
    const course = scriptMode === "course" || (!scriptMode && inCourseDir);

    add("INFO", "checking against",
      course ? "general plus course standards" : "general standards");
    add("PASS", "page loads");

    // ===== HEAD =====
    const icon = d.querySelector('link[rel~="icon"]');
    const FAV_RULE = "favicon present, resolves, in images/";
    if (!icon) add("FAIL", FAV_RULE, "no favicon link");
    else {
      const href = icon.getAttribute("href") || "";
      if (href.startsWith("data:")) add("PASS", FAV_RULE, short(href) + " (embedded — folder not required)");
      else if (!(await ok(href))) add("FAIL", FAV_RULE, short(href) + " doesn't resolve");
      else if (isLocal(href) && !href.includes("images/")) add("FAIL", FAV_RULE, short(href) + " not in images/");
      else add("PASS", FAV_RULE, short(href));
    }

    const title = d.title.trim();
    if (!title) add("FAIL", "title element present");
    else if (!/[|~•·—-]/.test(title)) add("FAIL", "title combines h1 (site name) + divider + h2 (page name)", "no divider: " + title);
    else add("PASS", "title has a divider", title);

    const sheets = [...d.querySelectorAll('link[rel~="stylesheet"]')].map((l) => l.getAttribute("href") || "");
    const localSheets = sheets.filter(isLocal);
    const embedded = [...d.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    const CSS_RULE = "stylesheets in styles/, first named default.css";
    if (!localSheets.length) {
      add("PASS", CSS_RULE, embedded.trim() ? "embedded styles only — folder/default.css not required" : "no stylesheets on this page");
    } else if (localSheets.some((s) => !s.includes("styles/")))
      add("FAIL", CSS_RULE, "outside styles/: " + localSheets.filter((s) => !s.includes("styles/")).join(", "));
    else if (!localSheets[0].endsWith("default.css"))
      add("FAIL", CSS_RULE, "first stylesheet is " + localSheets[0]);
    else add("PASS", CSS_RULE);

    let css = embedded;
    for (const s of localSheets) css += await getText(s);
    if (css) {
      const stacks = [...css.matchAll(/font-family\s*:([^;}]+)/gi)].map((m) => m[1]);
      const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "system-ui", "inherit", "initial", "unset", "revert"]);
      const primaries = new Set(
        stacks.map((s) => s.split(",")[0].trim().replace(/['"]/g, "").toLowerCase()).filter((f) => f && !generic.has(f))
      );
      add(primaries.size >= 2 ? "PASS" : "FAIL", "at least 2 fonts", [...primaries].sort().join(", ") || "none");
      const banned = [...primaries].filter((f) => BANNED_FONTS.some((b) => f.includes(b)));
      add(!banned.length ? "PASS" : "FAIL", "no banned fonts (as the primary choice)", banned.join(", "));
      add(/(^|[^-\w])a\s*[,{:]|a:link|a:visited/.test(css) ? "PASS" : "FAIL", "link colors overridden (no blue/purple/green/red; visited matches normal)", /(^|[^-\w])a\s*[,{:]|a:link|a:visited/.test(css) ? "" : "no `a` selector in CSS");
      const bw = [...css.matchAll(/:\s*(#000000|#000|#ffffff|#fff|black|white)\s*[;}]/gi)].map((m) => m[1]);
      const cssComments = /\/\*[\s\S]*?\S[\s\S]*?\*\//.test(css);
      if (!bw.length) add("PASS", "no black/white without a reason (CSS comment)");
      else if (cssComments) add("PASS", "no black/white without a reason (CSS comment)", [...new Set(bw)].join(", ") + " — commented");
      else add("FAIL", "no black/white without a reason (CSS comment)", [...new Set(bw)].join(", ") + " — no CSS comments found");
    } else add("FAIL", "page has CSS (linked or embedded)", "no CSS found at all");

    const scripts = [...d.querySelectorAll("script[src]")].map((s) => s.getAttribute("src") || "");
    const localScripts = scripts.filter(isLocal);
    if (!localScripts.length) add("PASS", "scripts in scripts/", "no local scripts on this page");
    else if (localScripts.every((s) => s.includes("scripts/"))) add("PASS", "scripts in scripts/");
    else add("FAIL", "scripts in scripts/", localScripts.filter((s) => !s.includes("scripts/")).join(", "));

    const headScripts = [...d.head.querySelectorAll("script")];
    if (!scripts.some((s) => s.includes("lint.page"))) add("FAIL", "validation script (lint.page) present");
    else {
      const last = headScripts[headScripts.length - 1];
      add(last && (last.src || "").includes("lint.page") ? "PASS" : "FAIL",
        "validation script is last line of head");
    }

    // ===== BODY =====
    const HDR_RULE = "header starts with h1 (site name)";
    const headerEl = d.querySelector("header");
    const h1s = d.querySelectorAll("h1");
    const firstSig = (el, skip) => {
      for (const c of el.querySelectorAll("*")) {
        if (!skip.includes(c.tagName.toLowerCase())) return c.tagName.toLowerCase();
      }
      return null;
    };
    if (!headerEl) add("FAIL", HDR_RULE, "no <header>");
    else if (h1s.length !== 1) add("FAIL", HDR_RULE, "found " + h1s.length + " h1s");
    else {
      const f = firstSig(headerEl, ["hgroup", "div"]);
      if ([null, "h1", "p", "img", "picture"].includes(f)) add("PASS", HDR_RULE, h1Text);
      else add("FAIL", HDR_RULE, "h1 present but <" + f + "> comes first");
    }
    if (course && h1Text) {
      const good = /['’]s\s+\S+/.test(h1Text) && /[A-Z]{2,}\d{3,}[A-Z0-9]*\s*$/.test(h1Text);
      add(good ? "PASS" : "FAIL", "site name = Name's Mascot <divider> COURSEID", good ? "" : h1Text);
    }
    if (title && h1Text) {
      const site = h1Text.toLowerCase();
      add(title.toLowerCase().startsWith(site.slice(0, Math.max(8, site.length / 2))) ? "PASS" : "FAIL",
        "title combines h1 (site name) + divider + h2 (page name)");
    }

    const anchors = [...d.querySelectorAll("a[href]")];
    const internal = anchors.map((a) => a.getAttribute("href")).filter(isLocal);
    if (internal.length >= 2) {
      const nav = d.querySelector("nav");
      if (!nav) add("FAIL", "2+ related links are in a <nav>", internal.length + " internal links, no nav");
      else {
        const main = d.querySelector("main");
        const inHeader = !!d.querySelector("header nav");
        const beforeMain = main ? nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING : true;
        add(inHeader || beforeMain ? "PASS" : "FAIL", "nav in header (between header and main ok if floating to the side)", inHeader || beforeMain ? "" : "nav found after main starts");
      }
    } else add("PASS", "2+ related links are in a <nav>", "fewer than 2 internal links");

    const MAIN_RULE = "main present, starting with h2 as the page name";
    const mainEl = d.querySelector("main");
    const h2s = d.querySelectorAll("h2");
    if (!mainEl) add("FAIL", MAIN_RULE, "no <main>");
    else if (h2s.length === 1) {
      const f = firstSig(mainEl, ["div", "section", "article"]);
      if ([null, "h2", "img", "picture"].includes(f)) add("PASS", MAIN_RULE, h2s[0].textContent.trim());
      else add("FAIL", MAIN_RULE, "h2 present but <" + f + "> comes first");
    }
    else if (!h2s.length) add("FAIL", MAIN_RULE, "main has no h2");
    else add("INFO", MAIN_RULE, "found " + h2s.length + " h2s — fine for an SPA if each h2 is a page name");

    // The favicon never counts as the page image, however it's included.
    const favHref = icon ? icon.getAttribute("href") || "" : "";
    const imgs = [...d.querySelectorAll("img")].map((i) => i.getAttribute("src") || "")
      .filter((s) => s !== favHref && !s.toLowerCase().includes("favicon")
        && !s.includes("lint.page")); // Accumulus injects its own imgs — not the student's
    if (!imgs.length && !d.querySelector("svg")) add("FAIL", "at least one image (favicon doesn't count)");
    else add("PASS", "at least one image (favicon doesn't count)", imgs.slice(0, 3).map(short).join(", ") || "inline svg");
    const localImgs = imgs.filter(isLocal);
    if (localImgs.length) {
      const bad = localImgs.filter((i) => !i.includes("images/"));
      add(!bad.length ? "PASS" : "FAIL", "images in images/", bad.map(short).join(", "));
    }

    // comments justify divs/spans, classes/ids, inline styles
    let comments = 0;
    const tw = d.createTreeWalker(d.documentElement, NodeFilter.SHOW_COMMENT);
    while (tw.nextNode()) if (tw.currentNode.data.trim()) comments++;
    const badge = d.getElementById("standards-check-badge");
    const divSpan = [...d.querySelectorAll("div,span")]
      .filter((el) => !el.dataset.include && !(badge && badge.contains(el)) && el !== badge).length;
    const classId = [...d.querySelectorAll("[class],[id]")]
      .filter((el) => !(badge && badge.contains(el)) && el !== badge).length;
    const inline = [...d.querySelectorAll("[style]")]
      .filter((el) => !(badge && badge.contains(el)) && el !== badge).length;
    add(!divSpan || comments ? "PASS" : "FAIL", "divs/spans explained in comments",
      divSpan ? divSpan + " used" + (comments ? "" : ", no comments found") : "none used");
    add(!classId || comments ? "PASS" : "FAIL", "classes/ids explained in comments",
      classId ? classId + " used" + (comments ? "" : ", no comments found") : "none used");
    if (!inline) add("PASS", "inline styles (2 or fewer, explained in comments)", "0");
    else if (inline <= 2) add(comments ? "PASS" : "FAIL", "inline styles (2 or fewer, explained in comments)",
      inline + (comments ? "" : ", no comments found"));
    else add("FAIL", "inline styles (2 or fewer, explained in comments)", inline + " found");

    // hrefs must contain only the link — no adjacent spaces
    const padded = anchors.map((a) => a.getAttribute("href") || "")
      .filter((h) => h !== h.trim()).map((h) => h.trim());
    add(!padded.length ? "PASS" : "FAIL",
      "hrefs contain only the link (no adjacent spaces)", padded.slice(0, 5).join(", "));

    // dividers need a space on both sides, everywhere on the page
    const bodyClone = d.body.cloneNode(true);
    bodyClone.querySelectorAll("script,style,pre,code,#standards-check-badge").forEach((el) => el.remove());
    const bodyText = bodyClone.textContent || "";
    const tight = [...new Set(
      (bodyText.match(/\S[|•·~]|[|•·~]\S/g) || []).filter((t) => !t.includes("/"))
    )].slice(0, 5);
    add(!tight.length ? "PASS" : "FAIL",
      "dividers have a space on both sides", tight.map((t) => JSON.stringify(t)).join(", "));

    // Relative links may open new tabs only when they point into another directory.
    const badBlank = anchors.filter((a) => {
      const h = a.getAttribute("href") || "";
      const path = h.split("#")[0].split("?")[0].replace(/\/+$/, "");
      return a.target === "_blank" && isLocal(h) && !path.includes("/");
    });
    add(!badBlank.length ? "PASS" : "FAIL", "relative links must not open new tabs (other directories ok)",
      badBlank.map((a) => a.getAttribute("href")).slice(0, 5).join(", "));

    const crap = internal.filter((h) => course && (h.startsWith("stuff/") || h.includes("/stuff/")));
    const ugly = [];
    for (const h of internal) {
      if (crap.includes(h)) continue;
      const path = h.split("#")[0].split("?")[0];
      if (/[A-Z ]/.test(path.trim())) ugly.push(h.trim());
      else if (path !== path.trim()) ugly.push(h.trim() + " (space in link href)");
    }
    add(!ugly.length ? "PASS" : "FAIL", "internal filenames lowercase, no spaces", ugly.slice(0, 5).join(", "));
    if (crap.length) add("INFO", "stuff/ links exempt from filename rules", crap.slice(0, 3).join(", "));

    const broken = [];
    for (const h of [...new Set(internal)].slice(0, 20)) {
      if (!(await ok(h))) broken.push(h);
    }
    add(!broken.length ? "PASS" : "FAIL", "internal links resolve", broken.slice(0, 6).join(", "));

    // ===== FOOTER =====
    const footer = d.querySelector("footer");
    add(footer ? "PASS" : "FAIL", "<footer> present");
    if (footer) {
      const footHtml = footer.innerHTML;
      if (course) {
        add(CREDIT_RE.test(footer.textContent) ? "PASS" : "FAIL", "footer has designer credit");
        add(/certified in/i.test(footer.textContent) ? "PASS" : "FAIL", "footer 'Certified in ...' line");
      }
      const header = d.querySelector("header");
      const chrome = (header ? header.innerHTML : "") + footHtml;
      const chromeText = (header ? header.textContent : "") + footer.textContent;
      const hasTagline = /<em|<i[\s>]/.test(chrome) || /["“][^"”]{4,}["”]/.test(chromeText);
      add(hasTagline ? "PASS" : "FAIL", "tagline in italics or quotes (header or footer)");
    }

    // ===== Layer-3 page rules from rules.json (single source of truth) =====
    if (course) {
      const siteRules = rules && rules.sites && rules.sites.course;
      if (siteRules) {
        let page = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
        if (!/\.html?$/.test(page)) page = "index.html";
        const docText = d.body ? d.body.textContent : "";
        const docHtml = d.documentElement.outerHTML;
        const applyChecks = (checks) => {
          for (const c of checks || []) {
            const rule = c.rule || "rule";
            const want = c.present !== false;
            try {
              if (c.type === "element") {
                const sel = c.within ? c.within + " " + c.tag : c.tag;
                const n = d.querySelectorAll(sel).length;
                const okc = n >= (c.min || 1);
                add(okc ? "PASS" : "FAIL", rule, okc ? "" : "found " + n);
              } else if (c.type === "text" || c.type === "html") {
                const hay = c.type === "text" ? docText : docHtml;
                const found = new RegExp(c.pattern, "i").test(hay);
                const okc = found === want;
                add(okc ? "PASS" : "FAIL", rule, okc ? "" : (want ? "missing" : "found — remove it"));
              } else if (c.type === "text_all" || c.type === "html_all") {
                const hay = c.type === "text_all" ? docText : docHtml;
                const missing = (c.patterns || []).filter((p2) => !new RegExp(p2, "i").test(hay));
                add(!missing.length ? "PASS" : "FAIL", rule,
                  missing.length ? "missing: " + missing.slice(0, 4).join(", ") : "");
              } else if (c.type === "heading") {
                const sel = c.level ? "h" + c.level : "h1,h2,h3,h4,h5,h6";
                const heads = [...d.querySelectorAll(sel)].map((h) => h.textContent.trim());
                const found = heads.some((h) => new RegExp(c.pattern, "i").test(h));
                const okc = found === want;
                add(okc ? "PASS" : "FAIL", rule, okc ? "" : (want ? "missing" : "found — remove it"));
              } else if (c.type === "css") {
                const found = new RegExp(c.pattern, "i").test(css);
                const okc = found === want;
                add(okc ? "PASS" : "FAIL", rule, okc ? "" : "not found in CSS");
              }
            } catch (e) { add("INFO", rule, "rule error: " + e.message); }
          }
        };
        applyChecks(siteRules.site_checks);
        const pageRules = siteRules.pages && siteRules.pages[page];
        if (pageRules) {
          add("INFO", "page rules", page);
          applyChecks(pageRules.checks);
        }
      }
    }
    return results;
  }

  function showBadge(res) {
    const fails = res.filter((r) => r.level === "FAIL").length;
    if (fails) {
      const pulse = document.createElement("style");
      pulse.textContent =
        "@keyframes vicunadator-pulse{" +
        "0%,100%{box-shadow:0 0 6px 3px rgba(220,30,30,.35)}" +
        "50%{box-shadow:0 0 16px 9px rgba(220,30,30,.75)}}";
      document.head.appendChild(pulse);
    }
    const badge = document.createElement("div");
    badge.id = "standards-check-badge";
    badge.style.cssText =
      "position:fixed;bottom:36px;right:36px;z-index:9999;cursor:pointer;" +
      "font-size:34px;line-height:1;user-select:none;border-radius:50%;padding:4px;" +
      (fails
        ? "transform:rotate(180deg);background:rgba(255,220,220,.9);" +
          "animation:vicunadator-pulse 1.6s ease-in-out infinite;"
        : "background:rgba(225,245,225,.9);" +
          "box-shadow:0 0 12px 6px rgba(40,170,60,.55);");
    badge.textContent = "🦙";
    badge.title = fails ? fails + " standards check(s) failing — click for details" : "All standards checks pass — click for details";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;bottom:86px;right:36px;z-index:9999;display:none;" +
      "max-height:70vh;max-width:480px;overflow:auto;background:#fff;color:#222;" +
      "border:2px solid #444;border-radius:10px;padding:10px 14px;" +
      "font:12px/1.5 monospace;box-shadow:0 6px 18px rgba(0,0,0,.3);text-align:left;";
    const icons = { PASS: "✅", FAIL: "❌", WARN: "⚠️", INFO: "ℹ️" };
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const closeX = '<span data-vicuna-close style="position:sticky;top:0;float:right;' +
      'cursor:pointer;font:bold 14px/1 sans-serif;color:#666;padding:0 2px;">&#10005;</span>';
    panel.innerHTML = closeX + res
      .map((r) => icons[r.level] + " " + esc(r.rule) + (r.detail ? ": " + esc(r.detail) : ""))
      .join("<br>") +
      "<br><br><strong>" + res.filter((r) => r.level === "PASS").length + " pass, " + fails + " fail</strong>";
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    panel.addEventListener("click", (e) => {
      if (e.target.hasAttribute && e.target.hasAttribute("data-vicuna-close")) {
        panel.style.display = "none";
      }
      e.stopPropagation();
    });
    document.addEventListener("click", () => {
      panel.style.display = "none";
    });
    document.body.appendChild(badge);
    document.body.appendChild(panel);
  }

  // Give include-loaders a moment to inject header/footer before checking.
  window.addEventListener("load", () => setTimeout(() => runChecks().then(showBadge), 600));
})();
