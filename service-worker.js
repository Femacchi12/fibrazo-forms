const CACHE="fibrazo-forms-v0.8.147-20261022-editqueue092";
const SYNC_TAG="fibrazo-queue-v1";
// Local, pinned SDK files avoid a CDN dependency during startup and worker wakeup.
importScripts('/vendor/firebase-app-compat-12.19.0.js','/vendor/firebase-auth-compat-12.19.0.js','/firebase-config.js','/background-territory.js','/qa-stratum-policy.js','/offline-v04.js');
const APP_SHELL=[
  "/","/public","/styles.css","/brand-alignment.css","/executive-density.css","/forms-config.js","/app.js","/access-v03.js",
  "/background-territory.js","/qa-stratum-policy.js","/ux-v04.js","/offline-v04.js","/admin-v03.js","/public-v05.js","/map-v01.js","/map-controls-ui.js","/manifest.webmanifest","/icon-fbz-growth-form-v8-192.png","/icon-fbz-growth-form-v8-512.png","/forms-field-scale.css","/firebase-config.js",
  "/vendor/firebase-app-compat-12.19.0.js","/vendor/firebase-auth-compat-12.19.0.js"
];
const REMOTE_SHELL=[
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/@tomickigrzegorz/leaflet-rotate@0.2.4/dist/leaflet-rotate.umd.min.js",
  "https://unpkg.com/@tomickigrzegorz/leaflet-rotate@0.2.4/dist/leaflet-rotate.css"
];
function navigationResponse(response){
  // Vercel cleanUrls redirects /index.html to /. A redirected cached Response
  // is forbidden for navigation requests whose redirect mode is manual.
  const headers=new Headers(response.headers);
  headers.delete('content-encoding');headers.delete('content-length');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function boundedFetch(request,options={},timeout=5000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(request,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
}
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(REMOTE_SHELL.map(async url=>{const r=await boundedFetch(new Request(url,{mode:'cors'}));if(r.ok)await cache.put(url,r);}));
    await self.skipWaiting();
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
  const request=event.request;if(request.method!=="GET")return;
  const url=new URL(request.url);
  // Never store authenticated responses or intercept Firebase's auth handler.
  if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/__/"))return;
  const local=url.origin===self.location.origin;
  if(!local&&!REMOTE_SHELL.includes(url.href)&&!["fonts.googleapis.com","fonts.gstatic.com"].includes(url.hostname))return;
  const navigation=request.mode==="navigate"&&local;
  const shellPath=navigation?(/^\/(f\/|public(?:\.html)?(?:\/|$))/.test(url.pathname)?'/public':'/'):url.pathname;
  const staticAsset=local&&APP_SHELL.includes(shellPath);
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // This cache was installed atomically for this release. Query versions of a
    // known shell asset use the same release; never borrow an older cache.
    const cached=await cache.match(staticAsset?shellPath:request);
    if(cached)return navigation?navigationResponse(cached):cached;
    try{
      const fresh=await boundedFetch(request,{},5000);
      if(!fresh.ok)throw new Error('SHELL_HTTP_'+fresh.status);
      if(staticAsset||url.origin!==self.location.origin)await cache.put(staticAsset?shellPath:request,fresh.clone());
      return navigation?navigationResponse(fresh):fresh;
    }catch(_){return Response.error();}
  })());
});
let authReady=null;
async function workerUser(){
  if(!authReady){
    if(!firebase.apps.length)firebase.initializeApp(self.FIBRAZO_FIREBASE_CONFIG);
    authReady=new Promise((resolve,reject)=>{
      let unsubscribe;const timer=setTimeout(()=>reject(new Error('AUTH_RESTORE_TIMEOUT')),10000);
      unsubscribe=firebase.auth().onAuthStateChanged(user=>{clearTimeout(timer);unsubscribe?.();resolve(user);},error=>{clearTimeout(timer);reject(error);});
    }).catch(error=>{authReady=null;throw error;});
  }
  await authReady;
  return firebase.auth().currentUser;
}
self.addEventListener('sync',event=>{
  if(event.tag!==SYNC_TAG)return;
  event.waitUntil((async()=>{
    const user=await workerUser();
    if(!user)throw new Error('AUTH_REQUIRED');
    const result=await self.FIBRAZO_OFFLINE.syncAll({background:true});
    if(result?.busy||result?.failed||result?.authRequired||(result?.remaining&&!result?.synced))throw new Error('QUEUE_RETRY');
    // A bounded batch keeps the event short. Re-register while firing so the
    // browser schedules another event for the rest, rather than silently stopping.
    if(result?.remaining)await self.registration.sync.register(SYNC_TAG);
  })());
});
