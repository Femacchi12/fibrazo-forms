const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {IDBFactory}=require('fake-indexeddb');
let online=false,hang=true,posts=0,started=false;
const window=new EventTarget();window.firebase={auth:()=>({currentUser:{email:'fixture@example.test',getIdToken:async()=> 'fixture'},onAuthStateChanged(){}})};
const context=vm.createContext({window,document:{getElementById:()=>null,addEventListener(){}},navigator:{get onLine(){return online}},indexedDB:new IDBFactory(),crypto:require('node:crypto').webcrypto,Blob,AbortController,CustomEvent,Event,console,location:{protocol:'http:'},setTimeout:(f,n)=>{const t=setTimeout(f,n);t.unref();return t;},clearTimeout,setInterval:(f,n)=>{const t=setInterval(f,n);t.unref();return t;},clearInterval,fetch:async(url,options)=>{
 posts++;started=true;
 // Headers arrive but body stalls: cancellation must cover both.
 return {ok:true,status:200,json:()=>hang?new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})))):Promise.resolve({ok:true,id:JSON.parse(options.body).clientSubmissionId})};
}});
vm.runInContext(fs.readFileSync(__dirname+'/../offline-v04.js','utf8'),context);
(async()=>{
 const q=window.FIBRAZO_OFFLINE;
 await q.submit({clientSubmissionId:'RESTART-TEST',formId:'CHURN',data:{note:'original'},photos:[{data:'photo'}]});online=true;
 const run=q.syncAll();while(!started)await new Promise(r=>setTimeout(r,5));
 assert.equal((await q.syncAll()).busy,true);
 hang=false;await q.restartSync();await run;
 const rows=await q.list();assert.equal(rows.length,1);assert.equal(rows[0].clientSubmissionId,'RESTART-TEST');assert.equal(rows[0].status,'sent');assert.equal(rows[0].payload.data.note,'original');assert.equal(posts,2);
 console.log('PASS restart aborts stalled body, awaits lease release, preserves original ID/data and confirms same record');online=false;
})().catch(e=>{console.error(e);process.exitCode=1;online=false;});
