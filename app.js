// חיבור לשרת, כניסה בקוד, ותרגום google.script.run לבקשות POST.
// קוד גישה אחד לכל האפליקציה. אחרי כניסה השרת שולח את רשימת הקבוצות (עם השמות והמונחים) ואת הלוגו,
// והם נשמרים בטלפון. בוחרים קבוצה במסך הראשי, והיא נשמרת ב-session.b.
var APP = (function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbzbOtFR7dg26M_DyC_6W89kU1xphbv0aiaENAGJ6VIhmqmnPq4-96ItqA3OvA5KamBHmA/exec';
  var SKEY = 'rt_session';
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

  var session = null;
  try { session = JSON.parse(get(SKEY) || 'null'); } catch (e) {}
  var page = (location.pathname.match(/(timer|names)\.html$/) || [])[1] || 'home';
  function current() {
    if (!session || !session.battalions) return null;
    return session.battalions.filter(function (x) { return x.b === session.b; })[0] || null;
  }
  var cur = current();
  if (page !== 'home' && !cur) location.replace('./');

  function post(body) {
    return fetch(API_URL, { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) throw new Error('שגיאת שרת ' + r.status);
      return r.json();
    }).then(function (res) {
      if (res.status === 'ok') return res.result;
      var err = new Error(res.status === 'denied' ? res.reason : (res.message || 'שגיאה'));
      err.denied = res.status === 'denied';
      throw err;
    });
  }

  function save() { put(SKEY, JSON.stringify(session)); }
  // כניסה (או רענון ברקע): הקוד מחזיר את כל הקבוצות. הבחירה הקודמת נשמרת אם הקבוצה עדיין קיימת.
  function login(code) {
    return post({ action: 'login', code: code }).then(function (s) {
      var prev = session && session.b;
      s.code = code;
      s.b = s.battalions.some(function (x) { return x.b === prev; }) ? prev : '';
      session = s; save(); cur = current();
      return s;
    });
  }
  function choose(b) { session.b = b; save(); cur = current(); }
  function logout() { session = null; put(SKEY, ''); }

  function call(action, args) {
    if (!session) return Promise.reject(Object.assign(new Error('no_session'), { denied: true }));
    return post({ action: action, b: cur ? cur.b : '', code: session.code, args: args || [] });
  }

  // google.script.run כמו בדפים המקוריים: הארגומנט הראשון (הקבוצה) מוחלף בזו של הכניסה
  function runner() {
    var ok = function () {}, fail = function () {};
    var p = new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { ok = f; return p; };
        if (name === 'withFailureHandler') return function (f) { fail = f; return p; };
        return function () {
          var args = Array.prototype.slice.call(arguments, 1);
          call(name, args).then(function (r) { ok(r); }, function (e) {
            // בטיימר לא יוצאים מהמסך באמצע ריצה: הזמנים נשמרים בטלפון, ומוצגת אזהרה
            if (e.denied && e.message !== 'locked' && page !== 'timer') {
              if (e.message !== 'locked') logout();
              location.replace('./?login=' + encodeURIComponent(e.message));
              return;
            }
            fail(e);
            if (e.denied && page === 'timer') {
              var st = document.getElementById('status');
              if (st) { st.textContent = 'קוד הגישה הוחלף. הזמנים שמורים בטלפון. כנס מחדש מהמסך הראשי כדי לשלוח אותם.'; st.className = 'warn'; }
            }
          });
        };
      }
    });
    return p;
  }
  window.google = { script: { get run() { return runner(); } } };

  document.addEventListener('DOMContentLoaded', function () {
    var imgs = document.querySelectorAll('img[data-logo]');
    for (var i = 0; i < imgs.length; i++) {
      if (session && session.logo) imgs[i].src = session.logo; else imgs[i].src = 'icons/icon-192.png';
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  var c = cur || {};
  return {
    page: page, login: login, logout: logout, choose: choose, call: call, get: get, put: put,
    get session() { return session; },
    bat: c.b || '', kind: c.kind || '', batName: c.name || '', labels: c.labels || {}
  };
})();
