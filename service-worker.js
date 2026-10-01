const CACHE="fibrazo-forms-v0.4.2-20261001";
const APP_SHELL=[
  "/","/index.html","/public.html","/styles.css","/forms-config.js","/app.js","/access-v03.js",
  "/ux-v04.js","/offline-v04.js","/admin-v03.js","/public-v03.js","/manifest.webmanifest","/icon.svg"
];
const REMOTE_SHELL=[
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"
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

  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(request);
        const cache=await caches.open(CACHE);
        cache.put("/index.html",fresh.clone());
        return fresh;
      }catch(_){
        if(url.pathname.startsWith("/f/")) return (await caches.match("/public.html")) || Response.error();
        return (await caches.match("/index.html")) || (await caches.match("/"));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
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