// =========================================================
//  SCROLL — Nav compression + mobile menu
//  Scroll velocity and scene detection are in physics.js.
//  This file handles nav visual state and mobile menu toggle.
// =========================================================
(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const navBackdrop = document.getElementById('nav-backdrop');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let navCompressed = false;
  let lastScrollTop = 0;
  let ticking = false;

  // ── Nav scroll compression ─────────────────────────────
  function updateNav() {
    const scrollTop = window.scrollY;
    const delta = scrollTop - lastScrollTop;

    if (header) {
      header.classList.toggle('scrolled', scrollTop > 10);

      if (reducedMotion) {
        navCompressed = false;
      } else if (scrollTop <= 24) {
        navCompressed = false;
      } else if (delta > 6 && scrollTop > 72) {
        navCompressed = true;
      } else if (delta < -6) {
        navCompressed = false;
      }

      header.classList.toggle('nav-condensed', navCompressed);
    }

    lastScrollTop = scrollTop;
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateNav);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateNav();

  // ── Fade-in observer for .fade-in / .reveal elements ───
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      if (entry.target.classList.contains('reveal')) {
        entry.target.classList.add('visible');
      } else {
        entry.target.style.animation = 'fadeIn 0.6s ease forwards';
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in, .reveal').forEach(function (el) {
    observer.observe(el);
  });

  // ── Mobile menu ────────────────────────────────────────
  function openMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    if (navBackdrop) navBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (navBackdrop) navBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('open');
      if (isOpen) closeMenu();
      else openMenu();
    });
  }

  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMenu);
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });
})();
