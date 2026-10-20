const {google}=require('googleapis');
const crypto=require('crypto');
const {buildPlan}=require('./_competition-plan');
const COMPETITION_SHEET_ID=process.env.COMPETITION_SHEET_ID||'1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU';
const LOCK_ID=2082082,LOCK_KEY='FIBRAZO_FORMS_COMPETITION_V1';
const widths={'01_OPERADORES':32,'03_PRESENCIA':26,'04_RELEVAMIENTOS':19,'05_EVIDENCIAS':15,'20_CARGA_PROYECTOS_CIUDAD':18,'08_CONTROL_CALIDAD':15};
async function acquire(sheets,id){
 const token=JSON.stringify({owner:crypto.randomUUID(),expires:Date.now()+180000});
 const create=()=>sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{createDeveloperMetadata:{developerMetadata:{metadataId:LOCK_ID,metadataKey:LOCK_KEY,metadataValue:token,location:{spreadsheet:true},visibility:'DOCUMENT'}}}]}});
 try{await create();return token;}catch(error){
  let current;try{current=(await sheets.spreadsheets.developerMetadata.get({spreadsheetId:id,metadataId:LOCK_ID})).data;}catch(_){throw error;}
  if(current.metadataKey!==LOCK_KEY)throw Error('COMPETITION_LOCK_ID_CONFLICT');
  let old;try{old=JSON.parse(current.metadataValue);}catch(_){throw Error('COMPETITION_LOCK_INVALID');}
  if(old.expires>Date.now())throw Error('COMPETITION_BUSY_RETRY');
  await release(sheets,id,current.metadataValue);await create();return token;
 }
}
async function release(sheets,id,token){return sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:LOCK_ID,metadataValue:token,visibility:'DOCUMENT'}}}}]}});}
function writeRequests(plan,metadata){
 const requests=[];
 for(const [name,rows] of Object.entries(plan.changes)){
  if(!rows.length)continue;
  const p=metadata.sheets.find(s=>s.properties.title===name)?.properties;
  if(!p)throw Error('COMPETITION_SCHEMA_MISSING_'+name);
  const required=Math.max(...rows.map(r=>r.row));if(required>p.gridProperties.rowCount)requests.push({appendDimension:{sheetId:p.sheetId,dimension:'ROWS',length:required-p.gridProperties.rowCount+100}});
  const ordered=[...rows].sort((a,b)=>a.row-b.row),groups=[];
  for(const r of ordered){const last=groups.at(-1);if(last&&last.at(-1).row+1===r.row)last.push(r);else groups.push([r]);}
  for(const group of groups){
   const first=group[0].row,last=group.at(-1).row,startNew=Math.max(first,(plan.originalLengths?.[name]||0)+1,3);
   if(startNew<=last){
    const source={sheetId:p.sheetId,startRowIndex:1,endRowIndex:2,startColumnIndex:0,endColumnIndex:widths[name]},destination={sheetId:p.sheetId,startRowIndex:startNew-1,endRowIndex:last,startColumnIndex:0,endColumnIndex:widths[name]};
    requests.push({copyPaste:{source,destination,pasteType:'PASTE_FORMAT'}});
    requests.push({copyPaste:{source,destination,pasteType:'PASTE_DATA_VALIDATION'}});
   }
   requests.push({updateCells:{range:{sheetId:p.sheetId,startRowIndex:first-1,endRowIndex:last,startColumnIndex:0,endColumnIndex:widths[name]},rows:group.map(r=>({values:Array.from({length:widths[name]},(_,i)=>{const v=r.values[i]??'';return{userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v)}};})})),fields:'userEnteredValue'}});
  }
 }
 return requests;
}
async function syncCompetition(auth,{sourceId,dryRun=false}={}){
 if(!sourceId)throw Error('FORMS_SOURCE_REQUIRED');
 const sheets=google.sheets({version:'v4',auth});let token;
 try{
  token=await acquire(sheets,COMPETITION_SHEET_ID);
  const [meta,sourceMeta]=await Promise.all([sheets.spreadsheets.get({spreadsheetId:COMPETITION_SHEET_ID,fields:'sheets(properties)'}),sheets.spreadsheets.get({spreadsheetId:sourceId,fields:'sheets(properties)'})]);
  const bound=(m,n,last)=>{const p=m.data.sheets.find(s=>s.properties.title===n)?.properties;if(!p)throw Error('COMPETITION_SCHEMA_MISSING_'+n);return n+'!A1:'+last+p.gridProperties.rowCount;};
  const readNames=[...Object.keys(widths),'26_BUC_EQUIVALENCIAS'];
  const [source,target]=await Promise.all([
   sheets.spreadsheets.values.batchGet({spreadsheetId:sourceId,ranges:[bound(sourceMeta,'RESP_EXPLORACION','CE'),bound(sourceMeta,'RESP_INTELIGENCIA_OPERADOR','AF')],valueRenderOption:'UNFORMATTED_VALUE'}),
   sheets.spreadsheets.values.batchGet({spreadsheetId:COMPETITION_SHEET_ID,ranges:readNames.map(n=>bound(meta,n,({32:'AF',26:'Z',19:'S',15:'O',18:'R'})[widths[n]]||'F')),valueRenderOption:'UNFORMATTED_VALUE'}),
  ]);
  const base=Object.fromEntries(readNames.map((n,i)=>[n,target.data.valueRanges[i].values||[]]));
  const plan=buildPlan({expl:source.data.valueRanges[0].values||[],intel:source.data.valueRanges[1].values||[],base,sourceId});plan.originalLengths=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,v.length]));
  const requests=writeRequests(plan,meta.data);
  // Fail closed if the lease was replaced; never write using a stale table snapshot.
  const held=(await sheets.spreadsheets.developerMetadata.get({spreadsheetId:COMPETITION_SHEET_ID,metadataId:LOCK_ID})).data;
  if(held.metadataValue!==token||JSON.parse(token).expires<Date.now())throw Error('COMPETITION_LEASE_LOST');
  if(!dryRun&&requests.length)await sheets.spreadsheets.batchUpdate({spreadsheetId:COMPETITION_SHEET_ID,requestBody:{requests}});
  const {ids,noGps,...summary}=plan.stats;
  return{ok:true,dryRun,changedRows:Object.values(plan.changes).reduce((n,a)=>n+a.length,0),...summary,pendingCoordinates:noGps.length,checkedAt:new Date().toISOString()};
 }finally{if(token)await release(sheets,COMPETITION_SHEET_ID,token).catch(e=>console.error('COMPETITION_UNLOCK_PENDING',e.code||'ERROR'));}
}
async function trySyncCompetition(auth,options){try{return await syncCompetition(auth,options);}catch(e){console.error('COMPETITION_SYNC_PENDING',e.message);return{ok:false,reason:String(e.message||'COMPETITION_SYNC_FAILED').slice(0,160),retryable:true};}}
module.exports={syncCompetition,trySyncCompetition,writeRequests,acquire,release,widths,COMPETITION_SHEET_ID};
