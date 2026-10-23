const assert=require('assert/strict');const {acquire,release}=require('../api/_submission-lease');let meta=new Map();
const sheets={spreadsheets:{developerMetadata:{get:async({metadataId})=>{if(!meta.has(metadataId))throw Error('notfound');return{data:{...meta.get(metadataId)}};}},batchUpdate:async({requestBody:{requests}})=>{for(const r of requests){if(r.createDeveloperMetadata){const m=r.createDeveloperMetadata.developerMetadata;if(meta.has(m.metadataId))throw Error('ID exists');meta.set(m.metadataId,{...m});}if(r.deleteDeveloperMetadata){const q=r.deleteDeveloperMetadata.dataFilter.developerMetadataLookup,m=meta.get(q.metadataId);if(m?.metadataValue===q.metadataValue&&m?.metadataKey===q.metadataKey)meta.delete(q.metadataId);}}return{data:{}};}}};
(async()=>{
 let appended=0;async function receive(){const l=await acquire(sheets,'fixture','FORM:ID');try{const existed=appended>0;await new Promise(r=>setTimeout(r,10));if(!existed)appended++;}finally{await release(sheets,'fixture',l);}}
 const both=await Promise.allSettled([receive(),receive()]);assert.equal(appended,1);assert.equal(both.filter(r=>r.status==='fulfilled').length,1);assert.equal(both.find(r=>r.status==='rejected').reason.status,503);
 await receive();assert.equal(appended,1);assert.equal(meta.size,0);
 const a=await acquire(sheets,'fixture','FORM:ID'),b=await acquire(sheets,'fixture','FORM:OTHER');assert.equal(meta.size,2);assert.notEqual(a.metadataId,b.metadataId);
 meta.get(a.metadataId).metadataValue=JSON.stringify({id:'FORM:ID',owner:'dead',expires:1});const fresh=await acquire(sheets,'fixture','FORM:ID');await release(sheets,'fixture',a);assert(meta.has(fresh.metadataId));await release(sheets,'fixture',fresh);await release(sheets,'fixture',b);assert.equal(meta.size,0);
 console.log('PASS simultaneous same-ID submissions: one receiver, retry503, later retry no append; distinct IDs independent; expired/stale cleanup protected');
})().catch(e=>{console.error(e);process.exitCode=1});
