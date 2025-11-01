(function () {
  function normalize(path) {
    try {
      var a = document.createElement('a');
      a.href = path;
      var p = (a.pathname || "/");
      p = p.replace(/\/+$/, "")
           .replace(/\/index\.html$/i, "")
           .replace(/\.html$/i, "");
      return p || "/";
    } catch {
      // Fallback if URL parsing fails
      return String(path || "/")
        .replace(/\/+$/, "")
        .replace(/\/index\.html$/i, "")
        .replace(/\.html$/i, "") || "/";
    }
  }

  // Map normalized paths to logical navbar sections
  var SECTION_BY_PATH = {
    "/pages/homelogged":   "start",
    "/pages/challenge":    "start",
    "/pages/bestplayers":  "start",
    "/pages/instructions": "start",
    "/pages/duel":         "start",
    "/pages/sitemap":      "start",

    "/pages/ranking":      "rankings",
    "/pages/history":      "history",
    "/pages/friends":      "friends",
    "/pages/profile":      "profile",
    "/pages/profileEdit":  "profile"
  };

  // Remove active state from all tabs
  function clearAll(tabs){
    tabs.forEach(function (el) {
      el.classList.remove('is-active');
      el.removeAttribute('aria-current');
    });
  }

  // Mark a single tab as active and set aria-current
  function mark(el){
    if (!el) return;
    el.classList.add('is-active');
    el.setAttribute('aria-current', 'page');
  }

  // Pick a tab by section name
  function pickBySection(tabs, section){
    if (!section) return null;
    return tabs.find(function (el) {
      return (el.getAttribute('data-section') || "").toLowerCase() === section.toLowerCase();
    }) || null;
  }

  function pickByPath(tabs, path) {
    var want = normalize(path || location.pathname);
    var best = null, bestLen = -1;
    tabs.forEach(function (el) {
      var href = normalize(el.getAttribute('href') || '');
      if (!href) return;
      var same = (want === href);
      var sameFolder = want.startsWith(href.replace(/\/[^/]+$/, ""));
      if ((same || sameFolder) && href.length > bestLen) {
        best = el; bestLen = href.length;
      }
    });
    return best;
  }

  window.setActiveTab = function(target){
    var tabs = Array.from(document.querySelectorAll('.tabs .tab, nav.tabs a'));
    if (!tabs.length) return;

    clearAll(tabs);

    // Check forced section
    var forcedSection = window.NAV_ACTIVE;
    if (!forcedSection) {
      var meta = document.querySelector('meta[name="active-tab"]');
      if (meta && meta.content) forcedSection = meta.content.trim();
    }
    // If a section string is passed (not a path), use it directly
    if (typeof target === "string" && !target.includes("/")) {
      forcedSection = target;
    }
    if (forcedSection) {
      var bySec = pickBySection(tabs, forcedSection);
      if (bySec) { mark(bySec); return; }
    }

    // Try static mapping
    var norm = normalize(location.pathname);
    var section = SECTION_BY_PATH[norm];
    var el = section ? pickBySection(tabs, section) : null;

    // Fallback to path-based match
    if (!el) el = pickByPath(tabs, location.pathname);

    mark(el);
  };

  // Run immediately if tabs exist; otherwise schedule after paint
  var run = function(){ window.setActiveTab(); };
  if (document.querySelector('.tabs .tab')) run();
  else requestAnimationFrame(run);
})();
