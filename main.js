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
   VIDEO SECTION-CHAINED PRELOAD + VISIBLE-ONLY AUTOPLAY
   Videos have preload="none" in HTML. Preloading happens in
   three stages to avoid flooding the network all at once:
     1. On window.load → preload #cross-trial videos
     2. When #cross-trial enters viewport → preload #in-trial
     3. When #in-trial enters viewport   → preload #attention
   Playback is gated by an IntersectionObserver so only visible
   videos play — keeps CPU/GPU quiet with many autoplays on page.
--------------------------------------------------------- */
(function () {
  var userTouched = new WeakSet();
  var preloaded   = new WeakSet();

  var playObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var vid = entry.target;
      if (entry.isIntersecting && vid.paused && !userTouched.has(vid)) {
        vid.play().catch(function () {});
      } else if (!entry.isIntersecting && !vid.paused) {
        vid.pause();
      }
    });
  }, { threshold: 0.3 });

  function wireVideos() {
    document.querySelectorAll('video[autoplay]').forEach(function (vid) {
      playObs.observe(vid);
      vid.addEventListener('pause', function () {
        // Only real user pauses count — ignore our own off-screen auto-pauses.
        var r = vid.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          userTouched.add(vid);
        }
      });
    });
  }

  function preloadSection(selector) {
    var videos = document.querySelectorAll(selector + ' video');
    videos.forEach(function (vid, i) {
      if (preloaded.has(vid)) return;
      preloaded.add(vid);
      // Tiny DOM-order stagger so earlier videos win the connection pool.
      setTimeout(function () {
        vid.preload = 'auto';
        vid.load();
      }, i * 15);
    });
  }

  function onceVisible(sectionId, cb) {
    var el = document.getElementById(sectionId);
    if (!el) { cb(); return; }
    var obs = new IntersectionObserver(function (entries, self) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        self.disconnect();
        cb();
      }
    }, { rootMargin: '400px 0px' }); // fire a bit before the section is on-screen
    obs.observe(el);
  }

  function startChain() {
    preloadSection('#cross-trial');
    onceVisible('cross-trial', function () {
      preloadSection('#in-trial');
      onceVisible('in-trial', function () {
        preloadSection('#attention');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireVideos);
  } else {
    wireVideos();
  }

  if (document.readyState === 'complete') {
    startChain();
  } else {
    window.addEventListener('load', startChain);
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
