// Local-only browser fixtures. No production submissions or credentials.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=process.cwd();let writes=[],lookup=0;let oldSW=true;let mockAuth=true;const failures=[];
const fake=`const fixtureUser={uid:'fixture',email:'fixture@fibrazo.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};const fixtureAuth={currentUser:fixtureUser,setPersistence:async()=>{},onAuthStateChanged:fn=>{queueMicrotask(()=>fn(fixtureUser));return()=>{};},signOut:async()=>{}};function auth(){return fixtureAuth;}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};globalThis.firebase={apps:[],initializeApp(){this.apps.push({});},auth};`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/service-worker.js'&&oldSW){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'docs/fixtures/service-worker-142.txt')));return;}
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
  let page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/service-worker.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
  const old=context.serviceWorkers()[0];await context.setOffline(true);
  await page.evaluate(()=>window.FIBRAZO_OFFLINE.submit({clientSubmissionId:'FIXTURE-RECOVER-087',formId:'CHURN',data:{nota:'preservar respuesta original'},photos:[{data:'photo-fixture'}],isTest:false}));
  let failed=false;try{await page.reload({waitUntil:'domcontentloaded'});}catch(e){failed=e.message.includes('ERR_FAILED');}assert(failed,'142 must reproduce Chrome ERR_FAILED with real308 cleanUrls');console.log('PASS reproduces142 ERR_FAILED on re-entry with308 redirects');
  oldSW=false;await context.setOffline(false);await old.evaluate(()=>self.registration.update()).catch(()=>{});
  let next;for(let i=0;i<80&&!next;i++){for(const w of context.serviceWorkers()){try{if(await w.evaluate(()=>CACHE!=='fibrazo-forms-v0.8.142-20261022-offline086'&&!self.registration.installing&&!self.registration.waiting&&self.registration.active?.state==='activated')){next=w;break;}}catch(_){}}if(!next)await new Promise(r=>setTimeout(r,100));}assert(next,'143 update must activate');
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.FIBRAZO_OFFLINE);
  const records=await page.evaluate(()=>window.FIBRAZO_OFFLINE.list());const record=records.find(r=>r.clientSubmissionId==='FIXTURE-RECOVER-087');assert(record&&record.payload.data.nota==='preservar respuesta original');assert.equal(records.filter(r=>r.clientSubmissionId==='FIXTURE-RECOVER-087').length,1);console.log('PASS update143 recovers failed launch without clearing IndexedDB or duplicating response');
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.FIBRAZO_OFFLINE);console.log('PASS recovered PWA reopens offline after cleanUrls migration');
  await context.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
