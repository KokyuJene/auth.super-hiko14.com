// ① テーマ初期化（フラッシュ防止 — DOMContentLoaded前に実行）
(function() {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('theme');
    if (saved) {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (_) {}
  document.documentElement.setAttribute('data-theme', theme);
})();

// ② ページ遷移プログレスバー
(function() {
  var SK = 'navProgress';

  function createBar() {
    var bar = document.createElement('div');
    bar.id = 'nav-progress';
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  document.addEventListener('DOMContentLoaded', function() {
    // ページA: クリック時にフラグを立てる
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('download')) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      // サブドメイン間対応: クッキーにフラグ（domain共有）
      document.cookie = SK + '=1; path=/; domain=super-hiko14.com; max-age=10';
      try { sessionStorage.setItem(SK, '1'); } catch (_) {}
    });

    // ページB: フラグを確認してアニメーション開始
    var pending = false;
    try {
      if (sessionStorage.getItem(SK) === '1') {
        pending = true;
        sessionStorage.removeItem(SK);
      } else {
        var match = document.cookie.match(new RegExp('(^| )' + SK + '=([^;]+)'));
        if (match && match[2] === '1') {
          pending = true;
          document.cookie = SK + '=; path=/; domain=super-hiko14.com; max-age=0';
        }
      }
    } catch (_) {}

    if (pending) {
      var bar = createBar();
      bar.classList.add('nav-progress-arrive-start');
      void bar.offsetWidth;
      bar.classList.remove('nav-progress-arrive-start');
      bar.classList.add('nav-progress-arrive');
      setTimeout(function() {
        bar.classList.add('nav-progress-arrive-done');
        setTimeout(function() { bar.remove(); }, 600);
      }, 380);
    }
  });
})();

// ③ DOMContentLoaded で各初期化
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initSiteNav();
  initScrollToTop();
  initAuth();
});

// テーマトグル
function initTheme() {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (_) {}
  });
}

