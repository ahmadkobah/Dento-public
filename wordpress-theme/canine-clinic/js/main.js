/**
 * Canine Clinic – Main JavaScript
 * Scroll-based navbar, mobile menu, animated hero words,
 * scroll-triggered animations, portfolio filter.
 *
 * @package Canine_Clinic
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────
     1. Scroll-based navbar style
     ───────────────────────────────────── */
  const navbar = document.getElementById('mainNavbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    // Initial check
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }

  /* ─────────────────────────────────────
     2. Mobile menu toggle
     ───────────────────────────────────── */
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    const hamburger = menuBtn.querySelector('.hamburger-icon');
    const closeIcon = menuBtn.querySelector('.close-icon');

    menuBtn.addEventListener('click', function () {
      const isOpen = !mobileNav.classList.contains('hidden');
      mobileNav.classList.toggle('hidden', isOpen);
      hamburger.classList.toggle('hidden', !isOpen);
      closeIcon.classList.toggle('hidden', isOpen);
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.add('hidden');
        hamburger.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      });
    });
  }

  /* ─────────────────────────────────────
     3. Animated hero words
     ───────────────────────────────────── */
  const wordsContainer = document.getElementById('heroWords');
  if (wordsContainer) {
    var words = wordsContainer.querySelectorAll('.hero-word');
    var currentIndex = 0;

    setInterval(function () {
      words[currentIndex].classList.remove('active');
      currentIndex = (currentIndex + 1) % words.length;
      words[currentIndex].classList.add('active');
    }, 2500);
  }

  /* ─────────────────────────────────────
     4. Scroll-triggered animations
     ───────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show all immediately
    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ─────────────────────────────────────
     5. Portfolio filter
     ───────────────────────────────────── */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.getAttribute('data-filter');
      portfolioItems.forEach(function (item) {
        var cats = item.getAttribute('data-category') || '';
        if (filter === 'all' || cats.indexOf(filter) !== -1) {
          item.style.display = '';
          // Re-trigger animation
          item.classList.remove('visible');
          void item.offsetWidth;
          item.classList.add('visible');
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  /* ─────────────────────────────────────
     6. Fallback language toggle (no Polylang/WPML)
     ───────────────────────────────────── */
  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var currentLang = document.documentElement.lang || 'en';
      var newLang = currentLang === 'ar' ? 'en' : 'ar';

      // Store preference
      localStorage.setItem('cc_language', newLang);

      // Redirect with ?lang= param (theme can read this)
      var url = new URL(window.location.href);
      url.searchParams.set('lang', newLang);
      window.location.href = url.toString();
    });
  });

  /* ─────────────────────────────────────
     7. Smooth scroll for anchor links
     ───────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─────────────────────────────────────
     8. Scroll indicator bounce
     ───────────────────────────────────── */
  var scrollDot = document.querySelector('.scroll-dot');
  if (scrollDot) {
    // CSS animation handles the bounce, nothing extra needed
  }

})();
