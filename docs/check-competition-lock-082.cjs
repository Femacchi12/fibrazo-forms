const assert=require('node:assert/strict');
const {acquire,release,writeRequests}=require('../api/_competition-sync');
let metadata=null;
const sheets={spreadsheets:{developerMetadata:{get:async()=>{if(!metadata)throw Object.assign(Error('not found'),{code:404});return{data:{...metadata}};}},batchUpdate:async({requestBody:{requests}})=>{for(const r of requests){if(r.createDeveloperMetadata){if(metadata)throw Object.assign(Error('metadata ID in use'),{code:400});metadata=r.createDeveloperMetadata.developerMetadata;}if(r.deleteDeveloperMetadata){const q=r.deleteDeveloperMetadata.dataFilter.developerMetadataLookup;if(metadata?.metadataValue===q.metadataValue)metadata=null;}}return{data:{}};}}};
(async()=>{
 const both=await Promise.allSettled([acquire(sheets,'fixture'),acquire(sheets,'fixture')]);assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
 const first=both.find(x=>x.status==='fulfilled').value;
 await release(sheets,'fixture','stale-owner');assert.ok(metadata,'stale cleanup cannot release a newer owner');
 metadata.metadataValue=JSON.stringify({owner:'expired',expires:1});const fresh=await acquire(sheets,'fixture');assert.notEqual(fresh,first);
 await release(sheets,'fixture',first);assert.ok(metadata,'old owner cannot delete replacement lease');await release(sheets,'fixture',fresh);assert.equal(metadata,null);
 const meta={sheets:[{properties:{title:'01_OPERADORES',sheetId:1,gridProperties:{rowCount:2}}}]};
 const requests=writeRequests({originalLengths:{'01_OPERADORES':2},changes:{'01_OPERADORES':[{row:3,values:['new','Name']},{row:4,values:['new2','Other']}] }},meta);
 assert.ok(requests[0].appendDimension);const update=requests.find(x=>x.updateCells).updateCells;assert.equal(update.rows.length,2);assert.equal(update.range.endRowIndex-update.range.startRowIndex,2);
 assert.ok(requests.some(x=>x.copyPaste?.pasteType==='PASTE_FORMAT'));assert.ok(requests.some(x=>x.copyPaste?.pasteType==='PASTE_DATA_VALIDATION'));
 assert.ok(!requests.some(x=>x.copyPaste?.pasteType==='PASTE_NORMAL'),'never clone exemplar identities or links');
 console.log('FO-CHG-082 distributed lease / expiration / conditional cleanup / bounded atomic writes PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
