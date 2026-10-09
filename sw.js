const CACHE = 'star-bottle-v11';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) {
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = new URL(req.url);
  // 只处理同源请求
  if (url.origin !== location.origin) return;

  // HTML 主页面：网络优先（保证内容及时更新），离线时回退缓存
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(req).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, clone); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(r) {
          return r || caches.match('./star-bottle.html');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(function(r) {
      var network = fetch(req).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      });
      if (r) {
        // 后台刷新缓存
        network.catch(function() {});
        return r;
      }
      return network;
    })
  );
});