// サイトナビゲーション初期化
function initSiteNav() {
  var nav     = document.querySelector('.site-nav');
  var toggle  = document.querySelector('.site-nav-toggle');
  var drawer  = document.querySelector('.site-nav-drawer');
  if (!toggle || !drawer || !nav) return;

  // バックドロップ
  var backdrop = document.createElement('div');
  backdrop.className = 'site-nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  // ドロワーヘッダー
  var drawerHeader = document.createElement('div');
  drawerHeader.className = 'site-nav-drawer-header';
  drawerHeader.innerHTML =
    '<span class="site-nav-drawer-brand">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>' +
      '</svg>' +
      'Navigation' +
    '</span>';
  drawer.insertBefore(drawerHeader, drawer.firstChild);

  // アイコンマップ
  var ICON_MAP = {
    'super-hiko14.com':        '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    'about.super-hiko14.com':  '<path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>',
    'kokyujene.super-hiko14.com': '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
    'tools.super-hiko14.com':  '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>',
    'auth.super-hiko14.com':   '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>',
    'legal.super-hiko14.com':  '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>',
  };

  drawer.querySelectorAll('a[href]').forEach(function(link) {
    try {
      var host = new URL(link.href).hostname;
      var path = ICON_MAP[host];
      if (!path) return;
      var iconEl = document.createElement('span');
      iconEl.className = 'site-nav-item-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">' + path + '</svg>';
      link.insertBefore(iconEl, link.firstChild);
    } catch (_) {}
  });

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-visible');
    if (window.innerWidth <= 680) document.body.classList.add('site-nav-open');
    setTimeout(function() {
      var first = drawer.querySelector('a[href]');
      if (first) first.focus({ preventScroll: true });
    }, 120);
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-visible');
    document.body.classList.remove('site-nav-open');
  }

  toggle.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeNav() : openNav();
  });

  backdrop.addEventListener('click', function() { closeNav(); toggle.focus(); });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.site-nav')) closeNav();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeNav(); toggle.focus(); }
  });

  drawer.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    if (drawer.getAttribute('aria-hidden') === 'true') return;
    var focusables = Array.from(
      drawer.querySelectorAll('a[href], [tabindex]:not([tabindex="-1"])')
    ).filter(function(el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0];
    var last  = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // タッチスワイプ
  var touchStartY = 0;
  drawer.addEventListener('touchstart', function(e) { touchStartY = e.touches[0].clientY; }, { passive: true });
  drawer.addEventListener('touchend', function(e) {
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (dy < -60) closeNav();
  }, { passive: true });

  // カレントページのハイライト（aria-current）
  try {
    var currentHost = location.hostname;
    drawer.querySelectorAll('a[href]').forEach(function(link) {
      try {
        var linkHost = new URL(link.href).hostname;
        if (linkHost === currentHost) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      } catch (_) {}
    });
  } catch (_) {}

  drawer.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() { closeNav(); });
  });

  // ナビ位置追従（.box がない場合は何もしない）
  var boxes = Array.from(document.querySelectorAll('.box'));
  if (!boxes.length) {
    // auth ページには .box がないので固定位置のまま
    nav.style.top = '';
    return;
  }

  var lastBoxIdx = -1;
  var rafId = null;

  function findActiveBoxIndex() {
    var idx = -1;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].offsetParent === null) continue;
      if (boxes[i].querySelector('.footer')) continue;
      var rect = boxes[i].getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.75) idx = i;
    }
    if (idx === -1) {
      for (var j = 0; j < boxes.length; j++) {
        if (boxes[j].offsetParent !== null) { idx = j; break; }
      }
    }
    return Math.max(0, idx);
  }

  function applyNavPosition() {
    if (window.innerWidth <= 680) { nav.style.top = ''; lastBoxIdx = -1; return; }
    var idx  = findActiveBoxIndex();
    var rect = boxes[idx].getBoundingClientRect();
    var targetTop = Math.min(Math.max(rect.top + rect.height * 0.6, 12), window.innerHeight * 0.38);
    if (idx !== lastBoxIdx) {
      lastBoxIdx = idx;
      nav.style.top = targetTop + 'px';
    }
  }

  function onFrame() {
    applyNavPosition();
    rafId = requestAnimationFrame(onFrame);
  }
  rafId = requestAnimationFrame(onFrame);
}

// ④ 認証ページの IP チェック
function initAuth() {
  var authBtn  = document.getElementById('auth-btn');
  var statusDot  = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');

  // auth ボタンがないページ（success / error）では何もしない
  if (!authBtn) return;

  fetch('/api/check-ip')
    .then(function(res) {
      if (!res.ok) throw new Error('check failed');
      return res.json();
    })
    .then(function(data) {
      if (data.clean === false) {
        // VPN / Proxy 検出
        statusDot.className = 'status-dot status-dot--blocked';
        statusText.textContent = 'VPN / プロキシが検出されました';
        authBtn.classList.add('auth-btn--disabled');
        var btnText = document.getElementById('auth-btn-text');
        if (btnText) btnText.textContent = '認証できません';
      } else {
        // クリーン
        statusDot.className = 'status-dot status-dot--ok';
        statusText.textContent = '接続に問題ありません';
        authBtn.classList.remove('auth-btn--disabled');
        var btnText2 = document.getElementById('auth-btn-text');
        if (btnText2) btnText2.textContent = 'Discordで認証する';
      }
    })
    .catch(function() {
      // エラー時はボタンを有効化（サーバー側で再チェック）
      statusDot.className = 'status-dot status-dot--ok';
      statusText.textContent = '接続に問題ありません';
      authBtn.classList.remove('auth-btn--disabled');
      var btnText3 = document.getElementById('auth-btn-text');
      if (btnText3) btnText3.textContent = 'Discordで認証する';
    });
}
