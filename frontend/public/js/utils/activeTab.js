(function () {
  function normalize(path) {
    try {
      const a = document.createElement('a');
      a.href = path;
      return (a.pathname || '').replace(/\/+$/, '');
    } catch { return String(path || '').replace(/\/+$/, ''); }
  }

  function pickByPath(tabs, path) {
    const want = normalize(path || location.pathname);
    let best = null, bestLen = -1;
    tabs.forEach(el => {
      const href = normalize(el.getAttribute('href') || '');
      if (!href) return;
      if (want.includes(href) || href.includes(want)) {
        if (href.length > bestLen) { best = el; bestLen = href.length; }
      }
    });
    return best;
  }

  function clearAll(tabs){
    tabs.forEach(el => {
      el.classList.remove('is-active');
      el.removeAttribute('aria-current');
    });
  }

  function mark(el){
    if (!el) return;
    el.classList.add('is-active');
    el.setAttribute('aria-current', 'page');
  }

  window.setActiveTab = function(targetPath){
    const tabs = Array.from(document.querySelectorAll('.tabs .tab, nav.tabs a'));
    if (!tabs.length) return;

    clearAll(tabs);
    const el = pickByPath(tabs, targetPath || location.pathname);
    mark(el);
  };

  if (document.querySelector('.tabs .tab')) {
    window.setActiveTab();
  } else {
    requestAnimationFrame(() => window.setActiveTab());
  }
})();
