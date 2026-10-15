const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,loadUsers,isBaseAdmin,canUseDashboard}=require("./_core");

// FO-CHG-032 · Fuente de verdad: FIBRAZO Forms - Automatizaciones y control / PENDIENTES.
// Solo lectura; la aplicación nunca escribe estados en esta hoja.
const CONTROL_SHEET_ID=process.env.FORMS_CONTROL_SHEET_ID||"1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c";
const CACHE_MS=90*1000;
let cache={expires:0,items:null,updatedAt:null};

function kind(status){
  const s=String(status||"").trim().toUpperCase();
  if(/^(CERRADO|RESUELTO|COMPLETADO|FINALIZADO|CANCELADO)\b/.test(s))return "closed";
  if(/\b(EN PAUSA|PAUSADO|POSTERGADO)\b/.test(s))return "paused";
  return "active";
}
function clean(value,max=260){return String(value||"").trim().slice(0,max);}
async function readPending(auth){
  const sheets=google.sheets({version:"v4",auth});
  const result=await sheets.spreadsheets.values.get({spreadsheetId:CONTROL_SHEET_ID,range:"PENDIENTES!A1:H300"});
  const rows=result.data.values||[];
  if(!rows.length||rows[0]?.[0]!=="ID"||rows[0]?.[3]!=="Estado")throw new Error("INVALID_PENDING_SCHEMA");
  const items=rows.slice(1).filter(r=>/^FO-PEN-\d+$/.test(String(r[0]||"").trim())).map(r=>({
    id:clean(r[0],30),
    title:clean(r[1],130),
    status:clean(r[3],150),
    priority:/ALTA/.test(String(r[4]||"").toUpperCase())?"ALTA":/MEDIA/.test(String(r[4]||"").toUpperCase())?"MEDIA":/BAJA/.test(String(r[4]||"").toUpperCase())?"BAJA":"PENDIENTE",
    requirement:clean(r[5],260),
    type:kind(r[3])
  }));
  cache={expires:Date.now()+CACHE_MS,items,updatedAt:new Date().toISOString()};
  return cache;
}
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    const user=await verifyUser(req);
    const auth=gauth();
    const [users,forms]=await Promise.all([loadUsers(auth),loadForms(auth)]);
    const u=users.find(x=>x.email===user.email);
    const admin=isBaseAdmin(user.email)||!!(u&&u.status==="ACTIVO"&&u.role==="ADMIN");
    if(!canUseDashboard(user,admin,forms))return res.status(403).json({error:"FORBIDDEN"});
    const data=cache.items&&Date.now()<cache.expires?cache:await readPending(auth);
    res.status(200).json({ok:true,updatedAt:data.updatedAt,activeCount:data.items.filter(x=>x.type==="active").length,pausedCount:data.items.filter(x=>x.type==="paused").length,items:data.items});
  }catch(error){
    console.error("PENDING_SUMMARY_READ_FAILED",error?.code||error?.message||"READ_FAILED");
    res.status(error?.status||503).json({error:error?.status===401?"AUTH_REQUIRED":"PENDING_DATA_UNAVAILABLE"});
  }
};
