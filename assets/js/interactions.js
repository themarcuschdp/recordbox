/*
 * Native replacements for index.html's remaining Webflow IX2 interactions
 * and the "navbar"/"forms" runtime modules. Once this loads, nothing on
 * the page depends on jquery or webflow.schunk*.js.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // ---------------------------------------------------------------------
  // Scroll-triggered reveals (.reveal-bottom / .reveal-left / .reveal-fade-small)
  // ---------------------------------------------------------------------
  function initReveals() {
    // .hero-reveal-line elements are handled by initPreloader() instead,
    // timed to the preloader rather than scroll position.
    var els = document.querySelectorAll(
      '.reveal-bottom:not(.hero-reveal-line), .reveal-left:not(.hero-reveal-line), .reveal-fade-small'
    );
    if (!els.length) return;

    // Reduced motion still gets a scroll-triggered reveal — the CSS media
    // query above already trims it down to a quick opacity fade with no
    // slide. Only skip the observer outright if it isn't supported at all.
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    els.forEach(function (el) { observer.observe(el); });
  }

  // ---------------------------------------------------------------------
  // Photo parallax drift (.photo-animation > .photo, .photo-line-animation)
  // ---------------------------------------------------------------------
  function initParallax() {
    if (reduceMotion) return;

    var items = [];
    document.querySelectorAll('.photo-animation').forEach(function (el) {
      var photo = el.querySelector('.photo');
      if (photo) items.push({ el: el, target: photo, range: 50 });
    });
    document.querySelectorAll('.photo-line-animation').forEach(function (el) {
      items.push({ el: el, target: el, range: 30 });
    });
    if (!items.length) return;

    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      items.forEach(function (item) {
        var rect = item.el.getBoundingClientRect();
        var total = vh + rect.height;
        var progress = total > 0 ? (vh - rect.top) / total : 0;
        progress = Math.max(0, Math.min(1, progress));
        var y = -item.range + progress * (item.range * 2);
        item.target.style.setProperty('--parallax-y', y.toFixed(2) + 'px');
      });
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  // ---------------------------------------------------------------------
  // Footer dims the main content as it scrolls into view
  // ---------------------------------------------------------------------
  function initFooterDim() {
    var footer = document.querySelector('.footer');
    var pageWrapper = document.querySelector('.page-wrapper');
    if (!footer || !pageWrapper || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        pageWrapper.classList.toggle('is-dimmed', entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-30% 0px -30% 0px' });

    observer.observe(footer);
  }

  // ---------------------------------------------------------------------
  // Social icons + "Let's talk" CTA: cursor-follow drift
  // ---------------------------------------------------------------------
  function initCursorFollow() {
    if (reduceMotion || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.social-icon').forEach(function (icon) {
      icon.addEventListener('mousemove', function (e) {
        var rect = icon.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width - 0.5;
        var relY = (e.clientY - rect.top) / rect.height - 0.5;
        icon.style.setProperty('--hover-tx', (relX * 10).toFixed(1) + 'px');
        icon.style.setProperty('--hover-ty', (relY * 10).toFixed(1) + 'px');
      });
      icon.addEventListener('mouseleave', function () {
        icon.style.setProperty('--hover-tx', '0px');
        icon.style.setProperty('--hover-ty', '0px');
      });
    });

    var ctaCircle = document.querySelector('.project-circle-black.black');
    var ctaTrigger = document.querySelector('.section-take');
    if (ctaCircle && ctaTrigger) {
      var ticking = false;
      var lastEvent = null;
      function updateCta() {
        if (lastEvent) {
          var tx = (lastEvent.clientX / window.innerWidth - 0.5) * 100;
          var ty = (lastEvent.clientY / window.innerHeight - 0.5) * 14;
          ctaCircle.style.setProperty('--cta-tx', tx.toFixed(2) + 'vw');
          ctaCircle.style.setProperty('--cta-ty', ty.toFixed(2) + 'vh');
        }
        ticking = false;
      }
      document.addEventListener('mousemove', function (e) {
        lastEvent = e;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateCta);
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // Mobile nav open/close + hamburger-to-X morph
  // ---------------------------------------------------------------------
  function initNav() {
    var button = document.querySelector('.menu-button');
    var menu = document.querySelector('.nav-menu');
    if (!button || !menu) return;

    function closeMenu() {
      button.classList.remove('w--open');
      menu.removeAttribute('data-nav-menu-open');
      button.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      button.classList.add('w--open');
      menu.setAttribute('data-nav-menu-open', '');
      button.setAttribute('aria-expanded', 'true');
    }

    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Toggle navigation menu');

    button.addEventListener('click', function () {
      if (button.classList.contains('w--open')) closeMenu(); else openMenu();
    });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 991) closeMenu();
    });
  }

  // ---------------------------------------------------------------------
  // Contact form checkboxes: toggle the custom checked-state indicator
  // ---------------------------------------------------------------------
  function initCheckboxes() {
    document.querySelectorAll('.w-checkbox input[type="checkbox"]').forEach(function (cb) {
      var wrapper = cb.closest('.w-checkbox');
      var indicator = wrapper ? wrapper.querySelector('.w-checkbox-input') : null;
      if (!indicator) return;
      function sync() {
        indicator.classList.toggle('w--redirected-checked', cb.checked);
      }
      cb.addEventListener('change', sync);
      sync();
    });
  }

  // ---------------------------------------------------------------------
  // "Latest Work" horizontal scroll gallery (pinned .sticky inside the
  // 500vh .track, sliding .collection-list left as the user scrolls)
  // ---------------------------------------------------------------------
  function initWorkGallery() {
    var track = document.getElementById('work');
    var sticky = track ? track.querySelector('.sticky') : null;
    var list = track ? track.querySelector('.collection-list') : null;
    if (!track || !sticky || !list) return;

    var maxTranslate = 0;
    function measure() {
      maxTranslate = Math.min(0, sticky.clientWidth - list.scrollWidth);
    }

    var ticking = false;
    function update() {
      var rect = track.getBoundingClientRect();
      var scrollable = track.offsetHeight - window.innerHeight;
      var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      list.style.transform = 'translate3d(' + (progress * maxTranslate).toFixed(1) + 'px,0,0)';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
  }

  // ---------------------------------------------------------------------
  // Preloader hide + hero title stagger (was: PAGE_FINISH -> "Metrics Into
  // View (Loading)", timed at ~5s, then the hero's staggered slideInLeft)
  // ---------------------------------------------------------------------
  function initPreloader() {
    var pageLoading = document.querySelector('.page-loading');
    var heroLines = document.querySelectorAll('.hero-reveal-line');

    function reveal() {
      if (pageLoading) pageLoading.style.display = 'none';
      heroLines.forEach(function (el) { el.classList.add('is-visible'); });
    }

    if (document.documentElement.classList.contains('skip-preloader')) {
      reveal();
      return;
    }

    if (reduceMotion) {
      reveal();
      return;
    }

    window.addEventListener('load', function () {
      setTimeout(reveal, 5000);
    });
  }

  onReady(function () {
    initReveals();
    initParallax();
    initFooterDim();
    initCursorFollow();
    initNav();
    initCheckboxes();
    initWorkGallery();
    initPreloader();
  });
})();
