/*
Make a new file here that has code that will prompt for a URL, and then use the guidelins of the shared_introductions_instructions to evaluate the intros in that URL, and provide a bulleted list of names and a list of their issues that do not meet the requirements. Put this prompt at the top as a commment in the code.
*/

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

const STORAGE_KEYS = {
  lastUrl: "introductionsEvaluator.lastUrl",
  lastTitle: "introductionsEvaluator.lastTitle",
  lastCourseProfile: "introductionsEvaluator.lastCourseProfile",
};

const COURSE_PROFILES = {
  web: {
    key: "web",
    label: "WEB",
    requireLinks: true,
    checkedItemCount: 15,
  },
  cis110: {
    key: "cis110",
    label: "CIS110",
    requireLinks: false,
    checkedItemCount: 14,
  },
};

const REQUIRED_LABELS = [
  "Personal Background",
  "Professional Background",
  "Academic Background",
  "Primary Work Computer",
  "Operating System & Version",
  "Backup Work Computer & Location Plan",
  "Courses I'm Taking, & Why",
];

const REQUIRED_LINKS = [
  { key: "clt web", display: "CLT Web" },
  { key: "github", display: "GitHub" },
  { key: "github.io", display: "GitHub.io" },
  { key: "freecodecamp", display: "freeCodeCamp" },
  { key: "codecademy", display: "Codecademy" },
  { key: "linkedin", display: "LinkedIn" },
];

const ISSUE_MESSAGES = {
  badNameHeading: "Heading 2 name is not in the expected format: Last Name, First Name Middle Initial.",
  headingShouldBeLeftAligned: "Heading 2 name line should be left-aligned.",
  onlyFirstHeadingAllowed: "Nothing should be a heading except for the first one (Last, First).",
  entryNotAlphabetized: "Entry is not alphabetized by last name.",
  missingHrBeforeEntry: "Entry should start below a horizontal rule.",
  missingBlankLineBelowHr: "Entry should start with a blank line below a horizontal rule.",
  missingAcknowledgment: "Missing public acknowledgment sentence with initials and date.",
  acknowledgmentMissingInitials: "Public acknowledgment is present, but initials are missing.",
  acknowledgmentMissingDate: "Public acknowledgment is present, but date is missing.",
  acknowledgmentNeedsSignatureMarker: "Public acknowledgment should include '-' or '~' before initials/date.",
  acknowledgmentShouldBeLeftAligned: "Public acknowledgment should be left-aligned normal text.",
  missingDisplayName: "Missing display-name line in the form First M. \"Nickname\" Last ~ Adjective Animal (with optional initial/nickname).",
  displayNameShouldBeCentered: "Display-name line should be centered.",
  missingPhoto: "Missing centered photo.",
  photoShouldBeCentered: "Photo should be centered.",
  missingCaption: "Missing centered italic caption beneath the photo.",
  captionShouldBeCentered: "Photo caption should be centered.",
  missingPersonalStatement: "Missing personal statement with at least 3 complete sentences.",
  personalStatementShouldBeLeftAligned: "Personal statement should be normal left-aligned body text.",
  missingNestedCourses: "Courses I'm Taking, & Why must include nested bullet items.",
  missingFavoriteQuote: "Missing favorite quote block.",
  quoteLabelShouldBeOmitted: "Do not include the word 'Quote' as a label after the bullets.",
  missingQuoteAttribution: "Quote is missing attribution.",
  quoteAttributionMarker: "Quote attribution should start with a dash (-, –, —, etc.) or '~'.",
  quoteAttributionSeparateLine: "Favorite quote should place attribution on a separate line.",
  quoteShouldBeCentered: "Quote should be centered.",
  quoteAttributionShouldBeCentered: "Quote attribution should be centered.",
  linksNotOnSingleCenteredLine: "Links are present but not as one centered links line with dividers.",
  missingLinksLine: "Missing centered links line with dividers.",
  linksLineCentered: "Links line should be centered.",
  linksNeedDividers: "Links line should include dividers between each required link.",
  missingBlankLineBeforeLinks: "Missing additional blank line between quote attribution and links line.",
  missingSeparatorHr: "Missing horizontal rule separator after entry.",
  missingBlankLineBeforeSeparatorHr: "Missing at least one blank line before the horizontal rule separator.",
  multipleSpaces: "Contains multiple consecutive spaces in visible text. Tip: This may include tabs- remove them. Also use View -> Show non-printing characters.",
};

const LINK_ISSUE_PATTERNS = [
  /^Missing required link label:/,
  /^CLT Web link must match /,
  /^GitHub link must match /,
  /^GitHub\.io link must match /,
  /^GitHub\.io username must match /,
  /^freeCodeCamp link must point to /,
  /^Codecademy link must point to /,
  /^LinkedIn link must point to /,
  /^Links are present but not as one centered links line with dividers\.$/,
  /^Missing centered links line with dividers\.$/,
  /^Links line should be centered\.$/,
  /^Links line should include dividers between each required link\.$/,
  /^Missing additional blank line between quote attribution and links line\.$/,
];

const BLOCKED_ENTRY_HEADING_PHRASES = [
  "table of contents",
  "do not edit the table of contents",
  "entries go below",
  "don't make a new tab",
  "there should be no additional tabs",
  "read the instructions",
  "published using google docs",
  "report abuse",
];

const boldClassCache = new WeakMap();
const centeredClassCache = new WeakMap();
const imageCenteredClassCache = new WeakMap();

function getBoldClassesForDocument(doc) {
  if (boldClassCache.has(doc)) {
    return boldClassCache.get(doc);
  }

  const styleText = Array.from(doc.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");
  const classes = new Set();
  const rulePattern = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match = rulePattern.exec(styleText);

  while (match) {
    const className = match[1];
    const declarations = match[2];
    const weightMatch = declarations.match(/font-weight\s*:\s*([^;}]*)/i);

    if (weightMatch) {
      const value = weightMatch[1].trim().toLowerCase();
      const numeric = Number.parseInt(value, 10);
      const isBold = value === "bold" || (!Number.isNaN(numeric) && numeric >= 600);

      if (isBold) {
        classes.add(className);
      }
    }

    match = rulePattern.exec(styleText);
  }

  boldClassCache.set(doc, classes);
  return classes;
}

function getCenteredClassesForDocument(doc) {
  if (centeredClassCache.has(doc)) {
    return centeredClassCache.get(doc);
  }

  const styleText = Array.from(doc.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");
  const classes = new Set();
  const rulePattern = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match = rulePattern.exec(styleText);

  while (match) {
    const className = match[1];
    const declarations = match[2];
    const alignMatch = declarations.match(/text-align\s*:\s*([^;}]*)/i);

    if (alignMatch && alignMatch[1].trim().toLowerCase() === "center") {
      classes.add(className);
    }

    match = rulePattern.exec(styleText);
  }

  centeredClassCache.set(doc, classes);
  return classes;
}

