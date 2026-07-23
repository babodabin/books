// 소형 도서관 v16 — 오프라인 캐시
const CACHE = 'library-v16';
const CORE = ['./', './index.html', './books.js', './manifest.json'];
const OPTIONAL = ['./icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 핵심 파일이 하나라도 없으면 새 서비스워커를 설치하지 않아
    // 기존에 정상 작동하던 버전을 그대로 유지한다.
    await cache.addAll(CORE);
    // 아이콘은 앱 실행의 핵심 파일이 아니므로 개별적으로 저장한다.
    await Promise.allSettled(OPTIONAL.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // 문서 이동만 index.html로 대체한다. books.js나 아이콘 요청에
  // HTML을 잘못 돌려주는 문제를 막는다.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
