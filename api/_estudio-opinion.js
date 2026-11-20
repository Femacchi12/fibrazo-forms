const {google}=require("googleapis");
const management=require("./_opinion-admin");
const {gauth,verifyUser,isBaseAdmin,SHEET_ID,checkPublicRate,logSecurity}=require("./_core");
const TAB="RESP_ESTUDIO_OPINION_2026";
const HEADERS=["Fecha","ID","Nombre","Apellido","Edad","Teléfono","Email","Barrio","Dirección","Estrato factura energía","Rol decisor","Internet hogar","Operador","Otro operador","Disponibilidad","Fuente","Aceptación privacidad","Estado","GPS latitud","GPS longitud","GPS precisión m","GPS estado","GPS fecha"];
const str=(v,max=120)=>String(v??"").trim().slice(0,max).replace(/^[=+@\-\t\r]/,"'"); // neutraliza fórmulas en Sheets
const cell=(v,max)=>str(v,max);
const phone=v=>{const t=String(v||"").replace(/[\s().-]/g,"");return t.startsWith("+57")?t.slice(3):t.startsWith("57")&&t.length===12?t.slice(2):t;};
const validMail=v=>!v||(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=180);
let setupPromise=null;
async function ensureTab(auth){
 const s=google.sheets({version:"v4",auth});
 if(!setupPromise)setupPromise=(async()=>{
  const meta=await s.spreadsheets.get({spreadsheetId:SHEET_ID,fields:"sheets(properties(title))"});
  if(!(meta.data.sheets||[]).some(x=>x.properties?.title===TAB)){
   try{await s.spreadsheets.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{requests:[{addSheet:{properties:{title:TAB,gridProperties:{frozenRowCount:1}}}}]}});}catch(e){if(!/already exists|duplicate/i.test(e.message||""))throw e;}
  }
  // Sheets are created with 26 columns by default; the study now extends to AB (28).
  const sheetMeta=await s.spreadsheets.get({spreadsheetId:SHEET_ID,fields:"sheets(properties(title,sheetId,gridProperties(columnCount)))"});
  const currentSheet=(sheetMeta.data.sheets||[]).find(x=>x.properties?.title===TAB);
  if(!currentSheet)throw new Error("OPINION_SHEET_NOT_FOUND");
  const columns=currentSheet.properties?.gridProperties?.columnCount||26;
  if(columns<28)await s.spreadsheets.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{requests:[{appendDimension:{sheetId:currentSheet.properties.sheetId,dimension:"COLUMNS",length:28-columns}}]}});
  const first=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!A1:W1"});
  if(!first.data.values?.length)await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!A1:W1",valueInputOption:"RAW",requestBody:{values:[HEADERS]}});
  // Preserve Y1:Y2 for PUBLIC_ENABLED. New survey fields in Z, AA and AB.
  await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!Z1:AB1",valueInputOption:"RAW",requestBody:{values:[["Estrato declarado de vivienda","Tipo de ingresos (opcional)","Horarios disponibles 28-29/11/2026"]]}});
 })().catch(e=>{setupPromise=null;throw e;});
 await setupPromise;return s;
}
const POLICY_RANGE="'"+TAB+"'!Y1:Y2";
async function readPublication(auth){
 await ensureTab(auth); // First public visit creates its isolated responses sheet.
 const sheets=google.sheets({version:"v4",auth});
 const response=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:POLICY_RANGE});
 const rows=response.data.values||[];
 // First release is public until an administrator explicitly closes the invitation.
 return String(rows[1]?.[0]??"TRUE").trim().toUpperCase()!=="FALSE";
}
async function writePublication(auth,enabled){
 const sheets=await ensureTab(auth);
 await sheets.spreadsheets.values.update({
  spreadsheetId:SHEET_ID,range:POLICY_RANGE,valueInputOption:"RAW",
  requestBody:{values:[["PUBLIC_ENABLED"],[enabled?"TRUE":"FALSE"]]}
 });
 return enabled;
}
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 try{
  if(!SHEET_ID)throw new Error("STORAGE_NOT_CONFIGURED");
  if(req.query?.summary==="1")return management.handle(req,res);
  if(req.method==="GET"&&req.query?.config==="1"){
   const [enabled,slots]=await Promise.all([readPublication(gauth()),management.availability()]);
   return res.status(200).json({publicEnabled:enabled,form:"ESTUDIO_OPINION_2026",slots});
  }
  if(req.method==="POST"&&req.query?.manage==="1"){
   const actor=await verifyUser(req);
   if(!isBaseAdmin(actor.email))return res.status(403).json({error:"No autorizado"});
   if(typeof req.body?.publicEnabled!=="boolean")return res.status(400).json({error:"Estado de publicación inválido"});
   const enabled=await writePublication(gauth(),req.body.publicEnabled);
   return res.status(200).json({ok:true,publicEnabled:enabled});
  }
  if(req.method==="GET"&&req.query?.status==="1")return res.status(200).json({ready:true,form:"estudio-opinion-2026"});
  if(req.method==="GET"){
   const actor=await verifyUser(req);
   if(!isBaseAdmin(actor.email))return res.status(403).json({error:"No autorizado"});
   const s=await ensureTab(gauth());
   const r=await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"'"+TAB+"'!A1:AB2000"});
   return res.status(200).json({headers:[...HEADERS,"","PUBLIC_ENABLED","Estrato declarado de vivienda","Tipo de ingresos (opcional)","Horarios disponibles 28-29/11/2026"],rows:(r.data.values||[]).slice(1),sheetId:SHEET_ID});
  }
  if(req.method!=="POST")return res.status(405).json({error:"Método no permitido"});
  if(!String(req.headers["content-type"]||"").includes("application/json"))return res.status(415).json({error:"Formato no permitido"});
  // Check server-side on EVERY submission: hiding the public UI alone is insufficient.
  if(!(await readPublication(gauth())))return res.status(403).json({error:"La convocatoria está cerrada y no admite nuevas inscripciones."});
  const p=req.body||{},d=p.data||{};
  if(p.website)return res.status(400).json({error:"Solicitud inválida"});
  if(!Number(p.startedAt)||Date.now()-Number(p.startedAt)<2500||Date.now()-Number(p.startedAt)>7200000)return res.status(400).json({error:"Tiempo de formulario inválido"});
  const t=phone(d.telefono),tc=phone(d.telefonoConfirmacion);
  if(!/^3\d{9}$/.test(t)||t!==tc)return res.status(400).json({error:"Revisá el número de celular y su confirmación"});
  if(!d.nombre||!d.apellido||!d.barrio||!d.direccion)return res.status(400).json({error:"Completá los datos obligatorios"});
  if(d.nombre.length>100||d.apellido.length>100||d.barrio.length>120||d.direccion.length>200)return res.status(400).json({error:"Revisá la longitud de los datos"});
  if(!Number.isInteger(Number(d.edad))||Number(d.edad)<30||Number(d.edad)>55)return res.status(400).json({error:"Esta convocatoria está dirigida a personas entre 30 y 55 años"});
  if(!["2","3","4","5","6"].includes(String(d.estrato)))return res.status(400).json({error:"Seleccioná el estrato de la factura de Afinia entre 2 y 6"});
  if(!["2","3","4","5","6"].includes(String(d.estratoVivienda)))return res.status(400).json({error:"Seleccioná el estrato de tu vivienda entre 2 y 6"});
  if(!["Fijos","Variables","Mixtos","Prefiero no responder"].includes(d.tipoIngresos))return res.status(400).json({error:"Elegí tu tipo de ingresos o «Prefiero no responder»"});
  if(!["Decido","Compartimos"].includes(d.decision))return res.status(400).json({error:"Se requiere decidir o compartir las decisiones del hogar"});
  if(!["Claro","Tigo","Movistar","Otro operador","Proveedor local","No tengo internet fijo"].includes(d.operador))return res.status(400).json({error:"Seleccioná el servicio de internet"});
  const slots=await management.availability();
  const openIds=slots.filter(slot=>slot.open).map(slot=>slot.id);
  const submitted=Array.isArray(d.sesionesDisponibles)?d.sesionesDisponibles:[];
  const chosen=[...new Set(submitted.map(String))];
  if(!chosen.length||chosen.length>4||chosen.some(id=>!openIds.includes(id)))return res.status(409).json({error:"Los días u horarios seleccionados ya no están disponibles. Actualizá el formulario."});
  const dates=[...new Set(chosen.map(v=>v.slice(0,10)))];
  const availability=dates.length===2?"Ambos días":dates[0]==="2026-11-28"?"Sábado 28":"Domingo 29";
  const selectedSlots=[...new Set(chosen.map(v=>v.slice(-5)))].sort().join(", ");
  if(!validMail(String(d.email||"").trim()))return res.status(400).json({error:"Correo electrónico inválido"});
  if(d.consentimiento!==true)return res.status(400).json({error:"Se requiere autorización de tratamiento de datos"});
  const auth=gauth();const hash=await checkPublicRate(auth,{id:"ESTUDIO_OPINION_2026",rateLimit:5},req);
  const s=await management.ensure(),id="EO-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
  const g=d.geo||{};const lat=Number(g.lat),lng=Number(g.lng),accuracy=Number(g.accuracy);const geoValid=g.status==="autorizado"&&Number.isFinite(lat)&&lat>=-90&&lat<=90&&Number.isFinite(lng)&&lng>=-180&&lng<=180&&Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=100000;const geoStatus=geoValid?"Autorizado":g.status==="rechazado"?"Rechazado":g.status==="error"?"No disponible":"No solicitado";const row=[new Date().toISOString(),id,cell(d.nombre,100),cell(d.apellido,100),Number(d.edad),"+57"+t,cell(d.email,180),cell(d.barrio,120),cell(d.direccion,200),d.estrato,d.decision,d.operador==="No tengo internet fijo"?"No":"Sí",d.operador,cell(d.otroOperador,120),availability,cell(d.fuente,80),"SI","Preinscrito",geoValid?lat:"",geoValid?lng:"",geoValid?Math.round(accuracy):"",geoStatus,geoValid?cell(g.capturedAt,40):"","","",String(d.estratoVivienda),cell(d.tipoIngresos,20),selectedSlots,"","","",management.CAMPAIGN,chosen.join(",")];
  // Sheets values.append inferred the first data column as Z because Y2 stores publication settings.
  // appendCells atomically creates a full new row starting in column A, preserving the Y2 flag.
  const sheetMeta=await s.spreadsheets.get({spreadsheetId:SHEET_ID,fields:"sheets(properties(title,sheetId))"});
  const responseSheet=sheetMeta.data.sheets?.find(x=>x.properties?.title===TAB);
  if(!responseSheet)throw new Error("RESPONSE_SHEET_NOT_FOUND");
  await s.spreadsheets.batchUpdate({spreadsheetId:SHEET_ID,requestBody:{requests:[{appendCells:{
   sheetId:responseSheet.properties.sheetId,
   rows:[{values:row.map(value=>({userEnteredValue:typeof value==="number"?{numberValue:value}:{stringValue:String(value??"")}}))}],
   fields:"userEnteredValue"
  }}]}});
  await logSecurity(auth,{formId:"ESTUDIO_OPINION_2026",ipHash:hash,req}).catch(()=>{});
  return res.status(201).json({ok:true,id});
 }catch(e){console.error("ESTUDIO_OPINION",e?.message);return res.status(e.status||500).json({error:e.status===429?"Demasiados intentos. Probá más tarde.":"No se pudo procesar la inscripción. Intentá nuevamente."});}
};