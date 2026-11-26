// 서비스 워커: 설치를 마친 한 버전의 파일끼리 사용해 오프라인에서도 실행한다.
const CACHE_PREFIX = 'mongle-';
const CACHE = CACHE_PREFIX + '0.16.6-sizes-1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'css/ui.css', 'fonts/jua-subset.woff2',
  'js/scenery.js', 'assets/scenery/materials.webp', 'assets/scenery/details.webp', 'assets/scenery/buildings.webp', 'assets/scenery/trees.webp', 'assets/scenery/props.webp', 'assets/scenery/title.jpg',
  'assets/chars/s/postkeeper-walk.png', 'assets/chars/s/postkeeper-male-walk.png',
  'assets/chars/parts/accessory-female-bear-ears.webp', 'assets/chars/parts/accessory-female-golden-crown.webp', 'assets/chars/parts/accessory-female-pumpkin-hat.webp', 'assets/chars/parts/accessory-female-sakura-pin.webp', 'assets/chars/parts/accessory-female-snowflake-crown.webp', 'assets/chars/parts/accessory-female-star-beret.webp', 'assets/chars/parts/accessory-female-watermelon-cap.webp', 'assets/chars/parts/accessory-hair-bow.webp', 'assets/chars/parts/accessory-male-bear-ears.webp', 'assets/chars/parts/accessory-male-golden-crown.webp', 'assets/chars/parts/accessory-male-pumpkin-hat.webp', 'assets/chars/parts/accessory-male-sakura-pin.webp', 'assets/chars/parts/accessory-male-snowflake-crown.webp', 'assets/chars/parts/accessory-male-star-beret.webp', 'assets/chars/parts/accessory-male-watermelon-cap.webp', 'assets/chars/parts/accessory-postal-cap.webp', 'assets/chars/parts/accessory-round-glasses.webp', 'assets/chars/parts/head-female-bob.webp', 'assets/chars/parts/head-female-bun.webp', 'assets/chars/parts/head-female-high-ponytail.webp', 'assets/chars/parts/head-female-space-buns.webp', 'assets/chars/parts/head-female-straight-long.webp', 'assets/chars/parts/head-female-twin-braids.webp', 'assets/chars/parts/head-female-wavy.webp', 'assets/chars/parts/head-male-buzz-cut.webp', 'assets/chars/parts/head-male-curly.webp', 'assets/chars/parts/head-male-mullet.webp', 'assets/chars/parts/head-male-pompadour.webp', 'assets/chars/parts/head-male-side-part.webp', 'assets/chars/parts/head-male-topknot.webp', 'assets/chars/parts/head-male-tousled.webp', 'assets/chars/parts/outfit-cardigan.webp', 'assets/chars/parts/outfit-female-dress.webp', 'assets/chars/parts/outfit-female-pajamas.webp', 'assets/chars/parts/outfit-female-raincoat.webp', 'assets/chars/parts/outfit-male-onepiece.webp', 'assets/chars/parts/outfit-male-pajamas.webp', 'assets/chars/parts/outfit-male-raincoat.webp', 'assets/chars/parts/outfit-overalls.webp',
  'js/core.js', 'js/save.js', 'js/firebase-config.js', 'js/cloud.js', 'js/net.js', 'js/time.js', 'js/data.js', 'js/world.js', 'js/art.js', 'js/actors.js',
  'js/input.js', 'js/audio.js', 'js/sys.js', 'js/eco.js', 'js/npc.js', 'js/npclife.js', 'js/villahome.js', 'js/house.js', 'js/yard.js', 'js/museum.js', 'js/museumhall.js', 'js/mail.js', 'js/nest.js', 'js/requests.js', 'js/news.js', 'js/tide.js', 'js/lantern.js', 'js/story.js', 'js/festival.js', 'js/map.js', 'js/goals.js', 'js/skills.js', 'js/quests.js', 'js/events.js', 'js/farm.js', 'js/cropart.js', 'js/cook.js', 'js/ranch.js', 'js/ui.js', 'js/game.js', 'js/dev.js', 'js/boot.js',
  'assets/chars/s/bori-w.webp', 'assets/chars/s/bori-walk.webp', 'assets/chars/s/bori.webp', 'assets/chars/s/danchu-w.webp', 'assets/chars/s/danchu-walk.webp', 'assets/chars/s/danchu.webp', 'assets/chars/s/danpung-w.webp', 'assets/chars/s/danpung.webp', 'assets/chars/s/ddalang-surprised-w.webp', 'assets/chars/s/ddalang-surprised.webp', 'assets/chars/s/ddalang-w.webp', 'assets/chars/s/ddalang-walk.webp', 'assets/chars/s/ddalang.webp', 'assets/chars/s/hotteok-w.webp', 'assets/chars/s/hotteok-walk.webp', 'assets/chars/s/hotteok.webp', 'assets/chars/s/jjongal-w.webp', 'assets/chars/s/jjongal-walk.webp', 'assets/chars/s/jjongal.webp', 'assets/chars/s/lime-w.webp', 'assets/chars/s/lime-walk.webp', 'assets/chars/s/lime.webp', 'assets/chars/s/mongsil-w.webp', 'assets/chars/s/mongsil-walk.webp', 'assets/chars/s/mongsil.webp', 'assets/chars/s/mungchi-w.webp', 'assets/chars/s/mungchi-walk.webp', 'assets/chars/s/mungchi.webp', 'assets/chars/s/postkeeper-male-w.webp', 'assets/chars/s/postkeeper-male.webp', 'assets/chars/s/postkeeper-w.webp', 'assets/chars/s/postkeeper.webp', 'assets/chars/s/slowpoke-w.webp', 'assets/chars/s/slowpoke.webp', 'assets/chars/s/sogeum-happy-w.webp', 'assets/chars/s/sogeum-happy.webp', 'assets/chars/s/sogeum-w.webp', 'assets/chars/s/sogeum-walk.webp', 'assets/chars/s/sogeum.webp', 'assets/chars/s/todak-w.webp', 'assets/chars/s/todak.webp', 'assets/chars/s/tosil-w.webp', 'assets/chars/s/tosil.webp',
];
// 예전 HTTP 캐시에 있는 파일로 새 버전 캐시를 채우지 않는다.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE);
    await Promise.all(oldCaches.map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

const scope = new URL(self.registration.scope);
const updatePage = new URL('update.html', scope).pathname;
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || url.pathname === updatePage) return;
  event.respondWith(serve(request));
});

async function serve(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return request.mode === 'navigate' ? (await cache.match('index.html')) || Response.error() : Response.error();
  }
}
