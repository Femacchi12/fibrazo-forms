const CACHE="fibrazo-forms-v0.8.3-20261003-03";
const APP_SHELL=[
  "/","/index.html","/public","/styles.css","/forms-config.js","/app.js","/access-v03.js",
  "/ux-v04.js","/offline-v04.js","/admin-v03.js","/public-v05.js","/manifest.webmanifest","/icon-fzo-growth-form-v6.svg"
];
const REMOTE_SHELL=[
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js"
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(REMOTE_SHELL.map(url=>cache.add(new Request(url,{mode:"cors"}))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("fibrazo-forms-")&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET") return;
  const url=new URL(request.url);
  if(url.pathname.startsWith("/api/")) return;
  if(url.pathname.startsWith("/__/")) return;

  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(request);
        const cache=await caches.open(CACHE);
        cache.put("/index.html",fresh.clone());
        return fresh;
      }catch(_){
        if(url.pathname.startsWith("/f/")) return (await caches.match("/public")) || Response.error();
        return (await caches.match("/index.html")) || (await caches.match("/"));
      }
    })());
    return;
  }

  const isVersionedAppAsset=url.origin===self.location.origin &&
    (/\.(?:js|css|webmanifest)$/.test(url.pathname));

  if(isVersionedAppAsset){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(request,{cache:"no-store"});
        const cache=await caches.open(CACHE);
        if(fresh&&fresh.ok) await cache.put(request,fresh.clone());
        return fresh;
      }catch(_){
        return (await caches.match(request)) || (await caches.match(url.pathname)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached) return cached;
    try{
      const fresh=await fetch(request);
      const cache=await caches.open(CACHE);
      if(fresh && (fresh.ok || fresh.type==="opaque")) await cache.put(request,fresh.clone());
      return fresh;
    }catch(error){
      throw error;
    }
  })());
});