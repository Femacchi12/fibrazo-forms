const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {IDBFactory}=require('fake-indexeddb');
const indexedDB=new IDBFactory();let online=false,email='fixture@fibrazo.test',mode='ok',lookups=0,posts=0,failedOnce=false,gate=null;
const writes=new Map(),seen=[],results=[];
function check(value,msg){assert.ok(value,msg);results.push('PASS '+msg);}
const response=(body,status=200)=>({ok:status<400,status,json:async()=>body});
async function fixtureFetch(url,options){
 if(String(url).startsWith('/api/exploration')){
  lookups++;
  if(mode==='lookup-fail'&&!failedOnce){failedOnce=true;throw Error('Simulated weak signal');}
  if(mode==='hold')await new Promise(resolve=>gate=resolve);
  if(mode==='incomplete')return response({ok:true});
  const lat=Number(new URL(url,'http://localhost').searchParams.get('lat'));
  return response({ok:true,territorial:{version:'fixture'},territorialVersion:'fixture',cityStatus:'DENTRO',city:'City '+lat,barrioStatus:'DENTRO',barrio:'Barrio '+lat,estratoStatus:'DENTRO',estrato:'3',catalogId:'TEST'});
 }
 if(url==='/api/submissions'){
  posts++;const p=JSON.parse(options.body);seen.push(p);if(!writes.has(p.clientSubmissionId))writes.set(p.clientSubmissionId,p);
  if(mode==='ack-loss'&&!failedOnce){failedOnce=true;throw Error('Response lost after write');}
  if(mode==='master-pending')return response({ok:true,id:p.clientSubmissionId,masterSync:{ok:false,reason:'FIXTURE_REVIEW'}});
  if(mode==='competition-pending')return response({ok:true,id:p.clientSubmissionId,masterSync:{ok:true},competitionSync:{ok:false,reason:'COMPETITION_BUSY_RETRY'}});
  return response({ok:true,id:p.clientSubmissionId,duplicate:posts>writes.size,masterSync:{ok:true,scope:'GLOBAL_ONLY'}});
 }
 throw Error('Unexpected request '+url);
}
function worker(){
 const window=new EventTarget(),document={getElementById:()=>null,addEventListener:()=>{},visibilityState:'visible'};
 window.firebase={auth:()=>({currentUser:{get email(){return email},getIdToken:async()=> 'fixture-token'},onAuthStateChanged:()=>{}})};
 const context=vm.createContext({window,document,navigator:{get onLine(){return online}},indexedDB,crypto:require('node:crypto').webcrypto,Blob,AbortController,CustomEvent,Event,console,location:{protocol:'http:'},setTimeout:(fn,n)=>{const t=setTimeout(fn,n);t.unref();return t;},clearTimeout,setInterval:(fn,n)=>{const t=setInterval(fn,n);t.unref();return t;},clearInterval,fetch:fixtureFetch});
 for(const file of ['qa-stratum-policy.js','background-territory.js','offline-v04.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),context,{filename:file});
 return window;
}
function payload(w,id,lat=4){return w.FIBRAZO_BACKGROUND_TERRITORY.snapshot({formId:'EXPLORACION_PRESENCIAL',clientSubmissionId:id,data:{nota:'original',estrato_observado:'5',sector_barrio:'Manual barrio'},location:{lat,lng:-73,accuracy:15},photos:[{data:'photo-fixture'}],isTest:false},{manualFields:{sector_barrio:true},cityHint:'City hint'});}
const records=w=>w.FIBRAZO_OFFLINE.list();
async function waitFor(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out');}
(async()=>{
 let w=worker();const b=worker();
 const original=payload(w,'A');await w.FIBRAZO_OFFLINE.submit(original);original.location.lat=90;original.photos[0].data='mutated';
 let rows=await records(w);check(rows[0].status==='territorial_pending'&&rows[0].payload.location.lat===4&&rows[0].payload.photos[0].data==='photo-fixture','offline durable immutable coordinate/photos');
 w=worker();check((await records(w))[0].payload.photos.length===1,'worker recreation retains pending photos');
 await w.FIBRAZO_OFFLINE.submit(payload(w,'B',5));online=true;
 await Promise.all([w.FIBRAZO_OFFLINE.syncAll({manual:true}),b.FIBRAZO_OFFLINE.syncAll({manual:true})]);
 rows=await records(w);check(writes.size===2&&posts===2&&rows.every(r=>r.status==='sent'),'multi-worker lease prevents duplicate sends');
 check(seen[0].location.lat===4&&seen[1].location.lat===5&&seen[1].data.municipio==='City 5','isolated record points and enrichment');
 check(seen[0].data.sector_barrio==='Manual barrio'&&seen[0].data.estrato==='3'&&seen[0].data.estrato_observado==='5','manual fields preserved and canonical auto fields enriched');
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'C'));await w.FIBRAZO_OFFLINE.submit(payload(w,'D',6));mode='lookup-fail';failedOnce=false;online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 rows=await records(w);check(rows.find(r=>r.clientSubmissionId==='C').status==='territorial_pending'&&rows.find(r=>r.clientSubmissionId==='C').nextAttemptAt>Date.now()&&rows.find(r=>r.clientSubmissionId==='D').status==='sent','weak signal schedules retry without blocking next record');
 mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});check((await records(w)).find(r=>r.clientSubmissionId==='C').status==='sent','retry completes pending record');
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'E'));mode='ack-loss';failedOnce=false;online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 check((await records(w)).find(r=>r.clientSubmissionId==='E').payload.photos.length===1,'lost acknowledgement retains photo evidence');mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});check([...writes.keys()].filter(x=>x==='E').length===1&&(await records(w)).find(r=>r.clientSubmissionId==='E').status==='sent','same submission ID reused after acknowledgement loss');
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'F'));mode='incomplete';online=true;const before=posts;await w.FIBRAZO_OFFLINE.syncAll({manual:true});check(posts===before&&(await records(w)).find(r=>r.clientSubmissionId==='F').status==='territorial_pending','incomplete territorial response never posts or reports completion');mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'G'));mode='hold';online=true;const task=w.FIBRAZO_OFFLINE.syncAll({manual:true});await waitFor(()=>gate);email='other@fibrazo.test';const count=posts;gate();await task;check(posts===count&&(await records(w)).find(r=>r.clientSubmissionId==='G').status==='territorial_pending','account switch cannot post previous owner data');email='fixture@fibrazo.test';mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 await w.FIBRAZO_OFFLINE.submit(payload(w,'A',8));check((await records(w)).find(r=>r.clientSubmissionId==='A').payload.location.lat===4,'existing submission ID cannot overwrite persisted record');
 const mod=w.FIBRAZO_BACKGROUND_TERRITORY;
 for(const location of [null,{lat:null,lng:1},{lat:91,lng:1},{lat:0,lng:0}])assert.throws(()=>mod.snapshot({formId:'EXPLORACION',location}));check(true,'invalid coordinate snapshots rejected');
 const changed=payload(w,'H');changed.location.lat=8;assert.throws(()=>mod.applyResult(changed,{ok:true,territorial:{},cityStatus:'DENTRO'}));check(true,'coordinate mismatch cannot be enriched');
 const qaResult={ok:true,territorial:{},cityStatus:'DENTRO',city:'Test',barrioStatus:'FUERA',barrio:'',estratoStatus:'SIN_CAPA',estrato:'',qaStratum:{canonical:false,status:'DENTRO',value:'2'}};
 let p=payload(w,'I');p.data.estrato='6';p.backgroundTerritory.manualFields.estrato=false;
 check(mod.applyResult(p,qaResult,w.FIBRAZO_QA_STRATUM_POLICY).data.estrato==='Sin información','real record cannot inherit noncanonical QA stratum');p.isTest=true;check(mod.applyResult(p,qaResult,w.FIBRAZO_QA_STRATUM_POLICY).data.estrato==='2','explicit QA record can use labelled provisional stratum');
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'J'));mode='master-pending';online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 const partial=(await records(w)).find(r=>r.clientSubmissionId==='J'),postCount=posts,writeCount=writes.size;
 await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 check(partial.status==='sent_master_pending'&&partial.payload.photos.length===1&&posts===postCount+1&&writes.size===writeCount,'partial receipt retains photos and retries original ID without adding a response');
 mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});check((await records(w)).find(r=>r.clientSubmissionId==='J').status==='sent'&&writes.size===writeCount,'confirmed territorial receipt clears local pending with no additional source record');
 online=false;await w.FIBRAZO_OFFLINE.submit(payload(w,'K'));mode='competition-pending';online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 const competition=(await records(w)).find(r=>r.clientSubmissionId==='K');
 check(competition.status==='sent_competition_pending'&&competition.nextAttemptAt>Date.now()&&(await w.FIBRAZO_OFFLINE.completion('K')).competitionPending,'received Forms job keeps a durable retry until competition confirms');
 mode='ok';await w.FIBRAZO_OFFLINE.syncAll({manual:true});
 check((await records(w)).find(r=>r.clientSubmissionId==='K').status==='sent'&&[...writes.keys()].filter(id=>id==='K').length===1,'competition retry reuses received ID without repeating the original response');
 const html=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../service-worker.js','utf8');
 check(html.indexOf('src="/background-territory.js?')<html.indexOf('src="/offline-v04.js?')&&html.includes('src="/background-territory.js?')&&sw.includes('"/background-territory.js"'),'production module loaded before queue and precached');
 console.log(results.join('\n'));console.log('ALL '+results.length+' TESTS PASS · mocked endpoints · real fake-indexeddb transactions');online=false;
})().catch(e=>{console.error(results.join('\n'));console.error(e.stack);process.exitCode=1;online=false;});