function getImageCenteredClassesForDocument(doc) {
  if (imageCenteredClassCache.has(doc)) {
    return imageCenteredClassCache.get(doc);
  }

  const styleText = Array.from(doc.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");
  const classes = new Set();
  const rulePattern = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match = rulePattern.exec(styleText);

  while (match) {
    const className = match[1];
    const declarations = match[2];
    const hasDisplayBlock = /display\s*:\s*block/i.test(declarations);
    const hasMarginShorthandAuto = /margin\s*:\s*[^;}]*(?:^|\s)auto(?:\s|$)/i.test(declarations);
    const hasMarginSidesAuto =
      /margin-left\s*:\s*auto/i.test(declarations) &&
      /margin-right\s*:\s*auto/i.test(declarations);

    if ((hasMarginShorthandAuto || hasMarginSidesAuto) && hasDisplayBlock) {
      classes.add(className);
    }

    match = rulePattern.exec(styleText);
  }

  imageCenteredClassCache.set(doc, classes);
  return classes;
}

function elementIsBold(element, boldClasses) {
  if (!element) {
    return false;
  }

  if (["B", "STRONG"].includes(element.tagName)) {
    return true;
  }

  const styleWeight = (element.style && element.style.fontWeight) ? element.style.fontWeight.toLowerCase() : "";
  const numeric = Number.parseInt(styleWeight, 10);
  const styleBold = styleWeight === "bold" || (!Number.isNaN(numeric) && numeric >= 600);

  if (styleBold) {
    return true;
  }

  return Array.from(element.classList || []).some((className) => boldClasses.has(className));
}

function elementIsCentered(element, centeredClasses) {
  if (!element) {
    return false;
  }

  const styleAlign = (element.style && element.style.textAlign) ? element.style.textAlign.toLowerCase() : "";

  if (styleAlign === "center") {
    return true;
  }

  return Array.from(element.classList || []).some((className) => centeredClasses.has(className));
}

function elementOrAncestorIsCentered(element, centeredClasses, maxDepth = 3) {
  let current = element;
  let depth = 0;

  while (current && depth <= maxDepth) {
    if (elementIsCentered(current, centeredClasses)) {
      return true;
    }
    current = current.parentElement;
    depth += 1;
  }

  return false;
}

function imageIsCentered(imageElement, centeredClasses, imageCenteredClasses) {
  if (!imageElement) {
    return false;
  }

  if (elementOrAncestorIsCentered(imageElement, centeredClasses, 5)) {
    return true;
  }

  const styleDisplay = (imageElement.style && imageElement.style.display)
    ? imageElement.style.display.toLowerCase()
    : "";
  const styleMargin = (imageElement.style && imageElement.style.margin)
    ? imageElement.style.margin.toLowerCase()
    : "";
  const styleMarginLeft = (imageElement.style && imageElement.style.marginLeft)
    ? imageElement.style.marginLeft.toLowerCase()
    : "";
  const styleMarginRight = (imageElement.style && imageElement.style.marginRight)
    ? imageElement.style.marginRight.toLowerCase()
    : "";

  const inlineMarginCentered =
    (styleMarginLeft === "auto" && styleMarginRight === "auto") ||
    (styleDisplay === "block" && /(^|\s)auto(\s|$)/.test(styleMargin));

  if (inlineMarginCentered) {
    return true;
  }

  return Array.from(imageElement.classList || []).some((className) => imageCenteredClasses.has(className));
}

function resolveGoogleRedirectUrl(href) {
  const raw = normalizeText(href);

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, window.location.href);

    if (url.hostname === "www.google.com" && url.pathname === "/url") {
      const redirected = normalizeText(url.searchParams.get("q") || "");
      return redirected || raw;
    }

    return url.toString();
  } catch (_error) {
    return raw;
  }
}

function normalizeLinkLabel(text) {
  const lowered = normalizeText(text).toLowerCase();

  if (lowered.includes("clt web")) {
    return "clt web";
  }

  if (lowered.includes("itis3135.io")) {
    return "itis3135.io";
  }

  if (lowered.includes("github.io")) {
    return "github.io";
  }

  if (lowered.includes("github")) {
    return "github";
  }

  if (lowered.includes("freecodecamp")) {
    return "freecodecamp";
  }

  if (lowered.includes("codecademy")) {
    return "codecademy";
  }

  if (lowered.includes("linkedin")) {
    return "linkedin";
  }

  return "";
}

function loadLastRunState() {
  try {
    return {
      lastUrl: normalizeText(window.localStorage.getItem(STORAGE_KEYS.lastUrl) || ""),
      lastTitle: normalizeText(window.localStorage.getItem(STORAGE_KEYS.lastTitle) || ""),
      lastCourseProfile: normalizeText(window.localStorage.getItem(STORAGE_KEYS.lastCourseProfile) || ""),
    };
  } catch (error) {
    console.warn("Unable to read saved evaluator state.", error);
    return { lastUrl: "", lastTitle: "", lastCourseProfile: "" };
  }
}

function saveLastRunState(url, title, courseProfileKey) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lastUrl, url);
    window.localStorage.setItem(STORAGE_KEYS.lastTitle, title);
    window.localStorage.setItem(STORAGE_KEYS.lastCourseProfile, courseProfileKey);
  } catch (error) {
    console.warn("Unable to save evaluator state.", error);
  }
}

function promptForReportTitle(lastTitle) {
  const titleInput = window.prompt(
    lastTitle
      ? `Use or edit the previous report title:\n${lastTitle}`
      : "Enter a report title for this run:",
    lastTitle || "",
  );

  if (titleInput === null) {
    return null;
  }

  const title = normalizeText(titleInput);

  if (!title) {
    if (lastTitle) {
      return lastTitle;
    }

    window.alert("A report title is required when no previous title exists.");
    return "";
  }

  return title;
}

function getDefaultCourseProfile(lastCourseProfile, reportTitle) {
  const normalizedSaved = normalizeText(lastCourseProfile).toLowerCase();
  const normalizedTitle = normalizeText(reportTitle).toLowerCase();

  if (normalizedSaved === "web" || normalizedSaved === "cis110") {
    return normalizedSaved;
  }

  if (normalizedTitle.includes("cis110")) {
    return "cis110";
  }

  return "web";
}

function promptForCourseProfile(lastCourseProfile, reportTitle) {
  const defaultProfile = getDefaultCourseProfile(lastCourseProfile, reportTitle);
  const profileInput = window.prompt(
    "Course profile for this run (WEB or CIS110):",
    defaultProfile.toUpperCase(),
  );

  if (profileInput === null) {
    return null;
  }

  const normalized = normalizeText(profileInput).toLowerCase();

  if (normalized === "web") {
    return COURSE_PROFILES.web;
  }

  if (normalized === "cis110" || normalized === "cis 110") {
    return COURSE_PROFILES.cis110;
  }

  window.alert("Invalid course profile. Enter WEB or CIS110.");
  return undefined;
}

function getRunConfigFromQuery() {
  if (typeof window === "undefined" || !window.location) {
    return {
      title: "",
      url: "",
      course: "",
    };
  }

  const params = new URLSearchParams(window.location.search || "");

  return {
    title: normalizeText(params.get("title") || ""),
    url: normalizeText(params.get("url") || ""),
    course: normalizeText(params.get("course") || ""),
  };
}

