/* How Edgeweaver Works: dependency-free progressive enhancement.
   Navigation, both reading registers, and all authored content remain available
   without this file. Search is local and deterministic. Nothing leaves the
   device, and no query or interaction is logged. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");
  var pageShell = document.querySelector("[data-page-slug]");
  var rootPrefix = pageShell ? pageShell.getAttribute("data-root") || "" : "";
  var artifact = document.body.hasAttribute("data-artifact");

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  // Theme.
  var storedTheme = storageGet("ew-theme");
  if (storedTheme === "dark" || storedTheme === "light") root.setAttribute("data-theme", storedTheme);
  var themeBtn = document.querySelector(".theme-toggle");
  function darkNow() {
    var forced = root.getAttribute("data-theme");
    var media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return forced ? forced === "dark" : media;
  }
  function syncTheme() {
    if (!themeBtn) return;
    var dark = darkNow();
    themeBtn.textContent = dark ? "Light" : "Dark";
    themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
  }
  if (themeBtn) {
    themeBtn.hidden = false;
    themeBtn.addEventListener("click", function () {
      var next = darkNow() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      storageSet("ew-theme", next);
      syncTheme();
    });
    syncTheme();
  }

  // Upgrade adjacent register eyebrows into explicit sections when an older
  // authored page has not yet received the source-level wrappers.
  function wrapRegisters(scope) {
    var eyebrows = Array.prototype.slice.call(scope.querySelectorAll("span.register.plain, span.register.technical"));
    eyebrows.forEach(function (eyebrow) {
      if (eyebrow.closest("[data-register]")) return;
      var type = eyebrow.classList.contains("plain") ? "plain" : "technical";
      var section = document.createElement("section");
      section.setAttribute("data-register", type);
      eyebrow.parentNode.insertBefore(section, eyebrow);
      var node = eyebrow;
      var sawHeading = false;
      while (node) {
        if (node !== eyebrow && node.nodeType === 1) {
          if (node.matches("span.register.plain, span.register.technical")) break;
          if (type === "technical" && node.matches("h2") && sawHeading) break;
          if (node.matches("h2")) sawHeading = true;
        }
        var next = node.nextSibling;
        section.appendChild(node);
        node = next;
      }
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("main"), wrapRegisters);

  // Plain / Technical / Both reading lens.
  var readingControls = document.querySelector(".reading-controls");
  var lensAnnouncer = document.getElementById("lens-announcer");
  var hasPlain = !!document.querySelector('[data-register="plain"]');
  var hasTechnical = !!document.querySelector('[data-register="technical"]');
  var storedReading = storageGet("ew-reading");
  if (storedReading !== "plain" && storedReading !== "technical" && storedReading !== "both") storedReading = "both";

  function syncReadingButtons(choice) {
    if (!readingControls) return;
    Array.prototype.forEach.call(readingControls.querySelectorAll("[data-reading-choice]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-reading-choice") === choice ? "true" : "false");
    });
  }
  function setReading(choice, persist, announce) {
    root.setAttribute("data-reading", choice);
    syncReadingButtons(choice);
    if (persist) storageSet("ew-reading", choice);
    if (announce && lensAnnouncer) lensAnnouncer.textContent = announce;
  }
  if (readingControls && hasPlain && hasTechnical) {
    readingControls.hidden = false;
    setReading(storedReading, false, "");
    readingControls.addEventListener("click", function (event) {
      var button = event.target.closest("[data-reading-choice]");
      if (!button) return;
      setReading(button.getAttribute("data-reading-choice"), true, "Reading detail changed.");
    });
  } else {
    setReading("both", false, "");
  }

  function revealHashTarget() {
    if (!window.location.hash) return;
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (error) { id = window.location.hash.slice(1); }
    var target = document.getElementById(id);
    if (!target) return;
    var register = target.closest("[data-register]");
    var choice = root.getAttribute("data-reading") || "both";
    if (register && choice !== "both" && register.getAttribute("data-register") !== choice) {
      setReading("both", false, "Both reading registers were shown so the linked section is visible.");
    }
  }
  window.addEventListener("hashchange", revealHashTarget);
  revealHashTarget();

  // Mobile navigation becomes modal only after JavaScript is active.
  var navBtn = document.querySelector(".nav-toggle");
  var navClose = document.querySelector(".nav-close");
  var sidebar = document.getElementById("sidebar");
  var backdrop = document.querySelector(".nav-backdrop");
  var navReturn = null;

  function focusables(container) {
    return Array.prototype.slice.call(container.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')).filter(function (item) {
      return !item.hidden && item.getAttribute("aria-hidden") !== "true";
    });
  }
  function closeNav(restore) {
    if (!sidebar || !sidebar.classList.contains("open")) return;
    sidebar.classList.remove("open");
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
    document.body.classList.remove("nav-open");
    if (backdrop) backdrop.hidden = true;
    if (navClose) navClose.hidden = true;
    if (navBtn) navBtn.setAttribute("aria-expanded", "false");
    if (restore && navReturn && typeof navReturn.focus === "function") navReturn.focus();
  }
  function openNav() {
    if (!sidebar) return;
    navReturn = document.activeElement;
    sidebar.classList.add("open");
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
    document.body.classList.add("nav-open");
    if (backdrop) backdrop.hidden = false;
    if (navClose) navClose.hidden = false;
    if (navBtn) navBtn.setAttribute("aria-expanded", "true");
    var targets = focusables(sidebar);
    if (targets.length) targets[0].focus();
  }
  if (navBtn && sidebar) {
    navBtn.hidden = false;
    navBtn.addEventListener("click", function () {
      if (sidebar.classList.contains("open")) closeNav(true);
      else openNav();
    });
    if (navClose) navClose.addEventListener("click", function () { closeNav(true); });
    if (backdrop) backdrop.addEventListener("click", function () { closeNav(true); });
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("a[href]")) closeNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (!sidebar.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeNav(true);
        return;
      }
      if (event.key !== "Tab") return;
      var targets = focusables(sidebar);
      if (!targets.length) return;
      var first = targets[0];
      var last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    if (window.matchMedia) {
      var mobileQuery = window.matchMedia("(max-width: 900px)");
      var mediaChanged = function (event) { if (!event.matches) closeNav(false); };
      if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", mediaChanged);
      else if (mobileQuery.addListener) mobileQuery.addListener(mediaChanged);
    }
  }

  // Local full-text search.
  var searchData = window.EDGEWEAVER_SEARCH_INDEX;
  var searchBtn = document.querySelector(".search-toggle");
  var searchDialog = document.getElementById("site-search");
  var searchInput = document.getElementById("search-input");
  var searchResults = document.getElementById("search-results");
  var searchCount = document.getElementById("search-count");
  var searchReturn = null;
  var resultState = [];
  var activeResult = -1;

  function normal(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function scoreRecord(record, query, tokens) {
    var path = normal(record.filePath);
    var title = normal(record.title);
    var heading = normal(record.heading);
    var text = normal(record.text);
    if (path && path === query) return 12000;
    if (title === query) return 11000;
    if (path && path.indexOf(query) === 0) return 10000;
    if (title.indexOf(query) === 0) return 9000;
    if (heading === query) return 8500;
    if (heading.indexOf(query) === 0) return 8000;
    if (tokens.length && tokens.every(function (token) { return heading.indexOf(token) >= 0; })) return 7000;
    if (tokens.length && tokens.every(function (token) { return text.indexOf(token) >= 0 || heading.indexOf(token) >= 0 || path.indexOf(token) >= 0; })) return 6000;
    var partial = tokens.reduce(function (count, token) {
      return count + (text.indexOf(token) >= 0 || heading.indexOf(token) >= 0 || title.indexOf(token) >= 0 || path.indexOf(token) >= 0 ? 1 : 0);
    }, 0);
    return partial ? 1000 + partial : -1;
  }
  function categoryFor(kind) {
    if (kind === "being") return "Beings";
    if (kind === "procedure" || kind === "reference") return "Reference";
    if (kind === "atlas-file") return "Files";
    return "Concepts";
  }
  function hrefFor(record) {
    if (artifact) return "#" + record.anchor;
    return rootPrefix + record.slug + ".html#" + record.anchor;
  }
  function setActiveResult(next) {
    if (!resultState.length) next = -1;
    if (next >= resultState.length) next = 0;
    if (next < 0 && resultState.length) next = resultState.length - 1;
    activeResult = next;
    Array.prototype.forEach.call(searchResults.querySelectorAll('[role="option"]'), function (item, index) {
      var active = index === activeResult;
      item.setAttribute("aria-selected", active ? "true" : "false");
      item.classList.toggle("active", active);
      if (active) item.scrollIntoView({ block: "nearest" });
    });
    searchInput.setAttribute("aria-activedescendant", activeResult >= 0 ? "search-option-" + activeResult : "");
  }
  function syncSearchExpanded() {
    searchInput.setAttribute("aria-expanded", resultState.length ? "true" : "false");
  }
  function renderSearch() {
    var query = normal(searchInput.value);
    searchResults.textContent = "";
    resultState = [];
    activeResult = -1;
    searchInput.setAttribute("aria-activedescendant", "");
    if (!query) {
      searchCount.textContent = "Type to search.";
      syncSearchExpanded();
      return;
    }
    var tokens = query.split(" ").filter(Boolean);
    resultState = searchData.records.map(function (record, order) {
      return { record: record, order: order, score: scoreRecord(record, query, tokens) };
    }).filter(function (item) { return item.score >= 0; })
      .sort(function (a, b) { return b.score - a.score || a.order - b.order; })
      .slice(0, 50);

    resultState.forEach(function (item, index) {
      var record = item.record;
      var option = document.createElement("li");
      option.id = "search-option-" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.className = "search-option";
      option.setAttribute("data-result-index", String(index));
      var title = document.createElement("strong");
      title.textContent = record.filePath || record.heading || record.title;
      var meta = document.createElement("span");
      meta.className = "search-meta";
      var register = record.register ? " | " + (record.register === "plain" ? "Plain" : "Technical") : "";
      meta.textContent = categoryFor(record.kind) + " | " + record.title + register;
      var excerpt = document.createElement("span");
      excerpt.className = "search-excerpt";
      excerpt.textContent = record.text.length > 180 ? record.text.slice(0, 177) + "..." : record.text;
      option.appendChild(title);
      option.appendChild(meta);
      option.appendChild(excerpt);
      searchResults.appendChild(option);
    });
    searchCount.textContent = resultState.length === 1 ? "1 result." : resultState.length + " results.";
    if (resultState.length) setActiveResult(0);
    syncSearchExpanded();
  }
  function openSearch(opener) {
    if (!searchDialog || !searchData || !Array.isArray(searchData.records)) return;
    searchReturn = opener || document.activeElement;
    if (typeof searchDialog.showModal === "function") searchDialog.showModal();
    else searchDialog.setAttribute("open", "");
    syncSearchExpanded();
    searchInput.focus();
    searchInput.select();
  }
  function closeSearch() {
    if (!searchDialog) return;
    if (typeof searchDialog.close === "function" && searchDialog.open) searchDialog.close();
    else searchDialog.removeAttribute("open");
    searchInput.setAttribute("aria-expanded", "false");
  }
  if (searchBtn && searchDialog && searchInput && searchResults && searchCount && searchData && Array.isArray(searchData.records)) {
    searchBtn.hidden = false;
    searchBtn.addEventListener("click", function () { openSearch(searchBtn); });
    searchInput.addEventListener("input", renderSearch);
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult(activeResult + 1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult(activeResult - 1); }
      else if (event.key === "Enter" && activeResult >= 0) {
        event.preventDefault();
        window.location.href = hrefFor(resultState[activeResult].record);
        closeSearch();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    });
    searchResults.addEventListener("mousemove", function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) setActiveResult(Number(option.id.replace("search-option-", "")));
    });
    searchResults.addEventListener("click", function (event) {
      var option = event.target.closest('[role="option"]');
      if (!option) return;
      var index = Number(option.getAttribute("data-result-index"));
      if (!resultState[index]) return;
      window.location.href = hrefFor(resultState[index].record);
      closeSearch();
    });
    searchDialog.addEventListener("close", function () {
      if (searchReturn && typeof searchReturn.focus === "function") searchReturn.focus();
    });
    searchDialog.addEventListener("cancel", function () { closeSearch(); });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch(document.activeElement);
      }
    });
  }

  // Walkthrough enhancement: local progress ticks and copy buttons. The page
  // reads as a complete ordered checklist without any of this; nothing here
  // leaves the device, and every element is created with textContent only.
  var wtBoxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-wt-step]'));
  if (wtBoxes.length) {
    var WT_KEY = "ew-walkthrough-v1";
    var wtSaved = {};
    try { wtSaved = JSON.parse(storageGet(WT_KEY) || "{}") || {}; } catch (error) { wtSaved = {}; }
    var wtMeterEl = null;
    function wtSave() {
      var out = {};
      wtBoxes.forEach(function (box) {
        if (box.checked) out[box.getAttribute("data-wt-step")] = 1;
      });
      storageSet(WT_KEY, JSON.stringify(out));
    }
    function wtMeter() {
      if (!wtMeterEl) return;
      var done = wtBoxes.filter(function (box) { return box.checked; }).length;
      wtMeterEl.textContent = done + " of " + wtBoxes.length + " steps are marked done. Ticks are saved in this browser only.";
    }
    wtBoxes.forEach(function (box) {
      if (wtSaved[box.getAttribute("data-wt-step")]) box.checked = true;
      box.addEventListener("change", function () { wtSave(); wtMeter(); });
    });
    var wtProgress = document.querySelector(".wt-progress");
    if (wtProgress) {
      wtMeterEl = document.createElement("p");
      wtMeterEl.setAttribute("aria-live", "polite");
      wtProgress.appendChild(wtMeterEl);
      var wtReset = document.createElement("button");
      wtReset.type = "button";
      wtReset.textContent = "Clear saved ticks";
      wtReset.addEventListener("click", function () {
        wtBoxes.forEach(function (box) { box.checked = false; });
        wtSave();
        wtMeter();
      });
      wtProgress.appendChild(wtReset);
      wtMeter();
    }
    Array.prototype.forEach.call(document.querySelectorAll(".copyblock"), function (block) {
      var pre = block.querySelector("pre");
      if (!pre) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      var restore = null;
      function flash(label) {
        btn.textContent = label;
        if (restore) clearTimeout(restore);
        restore = setTimeout(function () { btn.textContent = "Copy"; }, 1600);
      }
      function selectFallback() {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        flash("Press Ctrl C");
      }
      btn.addEventListener("click", function () {
        var text = pre.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { flash("Copied"); }, selectFallback);
        } else {
          selectFallback();
        }
      });
      block.insertBefore(btn, pre);
    });
  }

  // Days-since-snapshot enhances, but never replaces, the static date.
  var snap = document.querySelector(".snapshot");
  if (snap && snap.getAttribute("data-snapshot")) {
    var then = new Date(snap.getAttribute("data-snapshot") + "T00:00:00");
    if (!isNaN(then.getTime())) {
      var days = Math.floor((Date.now() - then.getTime()) / 86400000);
      if (days > 0) snap.textContent = "snapshot " + snap.getAttribute("data-snapshot") + " (" + days + (days === 1 ? " day ago)" : " days ago)");
      if (days > 45) snap.style.color = "var(--warn)";
    }
  }
})();
