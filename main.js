/*
 * main.js
 *   1. Tab switching
 *   2. Video preload + playback (three layer design)
 *   3. Scroll reveal
 *   4. Sticky TOC nav with section highlight
 *   5. BibTeX copy button
 */

/* TAB SWITCHING
 * Contract:
 *   .tab-bar[data-tabgroup="X"]         container
 *   .tab-btn[data-tab="V"]              buttons within that bar
 *   .tab-panel[data-tabgroup="X"][data-config="V"]   matching panel
 * Activating a panel calls video.load() so autoplay resumes after display:none.
 */
document.querySelectorAll('.tab-bar[data-tabgroup]').forEach(function (tabBar) {
  var group = tabBar.dataset.tabgroup;

  tabBar.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetConfig = btn.dataset.tab;

      tabBar.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('.tab-panel[data-tabgroup="' + group + '"]').forEach(function (panel) {
        panel.classList.remove('active');
      });
      btn.classList.add('active');

      var activePanel = document.querySelector(
        '.tab-panel[data-tabgroup="' + group + '"][data-config="' + targetConfig + '"]'
      );
      if (activePanel) {
        activePanel.classList.add('active');
        // load() reattaches media pipeline after display:none; play() only on autoplay videos.
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


/* VIDEO PRELOAD + PLAYBACK
 *   1. INTENT    Rolling window in DOM order, plus visibility and tab
 *                switch hooks, decides what to queue.
 *   2. PREFETCH  Idle scheduled, concurrency capped drain. Low
 *                fetchPriority so user critical work wins.
 *   3. PLAYBACK  Visible videos play; pause on exit. Late visible
 *                videos jump the queue.
 */
(function () {
  var AHEAD = 15, MAX_INFLIGHT = 4, VISIBLE = 0.25, MARGIN = '400px 0px';

  var conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) {
    AHEAD = 2; MAX_INFLIGHT = 2;
  }
  var schedule = window.requestIdleCallback
    ? function (cb) { requestIdleCallback(cb, { timeout: 1500 }); }
    : function (cb) { setTimeout(cb, 80); };

  var videos = [], frontier = -1, inflight = 0, queue = [];
  var state = new WeakMap();  // vid state: 'queued' | 'loading' | 'ready'
  var userPaused = new WeakSet();

  // Prefetch layer
  function onDone() {
    if (state.get(this) === 'ready') return;
    state.set(this, 'ready');
    inflight--;
    this.removeEventListener('canplaythrough', onDone);
    this.removeEventListener('error', onDone);
    if (queue.length) schedule(pump);
  }
  function pump() {
    while (inflight < MAX_INFLIGHT && queue.length) {
      var v = queue.shift();
      if (!v || state.get(v) !== 'queued') continue;
      state.set(v, 'loading');
      inflight++;
      v.preload = 'auto';
      if ('fetchPriority' in v) v.fetchPriority = 'low';
      v.addEventListener('canplaythrough', onDone);
      v.addEventListener('error', onDone);
      try { v.load(); } catch (e) { onDone.call(v); }
    }
  }

  // Intent layer
  function enqueue(v, front) {
    var s = state.get(v);
    if (s === 'loading' || s === 'ready') return;
    if (s === 'queued') {
      if (!front) return;
      var i = queue.indexOf(v);
      if (i > 0) queue.splice(i, 1);
    }
    state.set(v, 'queued');
    front ? queue.unshift(v) : queue.push(v);
    schedule(pump);
  }
  function advance(to) {
    to = Math.min(to, videos.length - 1);
    while (frontier < to) enqueue(videos[++frontier]);
  }

  var nearObs = new IntersectionObserver(function (es, self) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      advance(videos.indexOf(e.target) + AHEAD);
      self.unobserve(e.target);
    });
  }, { rootMargin: MARGIN });

  // Tab click bubbles to document after the per button handler flipped .active,
  // so the newly active panel is already queryable at this point.
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.tab-btn');
    if (!btn) return;
    var bar = btn.closest('.tab-bar');
    var group = bar && bar.dataset.tabgroup;
    if (!group) return;
    var panel = document.querySelector(
      '.tab-panel.active[data-tabgroup="' + group + '"]'
    );
    panel && panel.querySelectorAll('video[autoplay]').forEach(function (v) {
      enqueue(v, true);
    });
  });

  // Playback layer
  var playObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (state.get(v) !== 'ready') enqueue(v, true);
        if (v.paused && !userPaused.has(v)) v.play().catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }, { threshold: VISIBLE });

  // Boot
  function wire() {
    videos = [].slice.call(document.querySelectorAll('video[autoplay]'));
    videos.forEach(function (v) {
      nearObs.observe(v);
      playObs.observe(v);
      v.addEventListener('pause', function () {
        var r = v.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) userPaused.add(v);
      });
    });
    advance(AHEAD - 1);   // seed
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', wire)
    : wire();
})();


