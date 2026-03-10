// (1) テーマ初期化（フラッシュ防止 － DOMContentLoaded前に実行）
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

// (2) ページ遷移プログレスバー
(function() {
  var SK = 'navProgress';
  function createBar() {
    var bar = document.createElement('div');
    bar.id = 'nav-progress';
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('download')) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      document.cookie = SK + '=1; path=/; domain=super-hiko14.com; max-age=10';
      try { sessionStorage.setItem(SK, '1'); } catch (_) {}
    });
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

// (3) DOMContentLoaded で各初期化
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

  var backdrop = document.createElement('div');
  backdrop.className = 'site-nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  nav.appendChild(backdrop);

  function open() {
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function() {
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) close(); else open();
  });
  backdrop.addEventListener('click', close);
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') close();
  });
}

// スクロールトップ初期化
function initScrollToTop() {
  var btn = document.querySelector('.scroll-to-top');
  if (!btn) return;
  window.addEventListener('scroll', function() {
    if (window.scrollY > 200) {
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  }, { passive: true });
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 認証ボタン制御
function initAuth() {
  var btn = document.getElementById('auth-btn');
  var dot = document.getElementById('status-dot');
  var txt = document.getElementById('status-text');
  if (!btn) return;

  // ボタンを先に有効化しておく（楽観的UI）
  btn.classList.remove('auth-btn--disabled');
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';

  // API経由でボットの死活監視を並行して行う
  fetch('/api/health')
    .then(function(res) {
      if (res.ok) {
        dot.className = 'status-dot status-dot--online';
        txt.textContent = 'サーバーオンライン';
      } else {
        throw new Error();
      }
    })
    .catch(function() {
      // 起動していない場合
      dot.className = 'status-dot status-dot--offline';
      txt.textContent = 'サーバーメンテナンス中';
    });
}