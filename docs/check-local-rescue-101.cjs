const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb');
let html,headers={};require('../api/recovery')({method:'GET'},{setHeader:(k,v)=>headers[k]=v,status:n=>{assert.equal(n,200);return{send:s=>html=s};}});
assert.match(headers['Content-Security-Policy'],/connect-src 'none'/);assert.match(headers['Cache-Control'],/no-store/);
const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
async function fixture(seed){
 const idb=new IDBFactory();if(seed){const db=await new Promise((resolve,reject)=>{const r=idb.open('fibrazoFormsOffline',1);r.onupgradeneeded=()=>r.result.createObjectStore('queue',{keyPath:'clientSubmissionId'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise(r=>{const tx=db.transaction('queue','readwrite');for(const x of seed)tx.objectStore('queue').put(x);tx.oncomplete=r;});db.close();}
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,checked:false});return nodes.get(id);};let blob,unregistered=0,deleted=[],navigated='';
 const ctx=vm.createContext({indexedDB:idb,Blob,Date,JSON,String,Error,Promise,URL:Object.assign(class extends URL {},{createObjectURL:b=>{blob=b;return 'blob:fixture';},revokeObjectURL(){}}),location:{origin:'https://fixture',replace:p=>navigated=p},document:{getElementById:node,createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},navigator:{serviceWorker:{getRegistrations:async()=>[{scope:'https://fixture/',unregister:async()=>unregistered++}]}},caches:{keys:async()=>['fibrazo-forms-old','unrelated'],delete:async k=>deleted.push(k)},setTimeout(){}});
 vm.runInContext(script,ctx);
 return{ctx,node,idb,get blob(){return blob},get unregistered(){return unregistered},get deleted(){return deleted},get navigated(){return navigated}};
}
(async()=>{
 const record={clientSubmissionId:'original-id',userEmail:'eduardo@fibrazo.com',status:'pending',payload:{photos:[{data:'original-photo'}],data:{note:'original-note'},location:{lat:2.9,lng:-75.2}}};
 const f=await fixture([record,{...record,clientSubmissionId:'other',userEmail:'other@test'},{clientSubmissionId:'lease',kind:'lease'}]);
 await f.ctx.inspect();assert.match(f.node('status').textContent,/Registros locales: 1/);
 await f.node('repair').onclick();assert.equal(f.unregistered,0);
 await f.node('backup').onclick();const exported=JSON.parse(await f.blob.text());assert.equal(exported.recordCount,1);assert.deepEqual(exported.records[0],record);
 f.node('confirmed').checked=true;f.node('confirmed').onchange();await f.node('repair').onclick();assert.equal(f.unregistered,1);assert.deepEqual(f.deleted,['fibrazo-forms-old']);assert.match(f.navigated,/rescate=/);
 const remaining=await f.ctx.readLocalQueue();assert.equal(remaining[0].payload.photos[0].data,'original-photo');
 const empty=await fixture();await empty.ctx.inspect();assert.match(empty.node('status').textContent,/No se encontró/);assert.equal((await empty.idb.databases()).length,0);
 console.log('PASS101: local-only rescue, CSP denies transmission, owner isolation, original IDs/photos/GPS retained, repair blocked until downloaded+confirmed, only app cache/SW removed, IndexedDB preserved, missing database never created');
})().catch(e=>{console.error(e);process.exitCode=1});
