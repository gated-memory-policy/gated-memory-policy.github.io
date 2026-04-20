/* =========================================================
   main.js — Minimal interaction for the research page
   1. Tab switching  (all experiment subsections)
   2. Autoplay all muted videos via IntersectionObserver
      (cross-browser: Chrome, Firefox, Safari, Edge)
   3. BibTeX copy button (Footer)
========================================================= */

/* ---------------------------------------------------------
   TAB SWITCHING
   Generic: works for every .tab-bar[data-tabgroup] on the page.
   Tab groups: pushing · casting · flinging · cup · match-color · place-back

   HTML contract:
     .tab-bar[data-tabgroup="X"]  →  button[data-tab="VALUE"]
     .tab-panel[data-tabgroup="X"][data-config="VALUE"]

   When a panel is revealed, any <video> inside it is loaded
   and played so autoplay resumes after display:none.
--------------------------------------------------------- */
document.querySelectorAll('.tab-bar[data-tabgroup]').forEach(function (tabBar) {
  var group = tabBar.dataset.tabgroup;

  tabBar.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetConfig = btn.dataset.tab;

      // Deactivate all buttons in this group
      tabBar.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });

      // Deactivate all panels in this group
      document.querySelectorAll('.tab-panel[data-tabgroup="' + group + '"]').forEach(function (panel) {
        panel.classList.remove('active');
      });

      // Activate the clicked button
      btn.classList.add('active');

      // Activate the matching panel (keyed by data-config)
      var activePanel = document.querySelector(
        '.tab-panel[data-tabgroup="' + group + '"][data-config="' + targetConfig + '"]'
      );

      if (activePanel) {
        activePanel.classList.add('active');

        // Load all videos so the progress bar has buffered data to scrub.
        // Only call play() on videos with the autoplay attribute.
        activePanel.querySelectorAll('video').forEach(function (video) {
          video.load();
          if (video.hasAttribute('autoplay')) {
            video.play().catch(function () {});
          }
        });
      }
    });
  });
});


/* ---------------------------------------------------------
   VIDEO LAZY-LOAD + AUTOPLAY — IntersectionObserver
   Videos have preload="none" so nothing downloads on page load.
   • Preload observer: when a video gets within 800px of the
     viewport, bump preload to "auto" and call .load() so bytes
     start arriving before the user sees it.
   • Play observer: when ≥30% is visible, start playback.
     Pause when off-screen. If the user clicks pause/scrub,
     the video is never auto-played again.
--------------------------------------------------------- */
(function () {
  var userTouched = new WeakSet();
  var preloaded   = new WeakSet();

  var preloadObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !preloaded.has(entry.target)) {
        var vid = entry.target;
        vid.preload = 'auto';
        vid.load();
        preloaded.add(vid);
        preloadObs.unobserve(vid);
      }
    });
  }, { rootMargin: '800px 0px' });

  var playObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.target.paused && !userTouched.has(entry.target)) {
        entry.target.play().catch(function () {});
      }
    });
  }, { threshold: 0.3 });

  function observeVideos() {
    document.querySelectorAll('video[autoplay]').forEach(function (vid) {
      preloadObs.observe(vid);
      playObs.observe(vid);

      vid.addEventListener('pause', function () {
        userTouched.add(vid);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeVideos);
  } else {
    observeVideos();
  }
})();


/* ---------------------------------------------------------
   STICKY TOC NAV
   Slides in after the hero leaves the viewport.
   Highlights the current section via IntersectionObserver.
--------------------------------------------------------- */
(function () {
  var nav = document.getElementById('toc-nav');
  if (!nav) return;

  var firstMainSection = document.getElementById('architecture');
  var links = nav.querySelectorAll('.toc-link');

  /* Show after intro blocks (hero + video + abstract), i.e., at first content section.
     Hide again when the footer enters the viewport. */
  var footer = document.getElementById('footer');
  if (firstMainSection) {
    var updateNavVisibility = function () {
      var triggerY = firstMainSection.offsetTop - (window.innerHeight * 0.18);
      var pastStart = window.scrollY >= triggerY;
      var atFooter  = footer && (window.scrollY + window.innerHeight >= footer.offsetTop + 40);
      nav.classList.toggle('visible', pastStart && !atFooter);
    };

    updateNavVisibility();
    window.addEventListener('scroll', updateNavVisibility, { passive: true });
    window.addEventListener('resize', updateNavVisibility);
  }

  /* Collect section elements paired with their nav links */
  var sections = [];
  links.forEach(function (link) {
    var el = document.getElementById(link.getAttribute('href').slice(1));
    if (el) sections.push({ el: el, link: link });
  });

  /* Highlight whichever section is in the upper portion of the viewport */
  var sectionObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (l) { l.classList.remove('active'); });
      var match = sections.find(function (s) { return s.el === entry.target; });
      if (match) match.link.classList.add('active');
    });
  }, { rootMargin: '-15% 0px -75% 0px' });
  sections.forEach(function (s) { sectionObs.observe(s.el); });
})();


/* ---------------------------------------------------------
   BIBTEX COPY BUTTON
   Called inline via onclick="copyBibtex(this)" on the button.
   Uses the Clipboard API with an execCommand fallback for
   older browsers.
--------------------------------------------------------- */
function copyBibtex(btn) {
  var text = document.getElementById('bibtex-content').innerText;

  var succeed = function () {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = 'Copy BibTeX';
      btn.classList.remove('copied');
    }, 2000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(succeed).catch(function () {
      fallbackCopy(text, succeed);
    });
  } else {
    fallbackCopy(text, succeed);
  }
}

function fallbackCopy(text, callback) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  callback();
}
