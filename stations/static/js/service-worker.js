 const CACHE_NAME = "fuelsmart-v1";

// Only cache files that actually exist on your server
const OFFLINE_URLS = [
  "/", 
  "/static/js/map.js",
  "/static/images/petrol.png",
  "/static/images/ev.png",
  "/static/pwa/manifest.webmanifest",
];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of OFFLINE_URLS) {
        try {
          const response = await fetch(url, { mode: "no-cors" });

          if (response.ok || response.type === "opaque") {
            await cache.put(url, response.clone());
          } else {
            console.warn("Skipping (not found):", url);
          }

        } catch (err) {
          console.warn("Skipping (fetch failed):", url);
        }
      }

      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