function countSentences(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return 0;
  }

  const matches = normalized.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : 0;
}

function isNameHeadingFormat(text) {
  // Support multi-word names (e.g., double surnames) and Unicode letters.
  const namePart = "[\\p{L}][\\p{L}'’\\-]*";
  const pattern = new RegExp(
    `^${namePart}(?:\\s+${namePart})*,\\s+${namePart}(?:\\s+${namePart})*(?:\\s+[A-Z]\\.)?$`,
    "u",
  );
  return pattern.test(normalizeText(text));
}

function isDisplayNameLine(text) {
  const namePart = "[\\p{L}][\\p{L}'’\\-]*";
  const pattern = new RegExp(
    `^${namePart}(?:,\\s*${namePart})?(?:\\s+[A-Z]\\.)?(?:\\s+"[^"\\n]+")?(?:\\s+${namePart})*\\s*[~|*\\-]\\s*${namePart}(?:\\s+${namePart})+$`,
    "u",
  );
  return pattern.test(normalizeText(text));
}

function isLikelyDisplayNameLine(textValue) {
  const text = normalizeText(textValue);

  if (!text || text.length < 10 || text.length > 90) {
    return false;
  }

  if (text.includes(":")) {
    return false;
  }

  if (!/(?:\s[~|*\-]\s|\|\|)/.test(text)) {
    return false;
  }

  const words = text.match(/[\p{L}][\p{L}'’\-]*/gu) || [];
  return words.length >= 4 && words.length <= 12;
}

function hasAcknowledgmentText(textValue) {
  const signals = getAcknowledgmentSignals(textValue);
  return signals.hasPublicVisibility && signals.hasDate && signals.hasInitials;
}

function isAcknowledgmentCandidateText(textValue) {
  const signals = getAcknowledgmentSignals(textValue);
  return signals.looksLikeAcknowledgment;
}

function getAcknowledgmentSignals(textValue) {
  const text = normalizeText(textValue);

  if (!text) {
    return {
      text,
      hasPublicVisibility: false,
      hasDate: false,
      hasInitials: false,
      hasSignatureMarker: false,
      looksLikeAcknowledgment: false,
    };
  }

  const mentionsPublicVisibility = /\bpublic(?:ly)?\b|\bweb\b/i.test(text);
  const hasUnderstandClause = /\bi\s+understand\b/i.test(text);
  const hasVisibilityIntent = /(won['’]t|will not|don['’]?t)\s+put\s+anything\s+here/i.test(text);
  const datePattern = /(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}|MM[\/-]DD[\/-]YYYY)/;
  const initialsPattern = /(?:(?:\b[A-Z]\.){2,6}\b|\b[A-Z](?:\s+[A-Z]){1,5}\b|\b[A-Z]{2,6}\b|\b[A-Z]{1,6}[\/-][A-Z]{1,6}\b|\b[A-Z]\.\s*[A-Z](?:\.)?\b)/;
  const hasDate = datePattern.test(text);
  const hasInitials = initialsPattern.test(text);
  const hasSignatureMarker = /[-~–—]\s*(?:(?:[A-Z]\.){2,6}|[A-Z]{2,6}|[A-Z](?:\s+[A-Z]){1,5})/u.test(text);
  const looksLikeAcknowledgment =
    (mentionsPublicVisibility && (hasUnderstandClause || hasVisibilityIntent) && (hasDate || hasInitials)) ||
    (hasUnderstandClause && mentionsPublicVisibility);

  return {
    text,
    hasPublicVisibility: mentionsPublicVisibility,
    hasDate,
    hasInitials,
    hasSignatureMarker,
    looksLikeAcknowledgment,
  };
}

function hasAcknowledgmentSignature(element) {
  if (!element) {
    return false;
  }

  return hasAcknowledgmentText(element.textContent || "");
}

function isAcknowledgmentCandidateElement(element) {
  if (!element) {
    return false;
  }

  return isAcknowledgmentCandidateText(element.textContent || "");
}

function findAcknowledgmentElement(block) {
  const stopTags = new Set(["UL", "OL", "BLOCKQUOTE", "HR"]);
  const candidates = [];

  for (let index = 0; index < block.elements.length; index += 1) {
    const element = block.elements[index];

    if (stopTags.has(element.tagName)) {
      break;
    }

    if (!(element.tagName === "P" || /^H[1-6]$/.test(element.tagName))) {
      continue;
    }

    if (normalizeText(element.textContent).length === 0) {
      continue;
    }

    candidates.push(element);

    // Acknowledgment should be near the top; keep search bounded.
    if (candidates.length >= 8) {
      break;
    }
  }

  const strictMatch = candidates.find((candidate) => hasAcknowledgmentSignature(candidate));

  if (strictMatch) {
    return strictMatch;
  }

  return candidates.find((candidate) => isAcknowledgmentCandidateElement(candidate)) || null;
}

function isLikelyEntryHeadingText(textValue) {
  const text = normalizeText(textValue);

  if (!text) {
    return false;
  }

  const lowered = text.toLowerCase();

  if (BLOCKED_ENTRY_HEADING_PHRASES.some((phrase) => lowered.includes(phrase))) {
    return false;
  }

  if (isAcknowledgmentCandidateText(text)) {
    return false;
  }

  if (text.length > 60 || /[!?]/.test(text) || /\d{1,2}[\/.\-]\d{1,2}/.test(text)) {
    return false;
  }

  if (/[|~*]/.test(text)) {
    return false;
  }

  const tokenMatches = text.match(/[\p{L}][\p{L}'’\-.]*/gu) || [];
  if (tokenMatches.length < 2 || tokenMatches.length > 6) {
    return false;
  }

  const capitalizedTokenCount = tokenMatches.filter((token) => /^[\p{Lu}]/u.test(token)).length;
  return capitalizedTokenCount >= 2;
}

function collectIntroBlocks(doc) {
  const allHeadings = Array.from(doc.querySelectorAll("h2"));
  const entryHeadings = allHeadings.filter((heading) =>
    isLikelyEntryHeadingText(heading.textContent || ""),
  );

  return entryHeadings.map((heading, index) => {
    const name = normalizeText(heading.textContent);
    const previousHeading = index > 0 ? entryHeadings[index - 1] : null;
    const nextHeading = index + 1 < entryHeadings.length ? entryHeadings[index + 1] : null;
    const elements = [];
    let node = heading.nextElementSibling;

    while (node && node !== nextHeading) {
      elements.push(node);
      node = node.nextElementSibling;
    }

    return {
      heading,
      name,
      elements,
      previousHeading,
      nextHeading,
    };
  });
}

function getLastNameSortKey(nameValue) {
  const name = normalizeText(nameValue);

  if (!name) {
    return "";
  }

  const source = name.includes(",")
    ? name.split(",")[0]
    : (name.split(/\s+/).slice(-1)[0] || name);

  return source
    .toLowerCase()
    .replace(/[^\p{L}]/gu, "");
}

function applyAlphabeticalOrderIssues(results) {
  let previousKey = "";

  results.forEach((result) => {
    const currentKey = getLastNameSortKey(result.name);

    if (!currentKey) {
      return;
    }

    if (previousKey && currentKey < previousKey) {
      result.issues.unshift(ISSUE_MESSAGES.entryNotAlphabetized);
    }

    previousKey = currentKey;
  });
}

function normalizeLabelKey(label) {
  const cleaned = normalizeText(label)
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\band\b/g, "&")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s*,\s*/g, ", ")
    .trim();

  if (cleaned === "primary computer") {
    return "primary work computer";
  }

  if (
    cleaned === "courses i'm taking & why" ||
    cleaned === "courses i’m taking & why" ||
    cleaned === "courses i'm taking, & why" ||
    cleaned === "courses i’m taking, & why"
  ) {
    return "courses i'm taking, & why";
  }

  if (cleaned === "operating system and version") {
    return "operating system & version";
  }

  if (
    cleaned === "backup work computer & location plan" ||
    cleaned === "backup work computer and location plan" ||
    cleaned === "backup computer & location plan" ||
    cleaned === "backup computer and location plan"
  ) {
    return "backup work computer & location plan";
  }

  return cleaned;
}

function findLabeledListItems(block) {
  const labels = new Map();
  const boldClasses = getBoldClassesForDocument(block.heading.ownerDocument);
  const upsertLabel = (labelText, item, isBold) => {
    const normalized = normalizeLabelKey(labelText);

    if (!normalized) {
      return;
    }

    const existing = labels.get(normalized);
    labels.set(normalized, {
      item,
      isBold: Boolean(existing && existing.isBold) || Boolean(isBold),
    });
  };

  const listItems = block.elements.flatMap((element) =>
    Array.from(element.querySelectorAll("li")),
  );

  listItems.forEach((item) => {
    const itemText = normalizeText(item.textContent);
    const strong = item.querySelector("strong");

    if (strong) {
      const strongLabel = normalizeText(strong.textContent).replace(/\s*:\s*$/, "");

      if (strongLabel) {
        upsertLabel(strongLabel, item, elementIsBold(strong, boldClasses));
      }
    }

    // Google Docs often flattens bold markers; parse plain-text labels too.
    const textLabels = itemText.match(/[A-Za-z][A-Za-z'’&,\-\s]+?:/g) || [];
    textLabels.forEach((rawLabel) => {
      const cleaned = rawLabel.replace(/:\s*$/, "");
      const labelCandidates = Array.from(item.querySelectorAll("span, b, strong"));
      const labelIsBold = labelCandidates.some((node) => {
        const nodeText = normalizeText(node.textContent);
        return nodeText.includes(cleaned) && elementIsBold(node, boldClasses);
      }) || elementIsBold(item, boldClasses);
      // Google Docs published HTML frequently strips reliable inline bold markers from list labels.
      // If we can parse a valid "Label:" in a bullet item, treat it as bold unless there is strong evidence otherwise.
      upsertLabel(cleaned, item, labelIsBold || textLabels.length > 0);
    });

  });

  // Google Docs sometimes exports bullets as paragraph lines, not semantic <li> nodes.
  const paragraphLikeElements = block.elements.filter((element) =>
    element.tagName === "P" || /^H[1-6]$/.test(element.tagName),
  );

  paragraphLikeElements.forEach((element) => {
    const lines = (element.textContent || "")
      .split(/\r?\n/)
      .map((line) => normalizeText(line))
      .filter(Boolean);

    lines.forEach((line) => {
      const bulletMatch = line.match(/^[\u2022●○\-–]\s*([^:]{2,120}):/u);
      const plainMatch = line.match(/^([A-Za-z][A-Za-z'’&,\-\s]{2,120}):/u);
      const matchedLabel = bulletMatch ? bulletMatch[1] : (plainMatch ? plainMatch[1] : "");

      if (!matchedLabel) {
        return;
      }

      const lineSuggestsBold = /^[\u2022●○\-–]\s*[^:]{2,120}:/u.test(line);
      upsertLabel(matchedLabel, element, elementIsBold(element, boldClasses) || lineSuggestsBold);
    });
  });

  return labels;
}

function validateSpacingRule(block) {
  const issues = [];

  const nodesToCheck = [block.heading, ...block.elements];
  const firstParagraph = block.elements.find((element) => element.tagName === "P");

  const hasMultipleSpaces = nodesToCheck.some((element) => {
    const text = (element.textContent || "").replace(/\u00a0/g, " ");
    const lines = text
      .split(/\r?\n/)
      .filter((line) => line.length > 0);

    if (element === firstParagraph && hasAcknowledgmentSignature(firstParagraph)) {
      return lines.some((line) => /(^ {2,}\S)|(\S {2,}\S)/.test(line));
    }

    return lines.some((line) => /(^ {2,}\S)|(\S {2,}\S)/.test(line));
  });

  if (hasMultipleSpaces) {
    issues.push(ISSUE_MESSAGES.multipleSpaces);
  }

  const blockquote = block.elements.find((element) => element.tagName === "BLOCKQUOTE");
  const quoteParagraphIndex = block.elements.findIndex((element) => {
    if (element.tagName !== "P") {
      return false;
    }

    return /["“”]/.test(normalizeText(element.textContent));
  });

  if (!blockquote && quoteParagraphIndex < 0) {
    return issues;
  }

  const blankParagraphBeforeQuote = (() => {
    if (blockquote) {
      const blockquoteIndex = block.elements.indexOf(blockquote);
      const previousElement = block.elements[blockquoteIndex - 1];

      return Boolean(
        previousElement &&
          previousElement.tagName === "P" &&
          normalizeText(previousElement.textContent).length === 0,
      );
    }

    if (quoteParagraphIndex <= 0) {
      return false;
    }

    const previousElement = block.elements[quoteParagraphIndex - 1];

    return Boolean(
      previousElement &&
        previousElement.tagName === "P" &&
        normalizeText(previousElement.textContent).length === 0,
    );
  })();

  if (!blankParagraphBeforeQuote) {
    issues.push("Missing exactly one blank line before the quote.");
  }

  return issues;
}

function validateBlock(block, courseProfile) {
  const issues = [];
  const centeredClasses = getCenteredClassesForDocument(block.heading.ownerDocument);
  const imageCenteredClasses = getImageCenteredClassesForDocument(block.heading.ownerDocument);

  if (!isNameHeadingFormat(block.name)) {
    issues.push(ISSUE_MESSAGES.badNameHeading);
  }

  if (elementIsCentered(block.heading, centeredClasses)) {
    issues.push(ISSUE_MESSAGES.headingShouldBeLeftAligned);
  }

  const unexpectedHeadings = block.elements.filter((element) => {
    if (!/^H[1-6]$/.test(element.tagName)) {
      return false;
    }

    const text = normalizeText(element.textContent || "");
    if (!text) {
      return false;
    }

    return !isNameHeadingFormat(text);
  });

  if (unexpectedHeadings.length > 0) {
    issues.push(ISSUE_MESSAGES.onlyFirstHeadingAllowed);
  }

  const entryPrefixElements = [];
  let previousElement = block.heading.previousElementSibling;

  while (previousElement && previousElement !== block.previousHeading) {
    entryPrefixElements.unshift(previousElement);
    previousElement = previousElement.previousElementSibling;
  }

  let hrBeforeHeadingIndex = -1;
  for (let index = entryPrefixElements.length - 1; index >= 0; index -= 1) {
    const element = entryPrefixElements[index];
    if (element.tagName === "HR" || Boolean(element.querySelector("hr"))) {
      hrBeforeHeadingIndex = index;
      break;
    }
  }

  if (hrBeforeHeadingIndex < 0) {
    issues.push(ISSUE_MESSAGES.missingHrBeforeEntry);
  } else {
    const betweenHrAndHeading = entryPrefixElements.slice(hrBeforeHeadingIndex + 1);
    const hasBlankLineBelowHr = betweenHrAndHeading.some(
      (element) => element.tagName === "P" && normalizeText(element.textContent).length === 0,
    );

    if (!hasBlankLineBelowHr) {
      issues.push(ISSUE_MESSAGES.missingBlankLineBelowHr);
    }
  }

  const acknowledgmentParagraph = findAcknowledgmentElement(block);
  const acknowledgmentInHeading = isAcknowledgmentCandidateText(block.name);
  const acknowledgmentSignals = getAcknowledgmentSignals(
    acknowledgmentParagraph ? acknowledgmentParagraph.textContent || "" : block.name,
  );

  if (!acknowledgmentParagraph && !acknowledgmentInHeading) {
    issues.push(ISSUE_MESSAGES.missingAcknowledgment);
  } else {
    if (!acknowledgmentSignals.hasInitials) {
      issues.push(ISSUE_MESSAGES.acknowledgmentMissingInitials);
    }

    if (!acknowledgmentSignals.hasDate) {
      issues.push(ISSUE_MESSAGES.acknowledgmentMissingDate);
    }

    if (
      acknowledgmentSignals.hasInitials &&
      acknowledgmentSignals.hasDate &&
      !acknowledgmentSignals.hasSignatureMarker
    ) {
      issues.push(ISSUE_MESSAGES.acknowledgmentNeedsSignatureMarker);
    }

    if (elementIsCentered(acknowledgmentParagraph, centeredClasses)) {
      issues.push(ISSUE_MESSAGES.acknowledgmentShouldBeLeftAligned);
    }
  }

  const displayLine = block.elements.find((element) =>
    isDisplayNameLine(element.textContent || "") || isLikelyDisplayNameLine(element.textContent || ""),
  );

  if (!displayLine) {
    issues.push(ISSUE_MESSAGES.missingDisplayName);
  } else if (!elementIsCentered(displayLine, centeredClasses)) {
    issues.push(ISSUE_MESSAGES.displayNameShouldBeCentered);
  }

  const image = block.elements.find((element) => element.tagName === "IMG") ||
    block.elements.find((element) => element.querySelector("img"));

  if (!image) {
    issues.push(ISSUE_MESSAGES.missingPhoto);
  } else {
    const imageElement = image.tagName === "IMG" ? image : image.querySelector("img");
    const isCentered = imageIsCentered(imageElement, centeredClasses, imageCenteredClasses);

    if (!isCentered) {
      issues.push(ISSUE_MESSAGES.photoShouldBeCentered);
    }
  }

  let hasItalicCaption = false;
  let captionElement = null;

  if (image) {
    const imageIndex = block.elements.findIndex(
      (element) => element.tagName === "IMG" || element.querySelector("img"),
    );

    if (imageIndex >= 0) {
      for (let index = imageIndex + 1; index < block.elements.length; index += 1) {
        const candidate = block.elements[index];

        if (["H2", "H3", "UL", "OL", "BLOCKQUOTE"].includes(candidate.tagName)) {
          break;
        }

        if (candidate.tagName !== "P") {
          continue;
        }

        const captionText = normalizeText(candidate.textContent);

        if (!captionText) {
          continue;
        }

        const hasItalicMarkup = Boolean(candidate.querySelector("em, i"));
        const isLikelyCaptionLength = captionText.split(" ").length <= 20;

        // Google Docs published pages frequently encode italics via generated CSS classes,
        // not semantic <em>/<i> tags. Treat a short paragraph immediately under the image as caption.
        if (hasItalicMarkup || isLikelyCaptionLength) {
          hasItalicCaption = true;
          captionElement = candidate;
        }

        break;
      }
    }
  }

  if (!hasItalicCaption) {
    issues.push(ISSUE_MESSAGES.missingCaption);
  } else if (captionElement && !elementIsCentered(captionElement, centeredClasses)) {
    issues.push(ISSUE_MESSAGES.captionShouldBeCentered);
  }

  const paragraphText = block.elements
    .filter((element) => element.tagName === "P")
    .map((element) => normalizeText(element.textContent))
    .filter((text) => text.length > 0);

  const personalStatement = paragraphText.find((text) => countSentences(text) >= 3);
  const personalStatementElement = block.elements
    .filter((element) => element.tagName === "P")
    .find((element) => countSentences(normalizeText(element.textContent)) >= 3);

  if (!personalStatement) {
    issues.push(ISSUE_MESSAGES.missingPersonalStatement);
  } else if (personalStatementElement && elementIsCentered(personalStatementElement, centeredClasses)) {
    issues.push(ISSUE_MESSAGES.personalStatementShouldBeLeftAligned);
  }
  const labels = findLabeledListItems(block);

  REQUIRED_LABELS.forEach((label) => {
    const key = normalizeLabelKey(label);
    const labelInfo = labels.get(key);

    if (!labelInfo) {
      issues.push(`Missing required bulleted item: ${label}.`);
      return;
    }

    if (!labelInfo.isBold) {
      issues.push(`Label before colon must be bold: ${label}.`);
    }
  });

  const coursesItem = labels.get(normalizeLabelKey("courses i'm taking, & why"));

  if (coursesItem) {
    const nestedCourses = Array.from(coursesItem.item.querySelectorAll(":scope > ul > li"));

    // Google Docs published HTML often exports nested list levels as sibling UL blocks.
    let siblingNestedCourses = [];
    const coursesContainer = block.elements.find(
      (element) => element === coursesItem.item || element.contains(coursesItem.item),
    );

    if (coursesContainer) {
      const containerIndex = block.elements.indexOf(coursesContainer);
      const nextElement = block.elements[containerIndex + 1];

      if (nextElement && nextElement.tagName === "UL") {
        siblingNestedCourses = Array.from(nextElement.querySelectorAll(":scope > li"));
      }
    }

    if (nestedCourses.length === 0 && siblingNestedCourses.length === 0) {
      issues.push(ISSUE_MESSAGES.missingNestedCourses);
    }
  }

  const blockquote = block.elements.find((element) => element.tagName === "BLOCKQUOTE") ||
    block.elements.find((element) => element.querySelector("blockquote"));

  let hasQuote = false;
  let hasAttribution = false;
  let attributionStartsWithMarker = true;
  let quoteAndAttributionSameLine = false;
  let quoteAttributionElement = null;
  let quoteStartElement = null;
  let quoteStartLine = "";

  if (blockquote) {
    const quoteElement = blockquote.tagName === "BLOCKQUOTE" ? blockquote : blockquote.querySelector("blockquote");
    const quoteText = normalizeText(quoteElement ? quoteElement.textContent : "");
    const quoteFooter = quoteElement ? quoteElement.querySelector("footer") : null;

    hasQuote = Boolean(quoteText && quoteText.length >= 8);
    quoteStartElement = quoteElement || null;
    quoteStartLine = quoteText || "";
    hasAttribution = Boolean(quoteFooter && normalizeText(quoteFooter.textContent).length > 0);
    if (quoteFooter && hasAttribution) {
      attributionStartsWithMarker = /^[\-~\u2010-\u2015\u2212]/u.test(normalizeText(quoteFooter.textContent));
    }
    quoteAttributionElement = quoteFooter || null;
  } else {
    // Google Docs published HTML often uses plain paragraphs instead of semantic blockquote/footer.
    const textLineElements = block.elements
      .filter((element) => ["P", "UL", "OL", "BLOCKQUOTE"].includes(element.tagName));

    const textLines = textLineElements
      .map((element) => normalizeText(element.textContent))
      .filter((text) => text.length > 0);

    const quoteLineIndex = textLines.findIndex((line) => /["“”]/.test(line));

    if (quoteLineIndex >= 0) {
      hasQuote = textLines[quoteLineIndex].length >= 8;
      const quoteLine = textLines[quoteLineIndex];
      const quoteElement = textLineElements[quoteLineIndex] || null;
      const quoteElementIndex = quoteElement ? block.elements.indexOf(quoteElement) : -1;
      quoteStartElement = quoteElement;
      quoteStartLine = quoteLine;

      const sameLineAttribution = /\s[-\u2013\u2014]\s+[A-Za-z]/.test(quoteLine);
      const nextLine = textLines[quoteLineIndex + 1] || "";
      const nextLineAttribution = /^[-\u2013\u2014]\s*.+/.test(nextLine);

      const nextElement = quoteElementIndex >= 0 ? block.elements[quoteElementIndex + 1] : null;
      const nextElementAttribution = Boolean(
        nextElement &&
        ["P", "UL", "OL", "BLOCKQUOTE"].includes(nextElement.tagName) &&
        normalizeText(nextElement.textContent).length > 0 &&
        !/^table of contents$/i.test(normalizeText(nextElement.textContent)),
      );

      const nextElementText = nextElement ? normalizeText(nextElement.textContent) : "";

      hasAttribution = sameLineAttribution || nextLineAttribution || nextElementAttribution;
      quoteAndAttributionSameLine = sameLineAttribution && !nextLineAttribution;
      quoteAttributionElement = nextElementAttribution ? nextElement : null;

      if (nextLineAttribution) {
        attributionStartsWithMarker = /^[\-~\u2010-\u2015\u2212]/u.test(nextLine);
      } else if (nextElementAttribution) {
        attributionStartsWithMarker = /^[\-~\u2010-\u2015\u2212]/u.test(nextElementText);
      } else if (sameLineAttribution) {
        attributionStartsWithMarker = /\s[\-~\u2010-\u2015\u2212]\s+[A-Za-z]/u.test(quoteLine);
      }

      if (quoteElement && !elementIsCentered(quoteElement, centeredClasses)) {
        issues.push(ISSUE_MESSAGES.quoteShouldBeCentered);
      }

      if (nextElement && nextElementAttribution && !elementIsCentered(nextElement, centeredClasses)) {
        issues.push(ISSUE_MESSAGES.quoteAttributionShouldBeCentered);
      }
    }
  }

  const lastNonEmptyBulletIndex = (() => {
    for (let index = block.elements.length - 1; index >= 0; index -= 1) {
      const element = block.elements[index];
      const hasVisibleText = normalizeText(element.textContent || "").length > 0;
      if ((element.tagName === "UL" || element.tagName === "OL") && hasVisibleText) {
        return index;
      }
    }
    return -1;
  })();

  if (lastNonEmptyBulletIndex >= 0) {
    const quoteStartAfterBullets = (() => {
      for (let index = lastNonEmptyBulletIndex + 1; index < block.elements.length; index += 1) {
        const candidate = block.elements[index];
        const candidateText = normalizeText(candidate.textContent || "");

        if (/["“”]/.test(candidateText)) {
          return {
            element: candidate,
            line: candidateText,
          };
        }
      }

      return null;
    })();

    const labelQuoteElement = quoteStartAfterBullets ? quoteStartAfterBullets.element : quoteStartElement;
    const labelQuoteLine = quoteStartAfterBullets ? quoteStartAfterBullets.line : quoteStartLine;
    const quoteStartIndex = labelQuoteElement ? block.elements.indexOf(labelQuoteElement) : -1;
    const bulletBoundaryIndex = (() => {
      if (quoteStartIndex >= 0) {
        for (let index = quoteStartIndex - 1; index >= 0; index -= 1) {
          const element = block.elements[index];
          const hasVisibleText = normalizeText(element.textContent || "").length > 0;
          if ((element.tagName === "UL" || element.tagName === "OL") && hasVisibleText) {
            return index;
          }
        }
      }

      return lastNonEmptyBulletIndex;
    })();

    const beforeQuoteElements = block.elements.slice(
      bulletBoundaryIndex,
      quoteStartIndex >= 0 ? quoteStartIndex : block.elements.length,
    );

    const isDisallowedQuoteLabel = (textValue) => {
      const normalized = normalizeText(textValue);

      // Covers standalone "Quote:" labels, line-start labels with attribution
      // ("Quote: Mark Twain: ..."), and flattened Google Docs cases where
      // the label is appended directly before the opening quote (..."coursesQuote:").
      return /^quote\b/i.test(normalized) || /quote\b\s*:?\s*$/i.test(normalized);
    };

    const hasQuoteWordBeforeQuote = beforeQuoteElements.some((element) => {
      const lines = (element.textContent || "")
        .split(/\r?\n/)
        .map((line) => normalizeText(line))
        .filter(Boolean);

      return lines.some((line) => isDisallowedQuoteLabel(line));
    });

    const quoteLinePrefix = labelQuoteLine.split(/["“”]/)[0] || "";
    const hasQuoteWordInQuotePrefix = labelQuoteElement
      ? isDisallowedQuoteLabel(quoteLinePrefix)
      : false;

    if (hasQuoteWordBeforeQuote || hasQuoteWordInQuotePrefix) {
      issues.push(ISSUE_MESSAGES.quoteLabelShouldBeOmitted);
    }
  }

  if (!hasQuote) {
    issues.push(ISSUE_MESSAGES.missingFavoriteQuote);
  }

  if (hasQuote && !hasAttribution) {
    issues.push(ISSUE_MESSAGES.missingQuoteAttribution);
  }

  if (hasQuote && hasAttribution && !attributionStartsWithMarker) {
    issues.push(ISSUE_MESSAGES.quoteAttributionMarker);
  }

  if (hasQuote && quoteAndAttributionSameLine) {
    issues.push(ISSUE_MESSAGES.quoteAttributionSeparateLine);
  }

  validateSpacingRule(block).forEach((issue) => issues.push(issue));

  const anchors = block.elements.flatMap((element) =>
    Array.from(element.querySelectorAll("a")).map((anchor) => ({
      label: normalizeLinkLabel(anchor.textContent || ""),
      text: normalizeText(anchor.textContent || ""),
      href: resolveGoogleRedirectUrl(anchor.getAttribute("href") || ""),
    })),
  );

  const linkContainerInfo = block.elements
    .map((element) => {
      const elementAnchors = Array.from(element.querySelectorAll("a")).map((anchor) =>
        normalizeLinkLabel(anchor.textContent || ""),
      );
      const labelSet = new Set(elementAnchors.filter(Boolean));
      const requiredLabelMatches = REQUIRED_LINKS.filter((requiredLink) => labelSet.has(requiredLink.key)).length;
      const dividerCount = ((element.textContent || "").match(/\|/g) || []).length;
      const centered = elementOrAncestorIsCentered(element, centeredClasses);

      return {
        element,
        requiredLabelMatches,
        dividerCount,
        anchorCount: elementAnchors.length,
        centered,
      };
    })
    .filter((info) => info.anchorCount > 0)
    .sort((left, right) => {
      if (right.requiredLabelMatches !== left.requiredLabelMatches) {
        return right.requiredLabelMatches - left.requiredLabelMatches;
      }
      if (right.dividerCount !== left.dividerCount) {
        return right.dividerCount - left.dividerCount;
      }
      if (Number(right.centered) !== Number(left.centered)) {
        return Number(right.centered) - Number(left.centered);
      }
      return right.anchorCount - left.anchorCount;
    })
    .find((info) =>
      info.anchorCount >= 2 ||
      (info.anchorCount >= 1 && info.dividerCount >= 1) ||
      info.requiredLabelMatches >= 2
    ) || null;

  const hasAnyLinkLikeContent = linkContainerInfoList =>
    linkContainerInfoList.some((info) => info.anchorCount > 0);

  const linkCandidates = block.elements
    .map((element) => {
      const anchorCount = element.querySelectorAll("a").length;
      return { anchorCount };
    });

  const linkContainer = linkContainerInfo ? linkContainerInfo.element : null;

  REQUIRED_LINKS.forEach((requiredLink) => {
    if (!anchors.some((anchor) => anchor.label === requiredLink.key)) {
      issues.push(`Missing required link label: ${requiredLink.display}.`);
    }
  });

  const findAnchor = (label) => anchors.find((anchor) => anchor.label === label);
  const cltWeb = findAnchor("clt web");
  const github = findAnchor("github");
  const githubIo = findAnchor("github.io");
  const freecodecamp = findAnchor("freecodecamp");
  const codecademy = findAnchor("codecademy");
  const linkedin = findAnchor("linkedin");

  if (cltWeb && !/^https:\/\/webpages\.charlotte\.edu\/[a-z]{2}[a-z0-9]*\/?$/i.test(cltWeb.href)) {
    issues.push("CLT Web link must match https://webpages.charlotte.edu/xy... pattern.");
  }

  let githubUser = "";

  if (github) {
    const match = github.href.match(/^https:\/\/github\.com\/([a-z0-9-]+)\/?$/i);
    if (!match) {
      issues.push("GitHub link must match https://github.com/xyz pattern.");
    } else {
      githubUser = match[1].toLowerCase();
    }
  }

  if (githubIo) {
    const match = githubIo.href.match(/^https:\/\/([a-z0-9-]+)\.github\.io\/?$/i);
    if (!match) {
      issues.push("GitHub.io link must match https://xyz.github.io pattern.");
    } else if (githubUser && match[1].toLowerCase() !== githubUser) {
      issues.push("GitHub.io username must match the GitHub username.");
    }
  }

  if (freecodecamp && !/^https:\/\/(www\.)?freecodecamp\.org\/.+/i.test(freecodecamp.href)) {
    issues.push("freeCodeCamp link must point to a freeCodeCamp profile URL.");
  }

  if (codecademy && !/^https:\/\/(www\.)?codecademy\.com\/.+/i.test(codecademy.href)) {
    issues.push("Codecademy link must point to a Codecademy profile URL.");
  }

  if (linkedin && !/^https:\/\/(www\.)?linkedin\.com\/.+/i.test(linkedin.href)) {
    issues.push("LinkedIn link must point to a LinkedIn profile URL.");
  }

  if (!linkContainer) {
    if (hasAnyLinkLikeContent(linkCandidates)) {
      issues.push(ISSUE_MESSAGES.linksNotOnSingleCenteredLine);
    } else {
      issues.push(ISSUE_MESSAGES.missingLinksLine);
    }
  } else {
    if (!elementOrAncestorIsCentered(linkContainer, centeredClasses)) {
      issues.push(ISSUE_MESSAGES.linksLineCentered);
    }

    const dividerCount = linkContainerInfo ? linkContainerInfo.dividerCount : 0;
    if (dividerCount < 5) {
      issues.push(ISSUE_MESSAGES.linksNeedDividers);
    }
  }

  if (quoteAttributionElement && linkContainer) {
    const attributionIndex = block.elements.indexOf(quoteAttributionElement);
    const linkContainerIndex = block.elements.indexOf(linkContainer);

    if (attributionIndex >= 0 && linkContainerIndex > attributionIndex) {
      const between = block.elements.slice(attributionIndex + 1, linkContainerIndex);
      const blankParagraphs = between.filter(
        (element) => element.tagName === "P" && normalizeText(element.textContent).length === 0,
      ).length;

      if (blankParagraphs < 1) {
        issues.push(ISSUE_MESSAGES.missingBlankLineBeforeLinks);
      }
    }
  }

  const hrIndex = block.elements.findIndex(
    (element) => element.tagName === "HR" || Boolean(element.querySelector("hr")),
  );

  if (hrIndex < 0) {
    issues.push(ISSUE_MESSAGES.missingSeparatorHr);
  } else {
    const hasBlankLineBeforeHr = block.elements
      .slice(0, hrIndex)
      .some((element) => element.tagName === "P" && normalizeText(element.textContent).length === 0);

    if (!hasBlankLineBeforeHr) {
      issues.push(ISSUE_MESSAGES.missingBlankLineBeforeSeparatorHr);
    }
  }

  if (!courseProfile.requireLinks) {
    for (let index = issues.length - 1; index >= 0; index -= 1) {
      const issue = issues[index];
      const isLinkIssue = LINK_ISSUE_PATTERNS.some((pattern) => pattern.test(issue));

      if (isLinkIssue) {
        issues.splice(index, 1);
      }
    }
  }

  const multipleSpacesIssue = ISSUE_MESSAGES.multipleSpaces;
  const missingAdditionalBlankLineIssue = ISSUE_MESSAGES.missingBlankLineBeforeLinks;
  const missingHrIssue = ISSUE_MESSAGES.missingSeparatorHr;
  const missingBlankBeforeHrIssue = ISSUE_MESSAGES.missingBlankLineBeforeSeparatorHr;
  const multipleSpacesIndex = issues.indexOf(multipleSpacesIssue);
  const missingAdditionalBlankLineIndex = issues.indexOf(missingAdditionalBlankLineIssue);

  if (multipleSpacesIndex >= 0) {
    issues.splice(multipleSpacesIndex, 1);

    let insertIndex = issues.indexOf(missingAdditionalBlankLineIssue);
    if (insertIndex < 0) {
      insertIndex = issues.indexOf(missingHrIssue);
    }
    if (insertIndex < 0) {
      insertIndex = issues.indexOf(missingBlankBeforeHrIssue);
    }
    if (insertIndex < 0) {
      insertIndex = issues.length;
    }

    issues.splice(insertIndex, 0, multipleSpacesIssue);
  }

  return issues;
}

function wrapLinesWithPrefix(prefix, text, width) {
  const maxWidth = width || 100;
  const words = String(text || "").split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [prefix.trimEnd()];
  }

  const lines = [];
  let currentLine = prefix;

  words.forEach((word) => {
    const candidate = currentLine.length > prefix.length ? `${currentLine} ${word}` : `${prefix}${word}`;

    if (candidate.length <= maxWidth) {
      currentLine = candidate;
      return;
    }

    if (currentLine.length > prefix.length) {
      lines.push(currentLine);
      currentLine = `${" ".repeat(prefix.length)}${word}`;
    } else {
      lines.push(candidate);
      currentLine = prefix;
    }
  });

  if (currentLine.length > prefix.length) {
    lines.push(currentLine);
  }

  return lines;
}

function formatGroupedIssueLines(issues) {
  const formattedLines = [];
  const groupPrefixes = [
    "Missing required bulleted item:",
    "Missing required link label:",
  ];

  let activeGroup = null;
  let issueNumber = 1;

  const flushActiveGroup = () => {
    if (!activeGroup) {
      return;
    }

    formattedLines.push(`  ${issueNumber}. ${activeGroup.prefix} ${activeGroup.items.join(", ")}`.trimEnd());
    issueNumber += 1;
    activeGroup = null;
  };

  issues.forEach((issue) => {
    const matchedPrefix = groupPrefixes.find((prefix) => issue.startsWith(prefix));

    if (!matchedPrefix) {
      flushActiveGroup();
      formattedLines.push(`  ${issueNumber}. ${issue}`);
      issueNumber += 1;
      return;
    }

    const itemText = issue.slice(matchedPrefix.length).trim();

    if (!activeGroup || activeGroup.prefix !== matchedPrefix) {
      flushActiveGroup();
      activeGroup = {
        prefix: matchedPrefix,
        items: [],
      };
    }

    if (itemText) {
      activeGroup.items.push(itemText.replace(/^:\s*/, ""));
    }
  });

  flushActiveGroup();

  return formattedLines;
}

function formatReport(results, courseProfile) {
  if (results.length === 0) {
    return "- No Heading 2 introduction entries were found in the target document.";
  }

  const lines = [];
  const checkedItemCount = courseProfile.checkedItemCount;

  results.forEach((result) => {
    const issueCountLabel = result.issues.length === 1 ? "issue" : "issues";
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(`- ${result.name}`);
    lines.push(...wrapLinesWithPrefix("  ", `Checked ${checkedItemCount} items, found ${result.issues.length} ${issueCountLabel}:`, 100));

    if (result.issues.length === 0) {
      lines.push(...wrapLinesWithPrefix("  - ", "No issues found. Meets listed requirements.", 100));
      return;
    }

    lines.push(...formatGroupedIssueLines(result.issues));
  });

  return lines.join("\n");
}

async function evaluateIntroductionsFromUrl() {
  const { lastUrl, lastTitle, lastCourseProfile } = loadLastRunState();
  const queryConfig = getRunConfigFromQuery();
  const hasPrompt = typeof window.prompt === "function";
  const reportTitle = queryConfig.title || (hasPrompt ? promptForReportTitle(lastTitle) : "");

  if (reportTitle === null) {
    console.info("Evaluation canceled by user.");
    return;
  }

  if (!reportTitle) {
    if (!hasPrompt) {
      console.error("No report title available. Provide ?title=... in the URL when prompt() is unavailable.");
      return;
    }
    console.error("No report title entered. Please run again and provide a title.");
    return;
  }

  let courseProfile = null;
  const queryCourse = queryConfig.course.toLowerCase();
  if (queryCourse === "web") {
    courseProfile = COURSE_PROFILES.web;
  } else if (queryCourse === "cis110" || queryCourse === "cis 110") {
    courseProfile = COURSE_PROFILES.cis110;
  } else {
    courseProfile = hasPrompt ? promptForCourseProfile(lastCourseProfile, reportTitle) : null;
  }

  if (courseProfile === null) {
    console.info("Evaluation canceled by user.");
    return;
  }

  if (!courseProfile) {
    console.error("No valid course profile entered. Please run again and enter WEB or CIS110.");
    return;
  }

  const urlInput = queryConfig.url || (hasPrompt
    ? window.prompt(
      "Enter the full URL that contains the introduction entries:",
      lastUrl || "",
    )
    : "");

  if (urlInput === null) {
    console.info("Evaluation canceled by user.");
    return;
  }

  const url = normalizeText(urlInput);

  if (!url) {
    if (!hasPrompt) {
      console.error("No URL available. Provide ?url=... in the URL when prompt() is unavailable.");
      return;
    }
    console.error("No URL entered. Please run again and provide a valid URL.");
    return;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const introBlocks = collectIntroBlocks(doc);

    const results = introBlocks.map((block) => ({
      name: block.name,
      issues: validateBlock(block, courseProfile),
    }));

    applyAlphabeticalOrderIssues(results);

    const report = formatReport(results, courseProfile);
    saveLastRunState(url, reportTitle, courseProfile.key);

    console.log(`${reportTitle}:\n` + report);

    // Provide a copy-friendly report in-page for quick review.
    const output = document.createElement("pre");
    output.id = "introductions-compliance-report";
    output.textContent = `${reportTitle}:\n` + report;
    output.style.whiteSpace = "pre-wrap";
    output.style.padding = "1rem";
    output.style.border = "1px solid #aaa";
    output.style.background = "#f8f8f8";

    const existing = document.getElementById("introductions-compliance-report");
    if (existing) {
      existing.replaceWith(output);
    } else {
      document.body.appendChild(output);
    }
  } catch (error) {
    console.error(
      "Unable to evaluate introductions from URL. This may be a network or CORS issue.",
      error,
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void evaluateIntroductionsFromUrl();
});

/*
Usage notes:
- Run this script in a browser context where prompt(), fetch(), and DOMParser are available.
- The target URL must be accessible from the browser; CORS restrictions may block requests.
- The evaluator remembers the last URL and report title using localStorage.
- The spacing rule check is a best-effort heuristic because HTML rendering can normalize whitespace.
*/