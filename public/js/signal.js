// =========================================================
//  SIGNAL INTERACTION SYSTEM — signal.js
//
//  The experience layer. Everything here makes the site feel
//  alive: cascade reveals, stagger entrances, reading ghosts,
//  hidden triggers, and the scan sweep.
//
//  BTB.signal.init()    — (re)start all interactions
//  BTB.signal.destroy() — tear down cleanly
// =========================================================

window.BTB = window.BTB || {};
if (!window.BTB.signal) window.BTB.signal = {};

(function () {
  'use strict';

  const PRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const _cleanup = [];
  const reg = fn => _cleanup.push(fn);

  // ── 01 Reticle Assembly ─────────────────────────────────
  function initReticle() {
    const reticle = document.getElementById('reticle');
    if (!reticle) return;

    const INTERACTIVE = 'a, button, [role="button"], .glass-card-hover, .feature-card, .tilt-card, .depth-tile';
    const DWELL_MS = 180;
    let dwellTimer = null;
    let currentTarget = null;

    function lock(el) {
      const r = el.getBoundingClientRect();
      reticle.style.left   = r.left + 'px';
      reticle.style.top    = r.top  + 'px';
      reticle.style.width  = r.width + 'px';
      reticle.style.height = r.height + 'px';
      reticle.dataset.type =
        el.matches('a[href], button, [role="button"]') ? 'action' : 'card';
      reticle.classList.add('locked');
    }

    function unlock() {
      clearTimeout(dwellTimer);
      dwellTimer = null;
      reticle.classList.remove('locked');
      currentTarget = null;
    }

    function onOver(e) {
      const el = e.target.closest(INTERACTIVE);
      if (!el || el === currentTarget) return;
      unlock();
      currentTarget = el;
      dwellTimer = setTimeout(function () { lock(el); }, DWELL_MS);
    }

    function onOut(e) {
      const leaving = e.target.closest(INTERACTIVE);
      if (!leaving) return;
      unlock();
    }

    function onScroll() {
      if (currentTarget && reticle.classList.contains('locked')) {
        const r = currentTarget.getBoundingClientRect();
        reticle.style.left   = r.left + 'px';
        reticle.style.top    = r.top  + 'px';
        reticle.style.width  = r.width + 'px';
        reticle.style.height = r.height + 'px';
      }
    }

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout',  onOut);
    window.addEventListener('scroll', onScroll, { passive: true });

    reg(function () {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout',  onOut);
      window.removeEventListener('scroll', onScroll);
      unlock();
    });
  }

  // ── 02 Cascade Reveal — characters cascade in per-scene ──
  function initCascadeReveal() {
    if (PRM) return;

    // Scene 1 characters are driven by Hero.astro's signal-phase system.
    // Scenes 2-5 headings get cascade on first scroll-into-view.
    const scenes = document.querySelectorAll('[data-scene]:not([data-scene="1"])');
    if (!scenes.length) return;

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        const scene = entry.target;

        // Cascade the heading text
        const heading = scene.querySelector('.scene-heading, .transmission-complete-heading');
        if (heading) cascadeTextNode(heading);

        // Stagger-in cards / tiles / stats
        const cards = scene.querySelectorAll('.depth-tile, .identity-stat, .featured-post, .transmission-item');
        cards.forEach(function (card, i) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(28px)';
          card.style.transition = 'none';
          setTimeout(function () {
            card.style.transition = 'opacity 600ms cubic-bezier(0.4,0,0.2,1), transform 700ms cubic-bezier(0.34,1.56,0.64,1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 120 + i * 90);
        });

        // Paragraphs slide in
        const paras = scene.querySelectorAll('.identity-paragraph, .scene-lede, .transmission-complete-body');
        paras.forEach(function (p, i) {
          p.style.opacity = '0';
          p.style.transform = 'translateY(18px)';
          p.style.transition = 'none';
          setTimeout(function () {
            p.style.transition = 'opacity 700ms ease, transform 800ms cubic-bezier(0.34,1.56,0.64,1)';
            p.style.opacity = '1';
            p.style.transform = 'translateY(0)';
          }, 200 + i * 120);
        });
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -12% 0px' });

    scenes.forEach(function (s) { obs.observe(s); });
    reg(function () { obs.disconnect(); });
  }

  function cascadeTextNode(el) {
    // Split text content into per-character spans with stagger
    const text = el.textContent;
    // Preserve child elements like <em>, <br>
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let globalIndex = 0;
    textNodes.forEach(function (node) {
      const frag = document.createDocumentFragment();
      const chars = Array.from(node.textContent);
      chars.forEach(function (ch) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
        } else {
          const span = document.createElement('span');
          span.className = 'signal-char cascade';
          span.textContent = ch;
          span.style.setProperty('--char-index', globalIndex);
          frag.appendChild(span);
        }
        globalIndex++;
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ── 03 Stat Counter Animation ─────────────────────────────
  function initStatCounters() {
    const stats = document.querySelectorAll('.identity-stat-value');
    if (!stats.length) return;

    if (PRM) {
      // Show final values immediately
      return;
    }

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        animateCounter(entry.target);
      });
    }, { threshold: 0.5 });

    stats.forEach(function (stat) { obs.observe(stat); });
    reg(function () { obs.disconnect(); });

    function animateCounter(el) {
      const target = parseInt(el.textContent, 10);
      if (isNaN(target)) return;
      el.textContent = '0';
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        // Quartic ease-out
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  // ── 04 Contact Surface Charge ──────────────────────────
  function initCharge() {
    var TARGETS = '.depth-tile, .featured-post, .transmission-item, .btn-primary, .btn-ghost, .theme-btn';

    function onDown(e) {
      var el = e.target.closest(TARGETS);
      if (el) el.dataset.pressing = 'true';
    }

    function onUp(e) {
      var el = e.target.closest(TARGETS);
      if (!el) {
        document.querySelectorAll('[data-pressing]').forEach(function (node) {
          delete node.dataset.pressing;
        });
        return;
      }
      delete el.dataset.pressing;
      el.dataset.released = 'true';
      setTimeout(function () { delete el.dataset.released; }, 300);
    }

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    reg(function () {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    });
  }

  // ── 05 Reading Ghost (S02 trigger) ─────────────────────
  //   When user sustains reading the identity paragraph for 8s,
  //   a ghost version surfaces with alternate text.
  function initReadingGhost() {
    const source = document.querySelector('[data-reading-ghost-source]');
    if (!source) return;

    const state = window.BTB?.signal?.state;
    if (!state) return;

    let timer = null;
    let triggered = false;

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (triggered) return;
        if (entry.isIntersecting) {
          timer = setTimeout(function () {
            if (!state.activateTrigger('S02')) return;
            triggered = true;
            showGhost(source);
          }, 8000);
        } else {
          if (timer) { clearTimeout(timer); timer = null; }
        }
      });
    }, { threshold: 0.6 });

    obs.observe(source.closest('p') || source);
    reg(function () { obs.disconnect(); if (timer) clearTimeout(timer); });
  }

  function showGhost(source) {
    const container = source.closest('.scene-inner');
    if (!container) return;

    const ghost = document.createElement('div');
    ghost.className = 'reading-ghost';
    ghost.innerHTML = `
      <p class="reading-ghost-text">
        I perform because the noise in my head needs somewhere to go.
        I write because I haven't figured out how to stop noticing.
        I build because breaking things is the only way I learn.
      </p>
    `;
    container.appendChild(ghost);

    requestAnimationFrame(function () { ghost.classList.add('visible'); });

    // Fade out after 6s
    setTimeout(function () {
      ghost.classList.remove('visible');
      setTimeout(function () { ghost.remove(); }, 2000);
    }, 6000);
  }

  // ── 06 Paragraph Reveal — reading depth ────────────────
  function initParagraphReveal() {
    if (PRM) return;

    const paras = document.querySelectorAll('.identity-paragraph, .depth-tile-body, .featured-post-excerpt');
    if (!paras.length) return;

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        entry.target.classList.add('para-revealed');
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -15% 0px' });

    paras.forEach(function (p) {
      p.classList.add('para-pending');
      obs.observe(p);
    });
    reg(function () { obs.disconnect(); });
  }

  // ── 07 Scene Activation (fallback for non-scroll-timeline) ──
  function initSceneActivation() {
    const supportsScrollTimeline = CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
    const scenes = document.querySelectorAll('[data-scene]');
    if (!scenes.length) return;

    // Always apply scene-active for IntersectionObserver-driven reveals
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('scene-active', entry.isIntersecting);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    scenes.forEach(function (el) {
      if (el.getAttribute('data-scene') === '1') {
        el.classList.add('scene-active');
      }
      obs.observe(el);
    });
    reg(function () { obs.disconnect(); });
  }

  // ── 08 Scan line sweep on scene entry ──────────────────
  function initScanSweep() {
    const scanLine = document.querySelector('.signal-scan-line');
    if (!scanLine) return;

    const state = window.BTB?.signal?.state;
    if (!state) return;

    let lastScene = 1;
    state.on('currentScene', function (newScene) {
      if (newScene !== lastScene) {
        lastScene = newScene;
        scanLine.classList.remove('sweep');
        void scanLine.offsetWidth;
        scanLine.classList.add('sweep');
      }
    });
  }

  // ── 09 Structural Silence ────────────────────────────
  function initSilence() {
    var ticking = false;
    function check() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) { ticking = false; return; }
      var ratio = window.scrollY / docH;
      document.body.classList.toggle('transmission-complete', ratio > 0.9);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    reg(function () {
      window.removeEventListener('scroll', onScroll);
      document.body.classList.remove('transmission-complete');
    });
  }

  // ── Lifecycle ───────────────────────────────────────────
  function init() {
    if (CAN_HOVER && !PRM) initReticle();
    initCascadeReveal();
    initStatCounters();
    initCharge();
    initReadingGhost();
    initParagraphReveal();
    initSceneActivation();
    initScanSweep();
    initSilence();
  }

  function destroy() {
    _cleanup.forEach(function (fn) { fn(); });
    _cleanup.length = 0;
  }

  document.addEventListener('astro:before-swap', destroy);
  document.addEventListener('astro:page-load', init);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  BTB.signal.init = init;
  BTB.signal.destroy = destroy;
})();