/* SCROLL REVEAL
 * Adds .reveal to content blocks so they fade up as they enter the viewport.
 * Major section headings also get .momentum when the user was scrolling
 * fast at the moment of entry, so fast flicks feel like arriving at a new
 * chapter with force, while slow scrolling feels soft.
 * prefers-reduced-motion is respected in CSS.
 */
(function () {
  // Subtle reveals inside a major section
  var subtleTargets = document.querySelectorAll(
    '.subsection, #method > *, #benchmark > *, #faq .faq-item, #team > *'
  );
  // Bigger entrance at major section boundaries
  var majorTargets = document.querySelectorAll(
    '#cross-trial > h2, #cross-trial > p.body-text,' +
    '#in-trial > h2, #in-trial > p.body-text,' +
    '#method > h2,' +
    '#attention > h2, #attention > p.body-text,' +
    '#benchmark > h2,' +
    '#faq > h2,' +
    '#team > h2'
  );

  // Cumulative scroll distance over the last WINDOW_MS. This is a better
  // signal than instantaneous velocity: a trackpad flick fires many scroll
  // events with small deltas each, but their sum is large. The heading
  // observer below reads this sum at reveal time to decide soft vs forceful
  // entrance.
  var WINDOW_MS      = 300;
  var FAST_DISTANCE  = 120;  // px of scroll within WINDOW_MS to qualify
  var samples = [[performance.now(), window.scrollY]];
  window.addEventListener('scroll', function () {
    var now = performance.now();
    samples.push([now, window.scrollY]);
    while (samples.length > 1 && samples[0][0] < now - WINDOW_MS) samples.shift();
  }, { passive: true });

  function recentScroll() {
    var total = 0;
    for (var i = 1; i < samples.length; i++) {
      total += Math.abs(samples[i][1] - samples[i - 1][1]);
    }
    return total;
  }

  var obs = new IntersectionObserver(function (entries, self) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var isMajor = el.classList.contains('reveal-major');
      var gravitational = isMajor && recentScroll() > FAST_DISTANCE;
      self.unobserve(el);
      if (gravitational) {
        // Commit the momentum "from" state for one frame before flipping
        // to is-visible, otherwise the transition starts from the base
        // reveal-major position and the drop is invisible.
        el.classList.add('momentum');
        void el.offsetWidth;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.add('is-visible');
          });
        });
      } else {
        el.classList.add('is-visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function wire(els, className) {
    els.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var aboveFold = rect.top < window.innerHeight && rect.bottom > 0;
      if (aboveFold) return;
      el.classList.add(className);
      obs.observe(el);
    });
  }

  wire(subtleTargets, 'reveal');
  wire(majorTargets, 'reveal-major');
})();


/* STICKY TOC NAV
 * Slides in after the hero leaves the viewport. Highlights the current
 * section via IntersectionObserver.
 */
(function () {
  var nav = document.getElementById('toc-nav');
  if (!nav) return;

  var firstMainSection = document.getElementById('cross-trial');
  var links = nav.querySelectorAll('.toc-link');

  // Visible once the first content section enters view, hidden at the footer.
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

  // Pair each link with its target section.
  var sections = [];
  links.forEach(function (link) {
    var el = document.getElementById(link.getAttribute('href').slice(1));
    if (el) sections.push({ el: el, link: link });
  });

  // Highlight whichever section is in the upper portion of the viewport.
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


/* BIBTEX COPY BUTTON
 * Wired inline via onclick="copyBibtex(this)". Uses the Clipboard API,
 * falling back to execCommand for older browsers.
 */
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
