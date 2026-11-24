/* ============================================================
   赵晓钰 — 作品集 / 交互脚本
   1 导航状态  2 移动菜单  3 滚动进入  4 项目筛选
   5 视差      6 视频降级  7 年份与锚点
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 0. 首屏入场 ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.documentElement.classList.add('is-ready');
    });
  });

  /* ---------- 1. 导航滚动状态 ---------- */
  var nav = document.getElementById('nav');
  function syncNav() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  syncNav();

  /* ---------- 2. 移动菜单 ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
  }
  if (links) {
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 820) setMenu(false);
  });

  /* ---------- 3. 滚动进入：24px 上浮 + 淡入 ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 4. 项目筛选 ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var projects = Array.prototype.slice.call(document.querySelectorAll('.projects > .project'));
  var hideTimers = new WeakMap();

  function applyFilter(key) {
    projects.forEach(function (p) {
      var match = key === 'all' || p.getAttribute('data-cat') === key;
      var timer = hideTimers.get(p);
      if (timer) { clearTimeout(timer); hideTimers.delete(p); }

      if (match) {
        p.classList.remove('is-hidden');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { p.classList.remove('is-out'); });
        });
      } else {
        p.classList.add('is-out');
        hideTimers.set(p, setTimeout(function () {
          if (p.classList.contains('is-out')) p.classList.add('is-hidden');
        }, 480));
      }
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      applyFilter(tab.getAttribute('data-filter'));
    });

    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); next.focus(); next.click(); }
    });
  });

  /* ---------- 5. 图片视差（幅度 ≤ 22px，仅桌面 + 允许动效） ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;

  function runParallax() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var progress = (r.top + r.height / 2 - vh / 2) / vh;
      var y = Math.max(-22, Math.min(22, -progress * 36));
      el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
    });
    ticking = false;
  }

  function onScroll() {
    syncNav();
    if (parallaxEls.length && !ticking) {
      ticking = true;
      requestAnimationFrame(runParallax);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    if (parallaxEls.length) requestAnimationFrame(runParallax);
  }, { passive: true });

  if (!reduceMotion.matches && window.innerWidth > 1024) {
    runParallax();
  } else {
    parallaxEls.forEach(function (el) { el.style.transform = ''; });
  }

  /* ---------- 6. 首屏视频降级 ---------- */
  var video = document.getElementById('heroVideo');
  if (video) {
    if (reduceMotion.matches) {
      video.removeAttribute('autoplay');
      video.pause();
    }
    var play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(function () { /* 自动播放被拦截时静默使用 poster */ });
    }
    // 省电：切到后台时暂停
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { video.pause(); }
      else if (!reduceMotion.matches && !video.ended) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  /* ---------- 7. 年份 + 当前章节高亮 ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if ('IntersectionObserver' in window) {
    var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
    var spyMap = {};
    spyLinks.forEach(function (a) { spyMap[a.getAttribute('href').slice(1)] = a; });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = spyMap[entry.target.id];
        if (!link || !entry.isIntersecting) return;
        spyLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    ['experience', 'work', 'strengths', 'contact'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }
  /* ---------- 8. 封面聚光灯（光斑跟随鼠标） ---------- */
  if (!reduceMotion.matches && window.matchMedia('(hover: hover)').matches) {
    var spotStages = Array.prototype.slice.call(document.querySelectorAll('.stage'));
    spotStages.forEach(function (stage) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        stage.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
        stage.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      });
    });
  }
  /* ---------- 9. 点击封面直接进入项目详情 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.project'), function (card) {
    var media = card.querySelector('.project__media');
    var link = card.querySelector('.arrow-link');
    if (!media || !link) return;
    var href = link.getAttribute('href');
    var title = (card.querySelector('h3, h2, .project__title') || {}).textContent || '项目详情';
    media.setAttribute('role', 'link');
    media.setAttribute('tabindex', '0');
    media.setAttribute('aria-label', '打开项目：' + title.trim());
    media.addEventListener('click', function () {
      window.location.href = href;
    });
    media.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = href;
      }
    });
  });
})();
