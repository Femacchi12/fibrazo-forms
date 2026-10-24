// FO-CHG-105: recover a lost acknowledgement without uploading photographs again.
async function readReceipt({sheets,spreadsheetId,form,id,email}){
 if(!/^[A-Za-z0-9_-]{1,180}$/.test(id))throw Object.assign(Error('INVALID_RECEIPT_ID'),{status:400});
 const ids=await sheets.spreadsheets.values.get({spreadsheetId,range:form.sheet+'!B2:B',valueRenderOption:'UNFORMATTED_VALUE'});
 const index=(ids.data.values||[]).findLastIndex(r=>String(r[0]||'')===id);
 if(index<0)return {ok:true,found:false,id};
 const intel=form.id==='INTELIGENCIA_OPERADOR',churn=form.id==='CHURN',expl=!intel&&!churn;
 const rowNumber=index+2,last=expl?'CE':intel?'AJ':'AC';
 const result=await sheets.spreadsheets.values.get({spreadsheetId,range:form.sheet+'!A'+rowNumber+':'+last+rowNumber,valueRenderOption:'UNFORMATTED_VALUE'});
 const row=result.data.values?.[0];
 if(!row||String(row[1]||'')!==id)throw Object.assign(Error('RECEIPT_CHANGED_RETRY'),{status:503});
 if(String(row[intel?19:churn?25:24]||'').trim().toLowerCase()!==String(email||'').trim().toLowerCase())throw Object.assign(Error('RECEIPT_ACCESS_DENIED'),{status:403});
 let masterSync=null;
 if(expl){
  const status=String(row[29]||''),city=String(row[2]||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const error=[39,45,51,57].some(i=>String(row[i]||'').startsWith('ERROR'));
  const amb=['bucaramanga','floridablanca','giron','piedecuesta'].includes(city);
  const ok=!error&&(status==='OK'||status==='QA_ONLY'||(status==='GLOBAL_ONLY'&&!amb));
  masterSync={ok,scope:status==='GLOBAL_ONLY'?'GLOBAL_ONLY':'PROJECT',pointId:String(row[28]||''),reason:ok?'':'TERRITORIAL_RESOLUTION_PENDING'};
 }
 return {ok:true,found:true,id,duplicate:true,receiptRecovered:true,masterSync,competitionSync:churn?{ok:true,skipped:true}:{ok:false,reason:'COMPETITION_BATCH_PENDING',retryable:true}};
}
module.exports={readReceipt};
