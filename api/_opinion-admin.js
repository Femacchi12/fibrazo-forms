// FO-CHG-149 — protected Focus Group management and manual session availability.
const {google}=require("googleapis");
const {gauth,verifyUser,isBaseAdmin,SHEET_ID,DEFAULT_DOMAIN}=require("./_core");
const TAB="RESP_ESTUDIO_OPINION_2026",CFG="CONFIG_ESTUDIO_OPINION_2026",NOTES_TAB="OBS_ESTUDIO_OPINION_2026";
const NOTE_HEADERS=["Creado el","ID inscripción","Autor","Observación"];
const CAMPAIGN="Focus Group · Estratos 2 y 3+",EVENT="2026-11-28/2026-11-29";
const OLD_SLOT="2026-11-28@14:00",REPLACEMENT_SLOT="2026-11-29@11:00";
const SLOTS=[
 {id:"2026-11-28@09:00",day:"Sábado 28",date:"2026-11-28",time:"09:00"},
 {id:"2026-11-29@09:00",day:"Domingo 29",date:"2026-11-29",time:"09:00"},
 {id:"2026-11-29@11:00",day:"Domingo 29",date:"2026-11-29",time:"11:00"},
 {id:"2026-11-29@14:00",day:"Domingo 29",date:"2026-11-29",time:"14:00"}
];
const STATUSES=["Preinscrito","Contactado a confirmar","Confirmado","No asistirá"];
const x=v=>String(v??"").trim();
const safe=v=>x(v).slice(0,120).replace(/^[=+@\-\t\r]/,"'");
async function ensure(){
 const s=google.sheets({version:"v4",auth:gauth()});
 const meta=await s.spreadsheets.get({spreadsheetId:SHEET_ID,fields:"sheets(properties(title,sheetId,gridProperties(columnCount)))"});
 let tabs=meta.data.sheets||[];
 const changes=[];
 if(!tabs.some(t=>t.properties.title===CFG))changes.push({addSheet:{properties:{title:CFG,gridProperties:{frozenRowCount:1}}}});
  if(!tabs.some(t=>t.properties.title===NOTES_TAB))changes.push({addSheet:{properties:{title:NOTES_TAB,gridProperties:{frozenRowCount:1}}}});
 const responses=tabs.find(t=>t.properties.title===TAB);
 if(!responses)throw Error("RESPONSES_TAB_NOT_FOUND");
 const columns=responses.properties.gridProperties.columnCount||26;
 if(columns<35)changes.push({appendDimension:{sheetId:responses.properties.sheetId,dimension:"COLUMNS",length:35-columns}});
 if(changes.length)await s.spreadsheets.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{requests:changes}});
 const [cfg,headers,noteHeaders,telecomHeader]=await Promise.all([
 s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+CFG+"'!A1:E5"}),
 s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!AC1:AH1"}),
  s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+NOTES_TAB+"'!A1:D1"}),
  s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!AI1"})
 ]);
 if(!(cfg.data.values||[]).length){
  await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+CFG+"'!A1:E5",valueInputOption:"RAW",requestBody:{values:[
   ["Sesión","Fecha","Horario","Abierto","Actualizado por"],
   ...SLOTS.map(q=>[q.id,q.date,q.time,"TRUE","Sistema"])
  ]}});
 }
 const expected=["Sesión asignada","Actualizado el","Actualizado por","Convocatoria","Sesiones disponibles","Número de cédula"];
 if(JSON.stringify(headers.data.values?.[0]||[])!==JSON.stringify(expected))await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!AC1:AH1",valueInputOption:"RAW",requestBody:{values:[expected]}});
  if(!(noteHeaders.data.values||[]).length)await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+NOTES_TAB+"'!A1:D1",valueInputOption:"RAW",requestBody:{values:[NOTE_HEADERS]}});
  if(x(telecomHeader.data.values?.[0]?.[0])!=="Vínculo laboral telecomunicaciones")await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!AI1",valueInputOption:"RAW",requestBody:{values:[["Vínculo laboral telecomunicaciones"]]}});
 return s;
}
async function states(s){
 const r=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+CFG+"'!A2:E5"});
 const rows=r.data.values||[];
 return SLOTS.map((slot,i)=>({...slot,open:x(rows[i]?.[3]??"TRUE").toUpperCase()!=="FALSE"}));
}
function prefs(row){
 const exact=x(row[32]).split(",").map(x).filter(y=>SLOTS.some(s=>s.id===y)||y===OLD_SLOT); // Preserve historical choices; do not convert them into availability for the replacement.
 if(exact.length)return [...new Set(exact)];
 const day=x(row[14]),t=x(row[27]);
 const days=day==="Ambos días"?["Sábado 28","Domingo 29"]:day?[day]:[];
 const times=t==="Cualquiera"?["09:00","11:00","14:00"]:t.split(",").map(x);
 return SLOTS.filter(slot=>days.includes(slot.day)&&times.includes(slot.time)).map(q=>q.id);
}
function record(row,index,adminAccess=false){
 const decision=x(row[10]),telecomFamily=x(row[34]);
 const qualified=["Decido","Compartimos"].includes(decision)&&telecomFamily==="No";
 const eligibilityReason=!["Decido","Compartimos"].includes(decision)?"No participa en las decisiones del hogar":telecomFamily==="Sí"?"Vínculo laboral con telecomunicaciones":telecomFamily!=="No"?"Pendiente de verificar vínculo con telecomunicaciones":"";
  return {row:index+2,id:x(row[1]),registered:x(row[0]),first:x(row[2]),last:x(row[3]),age:x(row[4]),phone:x(row[5]),email:adminAccess?x(row[6]):"",barrio:x(row[7]),address:adminAccess?x(row[8]):"",stratumBill:x(row[9]),decision,telecomFamily,eligibilityReason,eligible:qualified,internet:x(row[11]),operator:x(row[12]),otherOperator:x(row[13]),source:x(row[15]),consent:x(row[16]),geoLat:adminAccess?x(row[18]):"",geoLng:adminAccess?x(row[19]):"",geoAccuracy:adminAccess?x(row[20]):"",geoStatus:x(row[21]),geoAt:adminAccess?x(row[22]):"",stratum:x(row[25]||row[9]),income:adminAccess?x(row[26]):"",status:STATUSES.includes(x(row[17]))?x(row[17]):"Preinscrito",availability:prefs(row),assigned:x(row[28]),updated:x(row[29]),updatedBy:adminAccess?x(row[30]):"",campaign:x(row[31])||CAMPAIGN,cedula:adminAccess?x(row[33]):""};
}
async function notes(s){
 const r=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+NOTES_TAB+"'!A2:D3000",valueRenderOption:"UNFORMATTED_VALUE"});
 const byId=new Map();
 for(const row of r.data.values||[]){
  const id=x(row[1]);if(!id.startsWith("EO-"))continue;
  const entry={at:x(row[0]),author:x(row[2]),text:x(row[3])};
  if(!entry.text)continue;
  if(!byId.has(id))byId.set(id,[]);
  byId.get(id).push(entry);
 }
 return byId;
}
async function records(s,adminAccess=false){
 const r=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!A2:AI3000",valueRenderOption:"UNFORMATTED_VALUE"});
 return (r.data.values||[]).map((v,i)=>record(v,i,adminAccess)).filter(r=>r.id.startsWith("EO-"));
}
function summaryData(rs,slots){
 const visible=rs.map(r=>({...r,availability:[...r.availability]}));
 return {campaigns:[{id:"ESTUDIO_OPINION_2026",name:CAMPAIGN,dates:EVENT}],campaign:"ESTUDIO_OPINION_2026",statusOptions:STATUSES,slots:slots.map(slot=>{
  const available=visible.filter(r=>r.eligible&&r.status!=="No asistirá"&&r.availability.includes(slot.id));
  const assigned=visible.filter(r=>r.eligible&&r.status!=="No asistirá"&&r.assigned===slot.id);
  const confirmed=assigned.filter(r=>r.status==="Confirmado");
  return {...slot,available:available.length,assigned:assigned.length,confirmed:confirmed.length,contacted:assigned.filter(r=>r.status==="Contactado a confirmar").length,pending:assigned.filter(r=>r.status==="Preinscrito").length,notAttending:visible.filter(r=>r.eligible&&r.assigned===slot.id&&r.status==="No asistirá").length};
 }),rows:visible,total:visible.filter(r=>r.eligible).length,ineligible:visible.filter(r=>!r.eligible).length};
}
function suggest(rs,slots){
 // Rebalance across all four sessions while keeping confirmed assignments fixed.
 // Never overwrite anything: caller must inspect and explicitly approve suggestions.
 const active=rs.filter(r=>r.eligible&&r.status!=="No asistirá");
 const buckets=Object.fromEntries(SLOTS.map(s=>[s.id,[]]));
 const fixed=new Set();
 for(const r of active.filter(r=>r.status==="Confirmado"&&r.assigned&&buckets[r.assigned])){
  buckets[r.assigned].push(r);fixed.add(r.id);
 }
 const movable=active.filter(r=>!fixed.has(r.id)).sort((a,b)=>
   a.availability.length-b.availability.length || Number(!!b.assigned)-Number(!!a.assigned) || a.registered.localeCompare(b.registered));
 const assignedById=new Map();
 function place(r,visited=new Set()){
  const choices=r.availability.filter(id=>buckets[id]&&!visited.has(id)).sort((a,b)=>
    buckets[a].length-buckets[b].length || Number(b===r.assigned)-Number(a===r.assigned) || a.localeCompare(b));
  for(const key of choices){
   visited.add(key);
   if(buckets[key].length<12){buckets[key].push(r);assignedById.set(r.id,key);return true;}
   // Shift someone who has another available session before rejecting this candidate.
   for(const current of buckets[key].filter(person=>!fixed.has(person.id)&&person.id!==r.id)){
    const others=current.availability.filter(k=>k!==key&&!visited.has(k)&&buckets[k]);
    for(const alt of others){
     if(buckets[alt].length<12){
      buckets[key]=buckets[key].filter(person=>person.id!==current.id);
      buckets[alt].push(current);assignedById.set(current.id,alt);
      buckets[key].push(r);assignedById.set(r.id,key);return true;
     }
    }
   }
  }
  return false;
 }
 for(const r of movable)place(r);
 const proposed=movable.filter(r=>assignedById.has(r.id)&&r.assigned!==assignedById.get(r.id))
  .map(r=>({id:r.id,previous:r.assigned,assigned:assignedById.get(r.id),name:(r.first+" "+r.last).trim()}));
 const remaining=Object.fromEntries(SLOTS.map(s=>[s.id,buckets[s.id].length]));
 return {proposed,remaining,oversubscribed:SLOTS.filter(s=>buckets[s.id].length>12).map(s=>s.id)};
}
async function auth(req,edit=false){
 const actor=await verifyUser(req);
 const email=x(actor.email).toLowerCase();
 const admin=isBaseAdmin(email);
 if(!admin&&!email.endsWith(DEFAULT_DOMAIN))return {error:403};
 if(edit&&!admin)return {error:403};
 return {email,admin};
}
async function handle(req,res){
 try{
  const actor=await auth(req,req.method!=="GET");
  if(actor.error)return res.status(actor.error).json({error:"Acceso no autorizado"});
  const s=await ensure();
  if(req.method==="GET"){
   const [all,slots,noteMap]=await Promise.all([records(s,actor.admin),states(s),actor.admin?notes(s):Promise.resolve(null)]);
   if(noteMap)for(const row of all)row.notes=noteMap.get(row.id)||[];
   const data=summaryData(all,slots);
   return res.status(200).json({...data,canEdit:actor.admin,suggestions:suggest(all,slots)});
  }
  if(req.method!=="POST")return res.status(405).json({error:"Método no permitido"});
  const payload=req.body||{},action=x(payload.action);
  if(action==="setSlot"){
   const idx=SLOTS.findIndex(o=>o.id===payload.slot);
   if(idx<0||typeof payload.open!=="boolean")return res.status(400).json({error:"Sesión o estado inválido"});
   await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+CFG+"'!D"+(idx+2)+":E"+(idx+2),valueInputOption:"RAW",requestBody:{values:[[payload.open?"TRUE":"FALSE",actor.email]]}});
   return res.status(200).json({ok:true});
  }
  const all=await records(s,true),byId=new Map(all.map(r=>[r.id,r]));
   if(action==="addObservation"){
    const row=byId.get(x(payload.id));
    if(!row)return res.status(404).json({error:"Inscripción no encontrada"});
    if(typeof payload.text!=="string")return res.status(400).json({error:"Escribe una observación válida"});
    const note=payload.text.trim();
    if(!note||note.length>1500||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(note))return res.status(400).json({error:"La observación debe contener entre 1 y 1500 caracteres"});
    // Validate the current row identity to prevent editing another participant after a reorder.
    const now=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!B"+row.row});
    if(x(now.data.values?.[0]?.[0])!==row.id)return res.status(409).json({error:"La inscripción cambió de posición. Actualiza el tablero e intenta nuevamente."});
    const at=new Date().toISOString();
    await s.spreadsheets.values.append({spreadsheetId:SHEET_ID,range:"'"+NOTES_TAB+"'!A:D",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",requestBody:{values:[[at,row.id,actor.email,note]]}});
    return res.status(200).json({ok:true,at,author:actor.email});
   }
  if(action==="update"){
   const r=byId.get(x(payload.id));
   if(!r)return res.status(404).json({error:"Inscripción no encontrada"});
   const status=x(payload.status),assigned=x(payload.assigned);
   if(!STATUSES.includes(status)||assigned&&!SLOTS.some(z=>z.id===assigned)&&!(assigned===OLD_SLOT&&r.assigned===OLD_SLOT))return res.status(400).json({error:"Estado o sesión inválidos"});
   if(!r.eligible)return res.status(409).json({error:"No elegible: "+(r.eligibilityReason||"no cumple los requisitos de selección")+". No se puede asignar ni confirmar."});
    const confirmedLegacyMove=assigned===REPLACEMENT_SLOT&&r.availability.includes(OLD_SLOT)&&payload.confirmLegacyMove===true;
    if(assigned&&!r.availability.includes(assigned)&&!confirmedLegacyMove)return res.status(400).json({error:"Esta persona no indicó disponibilidad en esa sesión; confirma el cambio de horario con la persona antes de reubicarla."});
   if(status==="Confirmado"&&!assigned)return res.status(400).json({error:"Asigná una sesión antes de confirmar"});
   await s.spreadsheets.values.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{valueInputOption:"RAW",data:[
    {range:"'"+TAB+"'!R"+r.row,values:[[status]]},
    {range:"'"+TAB+"'!AC"+r.row+":AE"+r.row,values:[[assigned,new Date().toISOString(),actor.email]]}
   ]}});
   return res.status(200).json({ok:true});
  }
  if(action==="applySuggestions"){
   const preview=suggest(all,await states(s));
   const bySuggestion=new Map(preview.proposed.map(a=>[a.id,a.assigned]));
   const requested=Array.isArray(payload.assignments)?payload.assignments:[];
   if(requested.length>100||requested.some(a=>!bySuggestion.has(x(a.id))||bySuggestion.get(x(a.id))!==x(a.assigned)))return res.status(409).json({error:"La propuesta cambió. Actualizá el resumen"});
   if(!requested.length)return res.status(400).json({error:"Sin asignaciones para aplicar"});
   const data=requested.map(a=>{const r=byId.get(x(a.id));return {range:"'"+TAB+"'!AC"+r.row+":AE"+r.row,values:[[a.assigned,new Date().toISOString(),actor.email]]};});
   await s.spreadsheets.values.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{valueInputOption:"RAW",data}});
   return res.status(200).json({ok:true,updated:data.length});
  }
  return res.status(400).json({error:"Acción no reconocida"});
 }catch(e){console.error("OPINION_ADMIN",e?.message);return res.status(e.status||500).json({error:e.status===401?"Iniciá sesión nuevamente":"No se pudo completar la operación"});}
}
async function availability(){
 const s=await ensure();
 const slots=await states(s);
 return slots;
}
module.exports={SLOTS,STATUSES,CAMPAIGN,ensure,availability,handle,prefs};
