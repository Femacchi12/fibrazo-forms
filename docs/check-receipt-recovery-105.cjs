const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{IDBFactory}=require('fake-indexeddb'),{readReceipt}=require('../api/_submission-receipt');
(async()=>{
 const raw=Array(83).fill('');Object.assign(raw,{1:'receipt-id',2:'Neiva',21:'photo1',22:'photo2',24:'owner@test',29:'GLOBAL_ONLY',31:'REGISTRADO_GLOBAL'});
 let calls=0;const sheets={spreadsheets:{values:{get:async a=>{calls++;return{data:{values:a.range.endsWith('B2:B')?[[raw[1]]]:[raw]}}}}}};
 const options={sheets,spreadsheetId:'fixture',form:{id:'EXPLORACION_PRESENCIAL',sheet:'RESP_EXPLORACION'},id:raw[1],email:'owner@test'};
 const received=await readReceipt(options);assert(received.found&&received.masterSync.ok);assert.equal(calls,2);assert(!JSON.stringify(received).includes('photo1'),'receipt never returns photo bytes or links');
 await assert.rejects(readReceipt({...options,email:'other@test'}),/ACCESS_DENIED/);raw[51]='ERROR_RESOLUCION';assert.equal((await readReceipt(options)).masterSync.ok,false);raw[51]='';raw[2]='Girón';assert.equal((await readReceipt(options)).masterSync.ok,false,'unresolved AMB remains pending');raw[2]='Neiva';await assert.rejects(readReceipt({...options,id:"bad!id"}),/INVALID_RECEIPT_ID/);
 let permitted=false;raw[2]='Neiva';const core={SHEET_ID:'fixture',gauth:()=>({}),verifyUser:async()=>({email:'owner@test'}),loadForms:async()=>[options.form],userCapabilities:async()=>({permissions:[],base:false,adminActive:false}),canUseDashboard:()=>true,permissionFor:()=>({}),canAccess:()=>permitted,httpError:(m,status)=>Object.assign(Error(m),{status})};
 const handlerContext=vm.createContext({module:{exports:{}},process:{env:{}},Buffer,console,require:n=>n==='./_core'?core:n==='googleapis'?{google:{sheets:()=>sheets}}:n.startsWith('./')?require('../api/'+n.slice(2)):require(n)});vm.runInContext(fs.readFileSync(__dirname+'/../api/submissions.js','utf8'),handlerContext);
 async function route(){const r={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this}};await handlerContext.module.exports({method:'GET',headers:{},query:{form:options.form.id,receipt:raw[1]}},r);return r;}
 const beforeDenied=calls;assert.equal((await route()).code,403);assert.equal(calls,beforeDenied,'form access checked before querying stored IDs');permitted=true;const actual=await route();assert.equal(actual.code,200);assert(actual.body.found&&actual.body.masterSync.ok);
 let online=false,mode='unknown',posts=0,gets=0,stored=false,partial=false;const w=new EventTarget();w.firebase={auth:()=>({currentUser:{email:'owner@test',getIdToken:async()=> 'fixture-token'},onAuthStateChanged(){}})};
 const reply=b=>({ok:true,status:200,json:async()=>b});
 const context=vm.createContext({window:w,document:{getElementById:()=>null,addEventListener(){}},navigator:{get onLine(){return online}},indexedDB:new IDBFactory(),crypto:require('crypto').webcrypto,Blob,AbortController,CustomEvent,Event,console,location:{protocol:'http:'},setTimeout:(f,n)=>{const t=setTimeout(f,n);t.unref();return t;},clearTimeout,setInterval:(f,n)=>{const t=setInterval(f,n);t.unref();return t;},clearInterval,fetch:async(url,opt)=>{
  if(url.startsWith('/api/submissions?')){gets++;if(mode==='unknown')throw Error('Network unavailable');return reply({ok:true,found:stored,id:new URL(url,'https://fixture').searchParams.get('receipt'),masterSync:{ok:!partial},competitionSync:{ok:false}});}
  if(url==='/api/competition-sync')return reply({ok:true});
  assert.equal(url,'/api/submissions');const p=JSON.parse(opt.body);posts++;
  if(mode==='unknown'){stored=true;throw Error('Lost ACK');}
  if(mode==='partial'&&!partial){stored=true;partial=true;throw Error('Lost ACK');}
  if(mode==='partial'){assert.equal(p.photos.length,0,'verified raw receipt repairs territory without uploading photographs');partial=false;return reply({ok:true,id:p.clientSubmissionId,masterSync:{ok:true}});}
  if(mode==='edit'){assert.equal(p.photos.length,1);return reply({ok:true,id:p.editId,masterSync:{ok:true}});}
  throw Error('Received source must not POST again');
 }});vm.runInContext(fs.readFileSync(__dirname+'/../offline-v04.js','utf8'),context);
 const payload=id=>({formId:'EXPLORACION_PRESENCIAL',clientSubmissionId:id,data:{sector_barrio:'Original'},location:{lat:2.9,lng:-75.2},photos:[{data:'original-photo'}]});
 await w.FIBRAZO_OFFLINE.submit(payload('first'));online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});let first=(await w.FIBRAZO_OFFLINE.list()).find(r=>r.clientSubmissionId==='first');assert.equal(first.status,'pending');assert.equal(first.payload.photos.length,1,'uncertain receipt preserves photos');
 mode='recover';await w.FIBRAZO_OFFLINE.syncAll({manual:true});first=(await w.FIBRAZO_OFFLINE.list()).find(r=>r.clientSubmissionId==='first');assert.equal(posts,1);assert.equal(first.status,'sent');assert.equal(first.payload.photos.length,0);assert.equal(first.payload.location.lat,2.9);
 online=false;mode='partial';partial=false;await w.FIBRAZO_OFFLINE.submit(payload('partial'));online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});let p=(await w.FIBRAZO_OFFLINE.list()).find(r=>r.clientSubmissionId==='partial');assert.equal(p.status,'sent_master_pending');assert.equal(p.payload.photos.length,1);await w.FIBRAZO_OFFLINE.syncAll({manual:true});assert.equal((await w.FIBRAZO_OFFLINE.list()).find(r=>r.clientSubmissionId==='partial').status,'sent');
 online=false;mode='edit';const edit={...payload('edit-operation'),formId:'INTELIGENCIA_OPERADOR',editId:'existing-id'};await w.FIBRAZO_OFFLINE.submit(edit);const before=gets;online=true;await w.FIBRAZO_OFFLINE.syncAll({manual:true});assert.equal(gets,before,'existing record is never proof of a queued edit');online=false;
 console.log('PASS105: small owner-bound receipt, uncertainty keeps originals, lost ACK recovers without repost/photo upload, partial receipt repairs without photo retransmission, edits remain separate');
})().catch(e=>{console.error(e);process.exitCode=1});
