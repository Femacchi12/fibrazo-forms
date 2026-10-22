const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const {IDBFactory}=require('fake-indexeddb');
let online=false,fail=true,posts=0;const originalId='EXISTING-OPERATOR',source=new Map([[originalId,{note:'old',photo:'old-link'}]]),window=new EventTarget();
window.firebase={auth:()=>({currentUser:{email:'fixture@example.test',getIdToken:async()=> 'fixture'},onAuthStateChanged(){}})};
const ctx=vm.createContext({window,document:{getElementById:()=>null,addEventListener(){}},navigator:{get onLine(){return online}},indexedDB:new IDBFactory(),crypto:require('node:crypto').webcrypto,Blob,AbortController,CustomEvent,Event,console,location:{protocol:'http:'},setTimeout:(f,n)=>{const t=setTimeout(f,n);t.unref();return t;},clearTimeout,setInterval:(f,n)=>{const t=setInterval(f,n);t.unref();return t;},clearInterval,fetch:async(url,o)=>{
 const p=JSON.parse(o.body);posts++;assert.equal(p.editId,originalId);source.set(p.editId,{note:p.data.note,photo:p.existingPhotoFields.foto_modelo_caja});if(fail){fail=false;throw Error('Lost ACK after update');}return {ok:true,status:200,json:async()=>({ok:true,id:p.editId,updated:true,competitionSync:{ok:true}})};
}});vm.runInContext(fs.readFileSync(__dirname+'/../offline-v04.js','utf8'),ctx);
(async()=>{
 const q=window.FIBRAZO_OFFLINE,payload={clientSubmissionId:'EDIT-OP-A',editId:originalId,formId:'INTELIGENCIA_OPERADOR',data:{note:'new'},location:{lat:2.95,lng:-75.24},existingPhotoFields:{foto_modelo_caja:'old-link'},photos:[{fieldKey:'new-photo',data:'photo-bytes'}]};
 const result=await q.submit(payload);assert.equal(result.queued,true);payload.data.note='mutated';
 await assert.rejects(()=>q.submit({...payload,clientSubmissionId:'EDIT-OP-B'}),/edición pendiente/);
 online=true;await q.syncAll({manual:true});let rows=await q.list();assert.equal(rows[0].status,'pending');assert.equal(rows[0].payload.photos[0].data,'photo-bytes');
 await q.restartSync();rows=await q.list();assert.equal(rows[0].status,'sent');assert.equal(rows[0].serverId,originalId);assert.equal(source.size,1);assert.equal(source.get(originalId).note,'new');assert.equal(source.get(originalId).photo,'old-link');assert.equal(posts,2);
 online=false;await q.submit({...payload,clientSubmissionId:'EDIT-OP-B'});assert.equal((await q.list()).length,2);
 online=true;await q.syncAll({manual:true});online=false;
 const simultaneous=await Promise.allSettled(['EDIT-OP-C','EDIT-OP-D'].map(clientSubmissionId=>q.submit({...payload,clientSubmissionId})));assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);assert.equal(simultaneous.filter(r=>r.status==='rejected').length,1);
 console.log('PASS offline edit durable; same-record pending edits blocked; lost ACK retries original record; photos retained until receipt; later edit allowed after confirmation');
})().catch(e=>{console.error(e);process.exitCode=1;online=false;});
