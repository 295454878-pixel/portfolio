/* ============================================================
   ds.js — Dennis Snellenberg 风格动效系统（全站共享）
   1 预加载幕布  2 平滑滚动  3 自定义光标
   4 磁性元素    5 页面过渡  6 时间/状态注入
   全部尊重 prefers-reduced-motion 与触屏降级
   ============================================================ */
(function () {
  'use strict';
  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1. 预加载幕布（首页首次进入播放；从详情返回时跳过计数直接升起并回到原位置） ---------- */
  var loader = document.querySelector('.ds-loader');
  var isHome = !!document.querySelector('.hero');
  var returning = false;
  try {
    returning = sessionStorage.getItem('ds-returning') === '1';
    sessionStorage.removeItem('ds-returning');
  } catch (err) {}
  function finishLoading(plain) {
    docEl.classList.remove('ds-loading');
    docEl.classList.add('ds-ready');
    /* 工牌首屏入场（首次进入才播；返回时直接静止） */
    if (!returning && document.querySelector('.hero--badge')) {
      docEl.classList.add('badge-enter');
    }
    if (loader) {
      if (plain) {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      } else {
        loader.classList.add('is-out');
        setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 1100);
      }
    }
  }
  /* 位置恢复兜底：load 后若仍有待恢复位置，再次校正 */
  window.addEventListener('load', function () {
    if (window.__dsPendingLenis) window.scrollTo(0, window.__dsPendingLenis);
  });
  if (reduce || !loader || !isHome) {
    finishLoading(true);
  } else if (returning) {
    /* 从详情返回：解析期脚本已处理；此处仅兜底恢复位置 */
    var savedY = 0;
    try { savedY = parseInt(sessionStorage.getItem('ds-scrollY') || '0', 10); sessionStorage.removeItem('ds-scrollY'); } catch (err) {}
    if (savedY > 0) {
      window.scrollTo(0, savedY);
      window.__dsPendingLenis = savedY;
    }
    finishLoading(true);
  } else {
    var wordEl = loader.querySelector('.ds-loader__word');
    var pctEl = loader.querySelector('.ds-loader__pct');
    var words = ['你好', 'Hello', 'Bonjour', 'こんにちは', '안녕하세요', 'Hola', 'Ciao', 'Hallo', 'Olá'];
    var wi = 0, pct = 0;
    if (wordEl) {
      wordEl.innerHTML = '';
      var wSpan = document.createElement('span');
      wSpan.textContent = words[0];
      var dot = document.createElement('span'); dot.className = 'dot';
      wordEl.appendChild(wSpan); wordEl.appendChild(dot);
      var wordTimer = setInterval(function () {
        wi = (wi + 1) % words.length;
        wSpan.textContent = words[wi];
      }, 190);
    }
    var start = null, DUR = 1350;
    function tick(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / DUR);
      var eased = 1 - Math.pow(1 - t, 3);
      pct = Math.floor(eased * 100);
      if (pctEl) pctEl.textContent = pct;
      if (t < 1) { requestAnimationFrame(tick); }
      else {
        clearInterval(wordTimer);
        setTimeout(finishLoading, 160);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 2. 平滑滚动（Lenis，CDN 失败则原生滚动） ---------- */
  if (!reduce) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      var lenis = new window.Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      window.__lenis = lenis;
      /* 返回首页时的位置恢复（Lenis 初始化后立即对齐） */
      if (window.__dsPendingLenis) {
        var y = window.__dsPendingLenis;
        window.__dsPendingLenis = 0;
        lenis.scrollTo(y, { immediate: true });
      }
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      /* 锚点改走 Lenis，保证丝滑 */
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href');
          if (id.length < 2) return;
          var target = document.querySelector(id);
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -64, duration: 1.4 });
        });
      });
    };
    document.head.appendChild(s);
  }

  /* ---------- 3. 自定义光标 ---------- */
  if (!reduce && finePointer) {
    docEl.classList.add('ds-cursor-on');
    var cur = document.createElement('div');
    cur.className = 'ds-cursor';
    document.body.appendChild(cur);
    var cx = -100, cy = -100, tx = -100, ty = -100;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      cur.classList.add('is-active');
    });
    document.addEventListener('mouseleave', function () { cur.classList.remove('is-active'); });
    (function follow() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      requestAnimationFrame(follow);
    })();
    var HOVERABLE = 'a, button, .tab, [role="tab"], .badge-card, .card';
    var VIEWABLE = '.project__media, .case-next__link, .contact__mail, .show, .board, .browser, .stage, .phone-shot';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(VIEWABLE)) {
        cur.classList.add('is-view');
        cur.classList.remove('is-link');
      } else if (e.target.closest(HOVERABLE)) {
        cur.classList.add('is-link');
        cur.classList.remove('is-view');
      } else {
        cur.classList.remove('is-link', 'is-view');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) cur.classList.remove('is-link', 'is-view');
    });
  }

  /* ---------- 4. 磁性元素 ---------- */
  if (!reduce && finePointer) {
    var magnets = document.querySelectorAll('.btn, .arrow-link, .tab, .nav__brand, .case-back, .contact__mail, .foot__prev');
    magnets.forEach(function (el) {
      var strength = 0.28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .18s ease-out';
        el.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ---------- 5. 页面过渡（内部 .html 链接 → 幕布升起） ---------- */
  if (!reduce) {
    var veil = document.createElement('div');
    veil.className = 'ds-veil';
    document.body.appendChild(veil);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (!href || !/\.html(#.*)?$/.test(href)) return;
      if (window.location.origin !== a.origin && a.origin !== 'null') return;
      e.preventDefault();
      var isDetailHere = !document.querySelector('.hero');
      var goingHome = /(^|\/)index\.html(#.*)?$/.test(href);
      try {
        sessionStorage.setItem('ds-returning', '1');
        if (document.querySelector('.hero')) {
          sessionStorage.setItem('ds-scrollY', String(Math.round(window.scrollY)));
        }
      } catch (err) {}
      /* 详情 → 首页：瞬时直达，无任何过渡动画 */
      if (isDetailHere && goingHome) {
        window.location.href = href.split('#')[0];
        return;
      }
      veil.classList.add('is-in');
      setTimeout(function () { window.location.href = href.split('#')[0]; }, 620);
    });
  }

  /* ---------- 6. 时间 / 求职状态注入 ---------- */
  function fmtTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function buildFootrow() {
    var row = document.createElement('div');
    row.className = 'ds-footrow';
    row.innerHTML =
      '<span><i class="dot"></i>AVAILABLE FOR WORK · 正在求职</span>' +
      '<span>BEIJING, CN — <span class="ds-clock">' + fmtTime() + '</span></span>' +
      '<a href="#" data-ds-top>BACK TO TOP ↑</a>';
    row.querySelector('[data-ds-top]').addEventListener('click', function (e) {
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    return row;
  }
  var mount = document.querySelector('.contact__inner') || document.querySelector('.contact');
  if (!mount) {
    var foot = document.querySelector('.foot .wrap') || document.querySelector('.foot');
    if (foot) foot.appendChild(buildFootrow());
  } else if (mount.querySelector('.ds-footrow') === null) {
    mount.appendChild(buildFootrow());
  }
  var clock = document.querySelector('.ds-clock');
  if (clock) setInterval(function () { clock.textContent = fmtTime(); }, 30000);

  /* ---------- 7. 下滑提示（仅首页） ---------- */
  var hero = document.querySelector('.hero');
  if (hero && !reduce && !hero.querySelector('.ds-scrollhint')) {
    var hint = document.createElement('div');
    hint.className = 'ds-scrollhint';
    hint.innerHTML = '<span>SCROLL · 下滑探索</span><i></i>';
    hint.style.position = 'absolute';
    hero.appendChild(hint);
  }

  /* ---------- 8. 滚动进场（Dennis 式上滑显现，同组阶梯延迟） ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var SEL = [
      '.exp__figure', '.exp__title', '.exp__prose', '.exp__timeline',
      '.exp__colophon', '.stats li',
      '.work__head > *', '.tabs',
      '.project__text > *:not(.arrow-link)',
      '.edge__head > *'
    ].join(',');
    var els = document.querySelectorAll(SEL);
    var groupIdx = new Map();
    els.forEach(function (el) {
      var parent = el.parentElement;
      var n = groupIdx.get(parent) || 0;
      groupIdx.set(parent, n + 1);
      el.setAttribute('data-ds-reveal', '');
      el.style.transitionDelay = Math.min(n * 75, 375) + 'ms';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 9. 工牌摆动（鼠标跟随 + 拖拽甩动 + 惯性回弹，仅首页/指针设备） ---------- */
  (function () {
    var swing = document.getElementById('badgeSwing');
    var big = document.getElementById('heroBig');
    var card = document.getElementById('badgeCard');
    if (!swing || !card) return;
    if (reduce || !finePointer) return;
    var angle = 0, vel = 0, target = 0;
    var dragging = false, downX = 0, rafOn = false;
    function apply() {
      swing.style.transform = 'rotate(' + angle.toFixed(3) + 'deg)';
      if (big) big.style.transform = 'translateX(' + (-angle * 4.5).toFixed(1) + 'px)';
    }
    function loop() {
      if (!dragging) {
        vel += (target - angle) * 0.05;   /* 弹簧回复 */
        vel *= 0.945;                      /* 阻尼衰减 */
        angle += vel;
        if (Math.abs(angle) < 0.002 && Math.abs(vel) < 0.002 && Math.abs(target) < 0.01) {
          angle = target = 0; vel = 0;
          apply(); rafOn = false; return;  /* 静止后停止 rAF，省电 */
        }
      }
      apply();
      requestAnimationFrame(loop);
    }
    function wake() { if (!rafOn) { rafOn = true; requestAnimationFrame(loop); } }
    /* 入场摆入动画结束后，交由物理接管，带初速度继续小幅摆动 */
    swing.addEventListener('animationend', function () {
      if (!docEl.classList.contains('badge-enter')) return;
      docEl.classList.remove('badge-enter');
      angle = -3.4; vel = 2.6;
      wake();
    });
    /* 未拖拽时：工牌随鼠标水平位置轻摆 */
    var heroEl = document.querySelector('.hero--badge');
    if (heroEl) {
      heroEl.addEventListener('pointermove', function (e) {
        if (dragging) return;
        var r = heroEl.getBoundingClientRect();
        target = Math.max(-9, Math.min(9, ((e.clientX - r.left) / r.width - 0.5) * 16));
        wake();
      });
      heroEl.addEventListener('pointerleave', function () { target = 0; wake(); });
    }
    /* 拖拽甩动：按住拖动，松手后惯性振荡衰减 */
    card.addEventListener('pointerdown', function (e) {
      dragging = true; downX = e.clientX; vel = 0;
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    card.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var prev = angle;
      angle = Math.max(-26, Math.min(26, (e.clientX - downX) * 0.11));
      vel = angle - prev;
      wake();
    });
    function release() {
      if (!dragging) return;
      dragging = false; target = 0;
      vel = Math.max(-14, Math.min(14, vel * 1.35));
      wake();
    }
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  })();
})();
