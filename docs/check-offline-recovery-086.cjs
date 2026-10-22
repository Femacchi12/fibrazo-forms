// Local-only browser fixtures. No production submissions or credentials.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=process.cwd();let writes=[],lookup=0;let mockAuth=true;const failures=[];
const fake=`const fixtureUser={uid:'fixture',email:'fixture@fibrazo.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};const fixtureAuth={currentUser:fixtureUser,setPersistence:async()=>{},onAuthStateChanged:fn=>{queueMicrotask(()=>fn(fixtureUser));return()=>{};},signOut:async()=>{}};function auth(){return fixtureAuth;}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};globalThis.firebase={apps:[],initializeApp(){this.apps.push({});},auth};`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/index.html'){res.writeHead(308,{Location:'/'});res.end();return;}
 if(u.pathname==='/public.html'){res.writeHead(308,{Location:'/public'});res.end();return;}
 if(u.pathname.includes('identitytoolkit.googleapis.com')){let b='';req.on('data',x=>b+=x);req.on('end',()=>{const body=b?JSON.parse(b):{};res.setHeader('Content-Type','application/json');const payload={user_id:'fixture-sdk',sub:'fixture-sdk',email:'fixture@fibrazo.test',email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'password'}};const jwt=Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.fixture';res.end(JSON.stringify(u.pathname.includes('lookup')?{users:[{localId:'fixture-sdk',email:'fixture@fibrazo.test',emailVerified:true,passwordHash:'fixture',providerUserInfo:[{providerId:'password',email:'fixture@fibrazo.test',federatedId:'fixture@fibrazo.test'}]}]}:{localId:'fixture-sdk',email:'fixture@fibrazo.test',idToken:jwt,refreshToken:'fixture-refresh',expiresIn:'3600'}));});return;}
 if(u.pathname==='/sdk-test'){res.setHeader('Content-Type','text/html');res.end('<script src="/vendor/firebase-app-compat-12.19.0.js"></script><script src="/vendor/firebase-auth-compat-12.19.0.js"></script><script src="/firebase-config.js"></script><script>firebase.initializeApp(FIBRAZO_FIREBASE_CONFIG)</script>');return;}
 if(u.pathname.startsWith('/api/')){
  let body='';req.on('data',d=>body+=d);req.on('end',()=>{
   res.setHeader('Content-Type','application/json');
   if(u.pathname==='/api/access'){res.end(JSON.stringify({forms:['CHURN','EXPLORACION','EXPLORACION_PRESENCIAL','INTELIGENCIA_OPERADOR'].map(id=>({id,canAccess:true})),admin:false}));return;}
   if(u.pathname==='/api/exploration'){lookup++;res.end(JSON.stringify({ok:true,territorial:{version:'test'},cityStatus:'DENTRO',city:'Neiva',barrioStatus:'DENTRO',barrio:'Test',estratoStatus:'SIN_CAPA'}));return;}
   if(u.pathname==='/api/submissions'&&req.method==='POST'){const p=JSON.parse(body);if(req.headers.authorization!=='Bearer fixture-token'){res.statusCode=403;res.end('{}');return;}writes.push(p);res.end(JSON.stringify({ok:true,id:p.clientSubmissionId,masterSync:{ok:true},competitionSync:{ok:true}}));return;}
   res.end(JSON.stringify({ok:true,rows:[],isps:[],pending:[],items:[]}));
  });return;
 }
 if(mockAuth&&u.pathname==='/vendor/firebase-app-compat-12.19.0.js'){res.setHeader('Content-Type','text/javascript');res.end(fake);return;}
 if(mockAuth&&u.pathname==='/vendor/firebase-auth-compat-12.19.0.js'){res.setHeader('Content-Type','text/javascript');res.end('// fixture auth already installed');return;}
 const p=path.join(root,u.pathname==='/'?'/index.html':u.pathname==='/public'?'/public.html':u.pathname);
 try{let c=fs.readFileSync(p);if(!mockAuth&&u.pathname==='/vendor/firebase-auth-compat-12.19.0.js')c=Buffer.from(c.toString()+';const originalInit=firebase.initializeApp.bind(firebase);firebase.initializeApp=function(...args){const app=originalInit(...args);firebase.auth(app).useEmulator("http://127.0.0.1:'+server.address().port+'",{disableWarnings:true});return app;};');res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html');res.end(c);}catch(_){res.statusCode=404;res.end('missing');}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext();await context.route(/https:\/\//,r=>r.abort());
 let page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.FIBRAZO_UX_OPEN_FORM);await page.evaluate(()=>navigator.serviceWorker.register('/service-worker.js'));
 await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,r)=>setTimeout(()=>r(Error('SW_READY_TIMEOUT')),15000))]);if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 await page.evaluate(()=>window.FIBRAZO_UX_OPEN_FORM('EXPLORACION_PRESENCIAL'));
 const panel=page.locator('.form-history');await panel.locator('summary').click();assert(await panel.getAttribute('open')!==null);
 await page.locator('#formTitle').click();assert.equal(await panel.getAttribute('open'),null);console.log('PASS click outside collapses history');
 await panel.locator('summary').click();await page.evaluate(()=>window.FIBRAZO_UX_OPEN_FORM('INTELIGENCIA_OPERADOR'));assert.equal(await panel.getAttribute('open'),null);console.log('PASS switching forms collapses history');
 await panel.locator('summary').click();await page.locator('#closeForm').click();await page.evaluate(()=>window.FIBRAZO_UX_OPEN_FORM('INTELIGENCIA_OPERADOR'));assert.equal(await panel.getAttribute('open'),null);console.log('PASS exit/re-entry collapses history');
 const held=[];await page.route('**/api/access',route=>held.push(route));const weakStart=Date.now();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.body.classList.contains('auth-pending'),{timeout:3000});assert(Date.now()-weakStart<3000);console.log('PASS weak-signal permission request does not block cached dashboard');for(const route of held)await route.abort();await page.unroute('**/api/access');
 await context.setOffline(true);const start=Date.now();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.body.classList.contains('auth-pending'),{timeout:4000});assert(Date.now()-start<4000);await page.evaluate(()=>window.FIBRAZO_UX_OPEN_FORM('EXPLORACION_PRESENCIAL'));assert(await page.locator('#formWorkspace').isVisible());console.log('PASS airplane-mode reload and authorized form entry',Date.now()-start+'ms');
 await page.evaluate(async()=>{const q=window.FIBRAZO_OFFLINE,t=window.FIBRAZO_BACKGROUND_TERRITORY;for(let i=0;i<5;i++)await q.submit(t.snapshot({clientSubmissionId:'FIXTURE-CLOSED-'+i,formId:'EXPLORACION_PRESENCIAL',data:{municipio:'Neiva',sector_barrio:'Manual '+i,estrato_observado:'4'},location:{lat:2.93+i/10000,lng:-75.29},photos:[{data:'fixture'}],isTest:false},{manualFields:{sector_barrio:true},cityHint:'Neiva'}));});
 const worker=context.serviceWorkers()[0];await worker.evaluate(()=>{self.registration.sync.register=async()=>{};});await page.close();await context.setOffline(false);
 const result=await worker.evaluate(async()=>{const promises=[];const e=new Event('sync');Object.defineProperty(e,'tag',{value:'fibrazo-queue-v1'});e.waitUntil=p=>promises.push(p);self.dispatchEvent(e);await Promise.all(promises);return await self.FIBRAZO_OFFLINE.list();});
 assert(writes.length>=3);assert(writes.every(p=>p.data.sector_barrio.startsWith('Manual ')&&p.data.estrato_observado==='4'));
 console.log('PASS real Service Worker sync with no open page, owner token and manual fields preserved',writes.length);
 const result2=await worker.evaluate(async()=>{const ps=[],e=new Event('sync');Object.defineProperty(e,'tag',{value:'fibrazo-queue-v1'});e.waitUntil=p=>ps.push(p);self.dispatchEvent(e);await Promise.all(ps);return self.FIBRAZO_OFFLINE.list();});assert.equal(new Set(writes.map(p=>p.clientSubmissionId)).size,5);assert(result2.every(r=>r.status==='sent'));console.log('PASS bounded batches complete five closed-window jobs');
 await context.close();
 // The production Firebase SDK must itself load and restore auth in a worker.
 mockAuth=false;const real=await browser.newContext();const rp=await real.newPage();await rp.goto(origin+'/sdk-test',{waitUntil:'domcontentloaded'});await rp.evaluate(()=>firebase.auth().createUserWithEmailAndPassword('fixture@fibrazo.test','fixture-password-only'));await rp.waitForFunction(()=>firebase.auth().currentUser?.email==='fixture@fibrazo.test');await rp.evaluate(()=>navigator.serviceWorker.register('/service-worker.js'));await rp.evaluate(()=>navigator.serviceWorker.ready);const rw=real.serviceWorkers()[0];const actual=await rw.evaluate(async()=>{const ps=[],e=new Event('sync');Object.defineProperty(e,'tag',{value:'fibrazo-queue-v1'});e.waitUntil=p=>ps.push(p);self.dispatchEvent(e);try{await Promise.all(ps);return'ok';}catch(e){return e.message;}});assert.equal(actual,'ok');const restored=await rw.evaluate(async()=>(await workerUser())?.email);assert.equal(restored,'fixture@fibrazo.test');console.log('PASS pinned real Firebase SDK restores same persisted owner session in worker (local auth emulator fixture)');await real.close();
 assert.equal(failures.length,0,'unexpected JS errors: '+failures.join(';'));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
