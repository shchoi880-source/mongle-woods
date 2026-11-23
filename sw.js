// 서비스 워커: 오프라인 실행 (캐시 우선, 버전이 바뀌면 새 캐시)
const CACHE = 'mongle-0.1.0-ma-1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'css/ui.css',
  'js/core.js', 'js/save.js', 'js/time.js', 'js/data.js', 'js/world.js', 'js/art.js', 'js/actors.js',
  'js/input.js', 'js/audio.js', 'js/sys.js', 'js/eco.js', 'js/npc.js', 'js/ui.js', 'js/game.js', 'js/dev.js', 'js/boot.js',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
