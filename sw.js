// 車牌辨識管家 v1.5 － 離線快取
const VER = 'lpr-v1.5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER && k !== 'lpr-ocr').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                       // 上傳雲端（POST）不經過快取
  if (/script\.google|googleusercontent|drive\.google/.test(url.host)) return; // 雲端資料一律走網路
  // 辨識引擎與語言檔：先用快取（第一次下載後就能離線辨識）
  if (/cdn\.jsdelivr\.net|tessdata|tesseract/.test(url.href)) {
    e.respondWith(caches.open('lpr-ocr').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // 自己的網頁：先抓最新版，沒網路才用快取
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
});
