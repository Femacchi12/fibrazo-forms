const crypto=require('crypto');
const KEY='FIBRAZO_SUBMISSION_V1',TTL=120000;
function metadataId(id){return 1000000000+(crypto.createHash('sha256').update(id).digest().readUInt32BE(0)%1000000000);}
async function acquire(sheets,spreadsheetId,id){
 const lease={metadataId:metadataId(id),metadataKey:KEY,metadataValue:JSON.stringify({id,owner:crypto.randomUUID(),expires:Date.now()+TTL}),location:{spreadsheet:true},visibility:'DOCUMENT'};
 const create=()=>sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{createDeveloperMetadata:{developerMetadata:lease}}]}});
 try{await create();return lease;}catch(error){
  let current;try{current=(await sheets.spreadsheets.developerMetadata.get({spreadsheetId,metadataId:lease.metadataId})).data;}catch(_){throw error;}
  let old;try{old=JSON.parse(current.metadataValue);}catch(_){throw Object.assign(Error('SUBMISSION_LOCK_INVALID'),{status:503});}
  if(current.metadataKey!==KEY||old.id!==id)throw Object.assign(Error('SUBMISSION_LOCK_CONFLICT'),{status:503});
  if(old.expires>Date.now())throw Object.assign(Error('SUBMISSION_BUSY_RETRY'),{status:503});
  await release(sheets,spreadsheetId,current);await create();return lease;
 }
}
async function release(sheets,spreadsheetId,lease){
 return sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:lease.metadataId,metadataKey:KEY,metadataValue:lease.metadataValue,visibility:'DOCUMENT'}}}}]}});
}
module.exports={acquire,release,metadataId};
