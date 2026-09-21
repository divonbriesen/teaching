/* Standards self-check badge.
 *
 * Add to any page, linked from the teaching hub (do not copy it — a copy
 * goes stale as the standards evolve):
 *   <script src="https://divonbriesen.github.io/teaching/tools/standards-check.js" defer></script>
 *
 * This is the actively maintained copy (moved here from web123 during the
 * multi-course monorepo transition). A frozen copy stays at
 * web123/scripts/standards-check.js for backward compatibility with pages
 * that still link there — do not delete that file.
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
    ? SCRIPT_SRC.replace(/[^/]+\/standards-check\.js.*$/, "standards/rules.json")
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
    // a full URL on this page's own origin is still local — the 404 page and
    // footer site links legitimately use absolute URLs to their own home
    if (low.startsWith(location.origin.toLowerCase() + "/")) return true;
    // slashes built by concat: some validators misread "//" in a string as a comment
    const ss = "/" + "/";
    const external = ["http:" + ss, "https:" + ss, ss, "data:", "mailto:", "#"];
    return !external.some(function (p) { return low.startsWith(p); });
  }

  // Which declared site (rules.json's sites map) does a path belong to?
  // Pulled out of the current-page mode detection so the same logic can
  // classify an arbitrary link's target, not just location.pathname — that's
  // what lets us tell "crosses into a different site" from "same site,
  // different directory" for the relative-links and new-tab rules below.
  function classifySite(pathname, host, rules) {
    if (!rules || !rules.sites) return null;
    const lowPath = pathname.toLowerCase();
    let site = null;
    let bestPos = -1;
    // deepest match wins so hobby/ inside itis3135/ resolves to hobby
    for (const [name, s] of Object.entries(rules.sites)) {
      for (const dir of s.match_dirs || []) {
        const pos = lowPath.lastIndexOf("/" + dir + "/");
        if (pos > bestPos) { bestPos = pos; site = name; }
      }
      if (s.match_pattern) {
        const m = lowPath.match(new RegExp(s.match_pattern, "g"));
        if (m) {
          const pos = lowPath.lastIndexOf(m[m.length - 1]);
          if (pos > bestPos) { bestPos = pos; site = name; }
        }
      }
    }
    if (!site && rules.sites.personal) {
      const depth = lowPath.split("/").filter((s) => s && !/\.html?$/.test(s)).length;
      if ((host.includes("webpages.charlotte.edu") && depth === 1) ||
          (host.endsWith("github.io") && depth === 0)) site = "personal";
    }
    // mascot: folder is named after each student's mascot, so no fixed dir
    // can match — an unrecognized folder (any location) resolves to mascot
    if ((!site || site === "course") && rules.sites.mascot) {
      const dirs = lowPath.split("/").filter((s) => s && !/\.html?$/.test(s));
      const last = dirs[dirs.length - 1];
      const minDepth = host.includes("webpages.charlotte.edu") ? 2 : 1;
      if (last && dirs.length >= minDepth) {
        const known = new Set();
        for (const s of Object.values(rules.sites)) for (const dir of s.match_dirs || []) known.add(dir);
        const excluded = new Set(rules.sites.mascot.exclude_dirs || []);
        const firmPat = rules.sites.designfirm && rules.sites.designfirm.match_pattern;
        const firmHit = firmPat && new RegExp(firmPat, "i").test("/" + last + "/");
        if (!known.has(last) && !excluded.has(last) && !firmHit) site = "mascot";
      }
    }
    return site;
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
    const dataSite = SCRIPT_EL && SCRIPT_EL.dataset.site;
    let site = dataSite || classifySite(location.pathname, location.host, rules);
    if (scriptMode === "course") site = "course";
    else if (scriptMode === "general") site = null;
    const course = site === "course";

    if (location.pathname.toLowerCase().includes("/components/")) {
      add("INFO", "component fragment", "checked via the pages that include it — not a standalone page");
      return results;
    }
    if (site === "crappy") add("HEAD", "CRAPPY STANDARDS (INVERTED — SINS REQUIRED)");
    else add("HEAD", "GENERAL RULES (EVERY PAGE)");

    if (site === "crappy") {
      const docHtml0 = d.documentElement.outerHTML;
      const css0 = [...d.querySelectorAll("style")].map((s) => s.textContent).join("\n");
      for (const c of (rules.sites.crappy.site_checks || [])) {
        const hay = c.type === "css" ? css0 : docHtml0;
        const found = new RegExp(c.pattern, "i").test(hay);
        add(found === (c.present !== false) ? "PASS" : "FAIL", c.rule,
          found === (c.present !== false) ? "" : "missing");
      }
      const fname = decodeURIComponent(location.pathname.split("/").pop() || "");
      add(/\.htm$/i.test(fname) && !/\.html$/i.test(fname) ? "PASS" : "FAIL", "file is .HTM, not .html", fname);
      add(/[A-Z]/.test(fname) && /[a-z]/.test(fname) ? "PASS" : "FAIL", "fiLeNaMe MiXeS cAsE", fname);
      add(fname.includes(" ") ? "PASS" : "FAIL", "filename has space(s)", fname);
      add(/[^\w .%-]/.test(fname) ? "PASS" : "FAIL", "filename has a weird character (emoji, symbol, ...)", fname);
      const h1p = docHtml0.toLowerCase().indexOf("<h1");
      const h2p = docHtml0.toLowerCase().indexOf("<h2");
      add(h2p !== -1 && (h1p === -1 || h2p < h1p) ? "PASS" : "FAIL", "headings out of order (h2 before h1)");
      const inl = [...d.querySelectorAll("[style]")].filter((el) => el.id !== "standards-check-badge").length;
      add(inl >= 5 ? "PASS" : "FAIL", "repeated inline styles instead of a stylesheet", inl + " inline styles");
      const extless = [...d.querySelectorAll("img")].some((i) => !((i.getAttribute("src") || "").split("/").pop() || "").includes("."));
      add(extless ? "PASS" : "FAIL", "image src missing its file extension");
      const stretched = [...d.querySelectorAll("img")].some((i) =>
        i.naturalWidth && i.width && Math.abs((i.width / i.height) / (i.naturalWidth / i.naturalHeight) - 1) > 0.15);
      add(stretched ? "PASS" : "FAIL", "aspect ratio properly ruined (stretched/squashed)");
      return results;
    }

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
    const dividerRe = site === "hobby" ? /[^\w\s'".,]/ : /[|~•·—-]/;
    if (!title) add("FAIL", "title element present");
    else if (!dividerRe.test(title)) add("FAIL", "title combines h1 (site name) + divider + h2 (page name)", "no divider: " + title);
    else add("PASS", "title has a divider" + (site === "hobby" ? " (unique symbol ok here)" : ""), title);

    const sheets = [...d.querySelectorAll('link[rel~="stylesheet"]')].map((l) => l.getAttribute("href") || "");
    const localSheets = sheets.filter(isLocal);
    const embedded = [...d.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    const CSS_RULE = "stylesheets in styles/, first named default.css";
    // styles/ must be the immediate folder holding a single file directly —
    // not just "styles/" present anywhere in the path (was matching
    // "web115/styles/default.css", reaching into another site's directory)
    // and not a further sub/sub folder inside styles/ itself.
    const inStylesFolder = (s) => /^\.?\/?styles\/[^/]+$/i.test(s);
    if (!localSheets.length) {
      add("PASS", CSS_RULE, embedded.trim() ? "embedded styles only — folder/default.css not required" : "no stylesheets on this page");
    } else if (localSheets.some((s) => !inStylesFolder(s)))
      add("FAIL", CSS_RULE, "outside styles/: " + localSheets.filter((s) => !inStylesFolder(s)).join(", "));
    else if (localSheets[0].split("/").pop().toLowerCase() !== "default.css")
      add("FAIL", CSS_RULE, "first stylesheet is " + localSheets[0]);
    else add("PASS", CSS_RULE);

    let css = embedded;
    for (const s of localSheets) css += await getText(s);

    // responsive: two mechanical prerequisites a script CAN see. Whether the
    // layout actually holds up on a phone still needs human eyes.
    const vp = d.querySelector('meta[name="viewport"]');
    const vpContent = vp ? (vp.getAttribute("content") || "") : "";
    if (!vp) add("FAIL", "viewport meta tag present", "no <meta name=\"viewport\">");
    else if (!/width\s*=\s*device-width/i.test(vpContent))
      add("FAIL", "viewport meta tag present", "missing width=device-width: " + short(vpContent));
    else add("PASS", "viewport meta tag present", short(vpContent));

    if (css) {
      const mq = css.match(/@media[^{]*\(/gi);
      if (mq) add("PASS", "at least one media query", mq.length + " found");
      else add("FAIL", "at least one media query", "no @media rule in the stylesheet");
    }

    if (css) {
      // Presence check, not a strict numeric threshold: a max-width without
      // centering just leaves content stuck to one side, so require both
      // together rather than crediting a lone max-width that isn't wired up.
      const bodyCss = [...css.matchAll(/\bbody\b[^{]*\{([^}]*)\}/gi)].map((m) => m[1]).join(" ");
      const hasMaxWidth = /max-width\s*:/i.test(bodyCss);
      const hasAutoMargin = /margin(-inline)?\s*:\s*[^;]*\bauto\b/i.test(bodyCss) ||
        (/margin-left\s*:\s*auto/i.test(bodyCss) && /margin-right\s*:\s*auto/i.test(bodyCss));
      add(hasMaxWidth && hasAutoMargin ? "PASS" : "FAIL",
        "body has a max-width and is centered (margin: auto)",
        hasMaxWidth && hasAutoMargin ? ""
          : !hasMaxWidth ? "no max-width on body"
          : "max-width set but not centered — add margin: 0 auto (or margin-inline: auto)");
    }

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
    // tools/ counts alongside scripts/: the shared validator lives in the
    // teaching hub's tools/ folder, and the rule's point is that scripts sit
    // in a folder rather than loose at the site root
    const inCodeFolder = (s) => s.includes("scripts/") || s.includes("tools/");
    const CODE_RULE = "scripts in scripts/ (or tools/)";
    if (!localScripts.length) add("PASS", CODE_RULE, "no local scripts on this page");
    else if (localScripts.every(inCodeFolder)) add("PASS", CODE_RULE);
    else add("FAIL", CODE_RULE, localScripts.filter((s) => !inCodeFolder(s)).join(", "));

    add(scripts.some((s) => s.includes("standards-check")) ? "PASS" : "FAIL",
      "Vicunadator script on the page");

    if (!scripts.some((s) => s.includes("lint.page"))) add("FAIL", "validation script (lint.page) present");
    else {
      // judge from the raw source: lint.page (and other tooling) injects
      // elements into the live head at runtime. Read the body regardless of
      // HTTP status — a 404 page serves real markup with a 404 code.
      let rawHeadSrc = "";
      try { rawHeadSrc = await (await fetch(location.href)).text(); } catch (e) {}
      const headMatch = rawHeadSrc.match(/<head[\s\S]*?<\/head>/i);
      const headTags = headMatch
        ? (headMatch[0].match(/<(script|link|meta|title|style)[\s>]/gi) || [])
        : [];
      const lastIsScript = headTags.length &&
        /script/i.test(headTags[headTags.length - 1]) &&
        /lint\.page[\s\S]{0,120}<\/head>/i.test(headMatch ? headMatch[0].slice(-300) : "");
      add(lastIsScript ? "PASS" : "FAIL", "validation script is last line of head");
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
      const unclearRe = new RegExp("^(img|image|photo|pic|picture|screenshot|untitled|unnamed|dsc|mg)?[_-]?\\d*\\.\\w+$", "i");
      const unclear = localImgs.filter((i) => unclearRe.test(i.split("/").pop()));
      add(!unclear.length ? "PASS" : "FAIL", "image names say what they are", unclear.map(short).join(", "));
    }

    // comments justify divs/spans, classes/ids, inline styles
    let comments = 0;
    const tw = d.createTreeWalker(d.documentElement, NodeFilter.SHOW_COMMENT);
    while (tw.nextNode()) if (tw.currentNode.data.trim()) comments++;
    // count from the raw source: browsers/extensions (Edge features,
    // translators, dark-mode tools) inject styles, classes, and elements
    // into the live DOM that the student never wrote
    let rawCounted = await getText(location.href);
    for (const part of ["header", "footer"]) {
      const frag = await getText("components/" + part + ".html");
      if (frag) rawCounted += frag;
    }
    const divSpan = (rawCounted.match(/<(div|span)[\s>]/gi) || []).length
      - (rawCounted.match(/<div[^>]*data-include/gi) || []).length;
    const classId = (rawCounted.match(/\s(class|id)\s*=\s*["']/gi) || []).length;
    const inline = (rawCounted.match(/\sstyle\s*=\s*["']/gi) || []).length;
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
    // A tilde is only a divider when it separates words. Followed by a digit
    // or currency it means "about" ("wait ~10 minutes", "(~$12)"), and
    // followed by punctuation it's the character itself under discussion
    // ("starting with - or ~,"). Drop those before looking for tight dividers.
    const bodyText = (bodyClone.textContent || "").replace(/~(?=[\d$£€.,;:)])/g, " ");
    const tight = [...new Set(
      (bodyText.match(/[^\s|•·~][|•·~]|[|•·~][^\s|•·~]/g) || []).filter((t) => !t.includes("/"))
    )].slice(0, 5);
    add(!tight.length ? "PASS" : "FAIL",
      "dividers have a space on both sides", tight.map((t) => JSON.stringify(t)).join(", "));

    // Internal references must be relative WITHIN the same site: an absolute
    // URL back into the student's own webspace (links or assets) should be a
    // relative path when it stays on this site, but crossing into a
    // different declared site (course/hobby/mascot/personal/designfirm — a
    // standalone site by design) is a legitimate absolute reference, the
    // same way the footer's site/home link is (still always exempt: the CLT
    // and GH copies are identical files, so that link must be absolute to
    // point at a fixed home no matter which copy you're reading).
    const ownRoot = (location.host + "/" + (location.pathname.split("/").filter(Boolean)[0] || "")).toLowerCase();
    const allRefs = [...anchors.filter((a) => !a.closest("footer")).map((a) => a.getAttribute("href") || ""),
      ...sheets, ...scripts, ...imgs];
    // a page served at unpredictable paths (the 404 page) can only use
    // absolute URLs; it declares data-page="404" on the checker script
    const notFoundPage = SCRIPT_EL && SCRIPT_EL.dataset.page === "404";
    const absInternal = notFoundPage ? [] : allRefs.filter((h) => {
      if (!/^https?:\/\//i.test(h)) return false;
      let u; try { u = new URL(h); } catch (e) { return false; }
      const hRoot = (u.host + "/" + (u.pathname.split("/").filter(Boolean)[0] || "")).toLowerCase();
      const ownSpace = u.host.toLowerCase() === location.host.toLowerCase() &&
        (location.host.toLowerCase().endsWith("github.io") || hRoot === ownRoot);
      if (!ownSpace) return false;
      return classifySite(u.pathname, u.host, rules) === site;
    });
    add(!absInternal.length ? "PASS" : "FAIL",
      "internal links/assets are relative within the same site (absolute ok crossing to another site)",
      absInternal.slice(0, 4).map(short).join(", "));

    // Local links may open new tabs only when they cross into a different
    // site than this page — same-site navigation must stay in-tab.
    const badBlank = anchors.filter((a) => {
      const h = a.getAttribute("href") || "";
      if (a.target !== "_blank" || !isLocal(h)) return false;
      const path = h.split("#")[0].split("?")[0];
      let targetPath;
      try { targetPath = new URL(path, location.href).pathname; } catch (e) { return false; }
      return classifySite(targetPath, location.host, rules) === site;
    });
    add(!badBlank.length ? "PASS" : "FAIL", "same-site links must not open new tabs (crossing to another site is ok)",
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
        // Gated on the same signal as the cert-page nav links (rules.json's
        // soften_if_none rule): no cert pages started yet means there's
        // nothing to certify in, so don't fail the footer line for it.
        const certRule = rules && rules.sites && rules.sites.course &&
          (rules.sites.course.site_checks || []).find((c) => c.soften_if_none);
        const certStarted = !certRule || (certRule.patterns || [])
          .some((p) => new RegExp(p, "i").test(d.documentElement.outerHTML));
        if (!certStarted) {
          add("INFO", "footer 'Certified in ...' line", "not required until the cert pages are up");
        } else {
          add(/certified in/i.test(footer.textContent) ? "PASS" : "FAIL", "footer 'Certified in ...' line");
        }
      }
      const header = d.querySelector("header");
      const chrome = (header ? header.innerHTML : "") + footHtml;
      const chromeText = (header ? header.textContent : "") + footer.textContent;
      const hasTagline = /<em|<i[\s>]/.test(chrome) || /["“][^"”]{4,}["”]/.test(chromeText);
      add(hasTagline ? "PASS" : "FAIL", "tagline in italics or quotes (header or footer)");
    }

    // ===== Layer-2/3 site and page rules from rules.json =====
    if (site) {
      const siteRules = rules && rules.sites && rules.sites[site];
      add("HEAD", "SITE RULES: " + site.toUpperCase() + " SITE");
      if (siteRules) {
        let page = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
        if (!/\.html?$/.test(page)) page = "index.html";
        // collapse whitespace runs so indentation/newlines don't break
        // position-sensitive patterns (e.g. "word before ©")
        const docText = (d.body ? d.body.textContent : "").replace(/\s+/g, " ");
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
                let detail = okc ? "" : (want ? "missing" : "found — remove it");
                // near-miss hint: strict pattern failed but a looser one
                // matches — say what's wrong instead of "missing"
                if (!okc && c.fail_hint_pattern && new RegExp(c.fail_hint_pattern, "i").test(hay)) {
                  detail = c.fail_hint || detail;
                }
                add(okc ? "PASS" : "FAIL", rule, detail);
              } else if (c.type === "text_all" || c.type === "html_all") {
                const hay = c.type === "text_all" ? docText : docHtml;
                const missing = (c.patterns || []).filter((p2) => !new RegExp(p2, "i").test(hay));
                // soften_if_none: a list that's genuinely not due yet has
                // none of its items present. Once even one shows up, the
                // student has started, so the rest are fair game to require.
                if (c.soften_if_none && missing.length === (c.patterns || []).length) {
                  add("INFO", rule, "none yet — not required until you start");
                } else {
                  add(!missing.length ? "PASS" : "FAIL", rule,
                    missing.length ? "missing: " + missing.slice(0, 4).join(", ") : "");
                }
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
        if (site === "hobby") {
          const h2texts = [...d.querySelectorAll("h2")].map((h) => h.textContent.trim().toLowerCase());
          const ends = h2texts.some((h) => h && title.toLowerCase().endsWith(h));
          add(ends ? "PASS" : "FAIL",
            "title ends with the visible section's h2 (JS updates it per section)",
            ends ? "" : "title doesn't end with any section h2");
          const thin = [], noFig = [];
          for (const s of d.querySelectorAll("section")) {
            const h2 = s.querySelector("h2");
            const name = (h2 ? h2.textContent.trim() : "(no h2)").slice(0, 24);
            const items = [...s.querySelectorAll("p,table,form,ul,ol")]
              .filter((el) => !el.closest("figure")).length
              + s.querySelectorAll("figure").length;
            if (items < 3) thin.push(name + " (" + items + ")");
            if (!s.querySelector("figure") && !/ai prompt/i.test(name)) noFig.push(name);
          }
          add(!thin.length ? "PASS" : "FAIL",
            "every section has 3+ items (p/figure/table/form/list; headings don't count)",
            thin.slice(0, 4).join(", "));
          add(!noFig.length ? "PASS" : "FAIL",
            "every section has a figure (AI Prompts exempt)", noFig.slice(0, 4).join(", "));
          const figs = [...d.querySelectorAll("figure")];
          const bare = figs.filter((f) => !f.querySelector("em,i")).length;
          add(figs.length && !bare ? "PASS" : "FAIL",
            "each figure has an italic prompt/source note",
            figs.length ? (bare ? bare + " figure(s) without one" : "") : "no figures");
        }
        if (site === "personal") {
          const courseDirs = (rules.sites.course && rules.sites.course.match_dirs) || ["itis3135"];
          const firmRe = new RegExp((rules.sites.designfirm && rules.sites.designfirm.match_pattern) || "\\.[a-z]{2,24}/", "i");
          const isCourseRef = (u) => courseDirs.some((dir) => u.toLowerCase().includes(dir)) && !firmRe.test(u);
          const headsAll = [...d.querySelectorAll("h1")].map((h) => h.textContent).concat([title]);
          // The "Name's Mascot" possessive + two capitalized words (e.g.
          // "Huggins's Theroretical Hummingbird") is the course h1's
          // convention, not the personal page's — flag it here too, not
          // just a bare course code.
          const mascotName = /['’]s\s+[A-Z][a-z]*\s+[A-Z][a-z]*/;
          const coursey = headsAll.filter((t) => /[A-Z]{2,4}\d{3,4}/.test(t) || mascotName.test(t));
          add(!coursey.length ? "PASS" : "FAIL", "title/h1 read as YOUR page, not the course's",
            coursey.slice(0, 2).join("; ").trim());
          const courseLinks = anchors.map((a) => a.getAttribute("href") || "").filter(isCourseRef);
          if (courseLinks.length === 1) add("PASS", "exactly one link to the course site", courseLinks[0]);
          else if (!courseLinks.length) add("FAIL", "exactly one link to the course site", "none found");
          else add("FAIL", "exactly one link to the course site", courseLinks.length + " found: " + courseLinks.slice(0, 3).join(", "));
          const shared = [...sheets, ...scripts, ...imgs].filter((s) => isLocal(s) && isCourseRef(s));
          add(!shared.length ? "PASS" : "FAIL", "no styles/images/scripts shared with the course site",
            shared.slice(0, 4).map(short).join(", "));
          if (embedded.trim() && !localSheets.length) add("PASS", "embedded stylesheet does the styling");
          else add("FAIL", "embedded stylesheet does the styling",
            localSheets.length ? "linked: " + localSheets.slice(0, 2).join(", ") : "no embedded styles");
          add("INFO", "CLT and GitHub Pages copies match", "compare the pair by eye");
        }
        if (site === "mascot") {
          const hf = [...d.querySelectorAll("header,footer")];
          const hfText = hf.map((e) => e.textContent).join("\n");
          const hasEm = hf.some((e) => e.querySelector("em"));
          const hasQuotes = /["“”][^"“”<>]{4,120}["“”]/.test(hfText);
          const SLOGAN = "slogan/tagline in header or footer (italics OR quotes, not both)";
          if (hasEm && hasQuotes) add("WARN", SLOGAN, "found both em and quoted text — pick one style");
          else if (hasEm || hasQuotes) add("PASS", SLOGAN, hasEm ? "em" : "quotes");
          else add("FAIL", SLOGAN, "no em or quoted text found in header/footer");

          add(d.querySelector("b,i") ? "FAIL" : "PASS", "uses strong/em, not b/i");

          const navHrefs = new Set([...d.querySelectorAll("nav a")]
            .map((a) => (a.getAttribute("href") || "").toLowerCase())
            .filter((h) => h && !h.startsWith("http") && !h.startsWith("#") && !h.startsWith("mailto:")));
          const h2count = d.querySelectorAll("h2").length;
          const PAGES = "home + 4 more pages (or SPA sections)";
          if (navHrefs.size >= 4 || h2count >= 5) add("PASS", PAGES, navHrefs.size + " nav links, " + h2count + " h2s");
          else add("FAIL", PAGES, "only " + navHrefs.size + " local nav links / " + h2count + " h2s");

          const paras = d.querySelectorAll("main p").length || d.querySelectorAll("p").length;
          add(paras >= 2 ? "PASS" : "FAIL", "at least 2 paragraphs on the page", paras + " found");

          const footText = [...d.querySelectorAll("footer")].map((e) => e.textContent).join(" ");
          if (/design|develop|coder|coded|created|built/i.test(footText))
            add("PASS", "designer/developer credit in the footer");
          else add("FAIL", "designer/developer credit in the footer",
            "footer should refer to you as designer/developer/coder");

          add("INFO", "3 dynamic JS functionalities (M15)", "not auto-checked — summarize them in your submission");
          add("INFO", "look and feel differs from your course/hobby/firm sites", "judged by eye");
        }
        if (site === "course" || site === "mascot") {
          // M5B: header/footer live in components; raw page holds only the
          // include. The mascot final (M15) carries the same requirement.
          const rawSrc = await getText(location.href);
          const hasInclude = /components\/|data-include/i.test(rawSrc);
          const compH = await getText("components/header.html");
          const compF = await getText("components/footer.html");
          const okH = /<header[\s>]/i.test(compH);
          const okF = /<footer[\s>]/i.test(compF);
          if (okH && okF) add("PASS", "components/header.html + footer.html contain the elements");
          else if (hasInclude || compH || compF) add("FAIL", "components/header.html + footer.html contain the elements",
            "missing or element-less: " + [!okH && "header", !okF && "footer"].filter(Boolean).join(", "));
          const rawHeader = /<header[\s>]/i.test(rawSrc);
          const rawFooter = /<footer[\s>]/i.test(rawSrc);
          if (!hasInclude) {
            if (site === "mascot") add("FAIL", "page includes header/footer from components",
              "required on the mascot site (single header/footer files in components/)");
            else add("INFO", "page includes header/footer from components", "not converted yet (required from M5B on)");
          }
          else if (rawHeader || rawFooter) add("FAIL", "page source holds only the include, not header/footer tags",
            "found inline: " + [rawHeader && "header", rawFooter && "footer"].filter(Boolean).join(", ") + " (commented alternates: judge by eye)");
          else add("PASS", "page source holds only the include, not header/footer tags");
        }
        if (site === "course") {
          const navs = [...d.querySelectorAll("nav")];
          const hasHobby = (n) => n && [...n.querySelectorAll("a")].some((a) => (a.getAttribute("href") || "").toLowerCase().includes("hobby"));
          if (hasHobby(navs[0])) add("FAIL", "Hobby link lives in the secondary nav (second <nav>)", "found in the primary nav");
          else if (navs.slice(1).some(hasHobby)) add("PASS", "Hobby link lives in the secondary nav (second <nav>)");
          else add("INFO", "Hobby link lives in the secondary nav (second <nav>)", "no hobby link yet (required once the midterm is up)");
        }
        const pageRules = siteRules.pages && siteRules.pages[page];
        if (pageRules) {
          add("HEAD", "PAGE RULES: " + page.toUpperCase());
          applyChecks(pageRules.checks);
        }
      }
    }
    return results;
  }

  function showBadge(res) {
    const fails = res.filter((r) => r.level === "FAIL").length;
    const crappy = res.some((r) => r.level === "HEAD" && /crappy/i.test(r.rule));
    if (fails) {
      const pulse = document.createElement("style");
      pulse.textContent =
        "@keyframes vicunadator-pulse{" +
        "0%,100%{box-shadow:0 0 6px 3px rgba(220,30,30,.35)}" +
        "50%{box-shadow:0 0 16px 9px rgba(220,30,30,.75)}}" +
        "@keyframes vicunadator-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";
      document.head.appendChild(pulse);
    }
    const badge = document.createElement("div");
    badge.id = "standards-check-badge";
    badge.style.cssText =
      "position:fixed;bottom:36px;right:36px;z-index:9999;cursor:pointer;" +
      // Fixed square + flex centering: a page's own font-family (every course
      // page sets its own fonts) otherwise reaches the emoji glyph and can
      // render it wider than tall, so shrink-to-fit sizing turned the badge
      // oval on some pages and round on others depending on the page's CSS.
      "width:48px;height:48px;box-sizing:border-box;display:flex;" +
      "align-items:center;justify-content:center;" +
      "font-size:34px;line-height:1;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;" +
      "user-select:none;border-radius:50%;padding:4px;" +
      (crappy && !fails
        ? "transform:rotate(180deg);background:rgba(225,245,225,.9);" +
          "box-shadow:0 0 12px 6px rgba(40,170,60,.55);"
        : fails
        ? "transform:rotate(180deg);background:rgba(255,220,220,.9);" +
          "animation:vicunadator-pulse 1.6s ease-in-out infinite, vicunadator-spin 2.2s linear infinite;"
        : "background:rgba(225,245,225,.9);" +
          "box-shadow:0 0 12px 6px rgba(40,170,60,.55);");
    badge.textContent = "🦙";
    badge.title = crappy
      ? (fails ? fails + " sin(s) still missing — make it worse" : "perfectly terrible 🎉 — click for details")
      : fails ? fails + " standards check(s) failing — click for details" : "All standards checks pass — click for details";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;bottom:86px;right:36px;z-index:9999;display:none;" +
      "max-height:70vh;max-width:480px;overflow:auto;background:#fff;color:#222;" +
      "border:2px solid #444;border-radius:10px;padding:10px 14px;" +
      "font:12px/1.5 monospace;box-shadow:0 6px 18px rgba(0,0,0,.3);text-align:left;";
    const icons = { PASS: "✅", FAIL: "❌", WARN: "⚠️", INFO: "ℹ️" };
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const closeX = '<span data-vicuña-close style="position:sticky;top:0;float:right;' +
      'cursor:pointer;font:bold 14px/1 sans-serif;color:#666;padding:0 2px;">&#10005;</span>';
    panel.innerHTML = closeX + res
      .map((r) => r.level === "HEAD"
        ? "<br>&gt;&gt;&gt;&gt;&gt;&gt; <strong>" + esc(r.rule) + "</strong>"
        : icons[r.level] + " " + esc(r.rule) + (r.detail ? ": " + esc(r.detail) : ""))
      .join("<br>") +
      "<br><br><strong>" + res.filter((r) => r.level === "PASS").length + " pass, " + fails + " fail</strong>";
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      if (fails) {
        // stop the spin so the report is readable; settle upside down.
        // A reload starts it spinning again (assuming it still fails).
        badge.style.animation = "vicunadator-pulse 1.6s ease-in-out infinite";
        badge.style.transform = "rotate(180deg)";
      }
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    panel.addEventListener("click", (e) => {
      if (e.target.hasAttribute && e.target.hasAttribute("data-vicuña-close")) {
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
