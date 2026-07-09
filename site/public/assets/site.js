/* How Edgeweaver Works: minimal, fully degradable enhancements.
   Without JS the site is complete: navigation is plain links, both registers are
   always in the page, the snapshot date is static text. This file only adds:
   theme toggle (data-theme stamp, persisted), the mobile sidebar drawer, and the
   days-since-snapshot hint on the static date. No network, no dependencies. */
(function () {
  "use strict";

  // Theme toggle: stamps data-theme on <html>; must win over the media query.
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem("ew-theme"); } catch (e) {}
  if (stored === "dark" || stored === "light") root.setAttribute("data-theme", stored);

  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    themeBtn.hidden = false;
    var syncLabel = function () {
      var forced = root.getAttribute("data-theme");
      var media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var dark = forced ? forced === "dark" : media;
      themeBtn.textContent = dark ? "Light" : "Dark";
      themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    };
    themeBtn.addEventListener("click", function () {
      var forced = root.getAttribute("data-theme");
      var media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var dark = forced ? forced === "dark" : media;
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ew-theme", next); } catch (e) {}
      syncLabel();
    });
    syncLabel();
  }

  // Mobile sidebar drawer.
  var navBtn = document.querySelector(".nav-toggle");
  var sidebar = document.getElementById("sidebar");
  if (navBtn && sidebar) {
    navBtn.hidden = false;
    navBtn.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Days-since-snapshot: enhance the static date, never replace it.
  var snap = document.querySelector(".snapshot");
  if (snap && snap.getAttribute("data-snapshot")) {
    var then = new Date(snap.getAttribute("data-snapshot") + "T00:00:00");
    if (!isNaN(then.getTime())) {
      var days = Math.floor((Date.now() - then.getTime()) / 86400000);
      if (days > 0) {
        snap.textContent = "snapshot " + snap.getAttribute("data-snapshot") +
          " (" + days + (days === 1 ? " day ago)" : " days ago)");
      }
      if (days > 45) snap.style.color = "var(--warn)";
    }
  }
})();
