// Retry territorial audit only for an already received GLOBAL_ONLY response.
// All coordinates and source identifiers come from the stored row.
async function repairTerritorialReceipt({sheets,auth,spreadsheetId,form,id,email,resolveTerritorial,auditRow}){
  const result=await sheets.spreadsheets.values.get({spreadsheetId,range:form.sheet+'!A2:CE',valueRenderOption:'UNFORMATTED_VALUE'});
  const rows=result.data.values||[],index=rows.findIndex(r=>String(r[1]||'')===id),row=rows[index];
  if(!row||String(row[24]||'').trim().toLowerCase()!==String(email||'').trim().toLowerCase())return {pending:true,reason:'RECEIPT_OWNER_MISMATCH'};
  const pending=[39,45,51,57].some(i=>row[i]==='ERROR_RESOLUCION');
  if(!pending)return {pending:false};
  if(row[29]!=='GLOBAL_ONLY'||/^(sí|si|true|1)$/i.test(String(row[82]||'')))return {pending:true,reason:'TERRITORIAL_REVIEW_REQUIRED'};
  const lat=row[17],lng=row[18];
  if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0))return {pending:true,reason:'VALID_COORDINATE_REQUIRED'};
  const t=await resolveTerritorial(auth,lat,lng,{cityHint:String(row[2]||'')});
  if(!t||[t.city,t.barrio,t.estrato,t.troncal].some(l=>!l||String(l.status||'').startsWith('ERROR')))return {pending:true,reason:'TERRITORIAL_RESOLUTION_PENDING'};
  // Update only derived audit columns; observed barrio, strata, GPS and photos stay intact.
  const values=[row[32]||'Sin información',String(t.estrato.status||''),t.estrato.distanceM==null?'':Math.round(Number(t.estrato.distanceM)),String(t.estrato.source||''),...auditRow(t)];
  await sheets.spreadsheets.values.update({spreadsheetId,range:form.sheet+'!AG'+(index+2)+':BK'+(index+2),valueInputOption:'RAW',requestBody:{values:[values]}});
  return {pending:false,repaired:true};
}
module.exports={repairTerritorialReceipt};
