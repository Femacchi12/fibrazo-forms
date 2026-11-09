"use strict";

// Reglas de lectura por aplicación. Hoja provisionada antes del despliegue;
// la identidad se verifica siempre en servidor. Ninguna regla concede escritura.
const {google}=require("googleapis");
const {gauth,verifyUser,SHEET_ID}=require("./_core");
const {DASHBOARDS,validateGrant,canReadDashboard}=require("./_dashboard-read-policy");
const OWNER="eduardo@fibrazo.com";
const TAB="PERMISOS_DASHBOARDS";
const norm=v=>String(v||"").trim().toLowerCase();
const origins=new Set(["https://femacchi12.github.io","https://fibrazo-forms.vercel.app"]);

function normalizeRules(dashboard, input) {
  if(!Array.isArray(input)||input.length>120) throw new Error("INVALID_RULES");
  const result=[], seen=new Set();
  for(const item of input){
    const g=validateGrant({dashboard,kind:item?.kind,subject:item?.subject,enabled:true});
    const k=g.kind+":"+g.subject;
    if(!seen.has(k)){seen.add(k);result.push({kind:g.kind,subject:g.subject});}
  }
  return result.sort((a,b)=>(a.kind+":"+a.subject).localeCompare(b.kind+":"+b.subject));
}

async function loadRow(auth,dashboard){
  const api=google.sheets({version:"v4",auth}).spreadsheets.values;
  const r=await api.get({spreadsheetId:SHEET_ID,range:TAB+"!A2:E5"});
  const rows=r.data.values||[];
  const indexes=rows.map((r,i)=>norm(r[0])===dashboard?i:-1).filter(i=>i>=0);
  if(indexes.length!==1) throw new Error("POLICY_UNAVAILABLE");
  const i=indexes[0], row=rows[i], raw=String(row[1]||"");
  let rules;
  try {rules=normalizeRules(dashboard,JSON.parse(raw));}
  catch(_){throw new Error("POLICY_INVALID");}
  return {api,rowNumber:i+2,rules,revision:String(row[2]||"")};
}

module.exports=async function(req,res){
  const origin=String(req.headers.origin||"");
  if(origin&&origins.has(origin)){
    res.setHeader("Access-Control-Allow-Origin",origin);
    res.setHeader("Vary","Origin");
    res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods","GET, PUT, OPTIONS");
  }
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(origin&&!origins.has(origin)?403:204).end();
  if(origin&&!origins.has(origin))return res.status(403).json({error:"ORIGIN_DENIED"});
  try{
    if(req.method!=="GET"&&req.method!=="PUT")return res.status(405).json({error:"METHOD_NOT_ALLOWED"});
    const user=await verifyUser(req);
    const dashboard=norm(req.method==="GET"?req.query?.dashboard:req.body?.dashboard);
    if(!DASHBOARDS.includes(dashboard))return res.status(400).json({error:"INVALID_DASHBOARD"});
    const owner=norm(user.email)===OWNER;
    if(req.method==="PUT"&&!owner)return res.status(403).json({error:"ADMIN_REQUIRED"});
    const state=await loadRow(gauth(),dashboard);
    if(req.method==="GET"){
      const grants=state.rules.map(rule=>({...rule,dashboard,enabled:true}));
      const allowed=owner||canReadDashboard({email:user.email,emailVerified:true},dashboard,grants);
      return res.status(200).json(owner?{dashboard,allowed,admin:true,rules:state.rules,revision:state.revision}:{dashboard,allowed,admin:false});
    }
    if(typeof req.body?.revision!=="string"||req.body.revision!==state.revision)
      return res.status(409).json({error:"STALE_POLICY"});
    let rules;
    try {rules=normalizeRules(dashboard,req.body.rules);}
    catch(_){return res.status(400).json({error:"INVALID_RULES"});}
    const revision=String(Date.now())+"-"+require("crypto").randomBytes(12).toString("hex");
    await state.api.update({spreadsheetId:SHEET_ID,range:TAB+"!A"+state.rowNumber+":E"+state.rowNumber,
      valueInputOption:"RAW",requestBody:{values:[[dashboard,JSON.stringify(rules),revision,OWNER,new Date().toISOString()]]}});
    return res.status(200).json({dashboard,allowed:true,admin:true,rules,revision});
  }catch(error){
    if(error?.statusCode===401||error?.status===401||error?.message==="AUTH_REQUIRED")return res.status(401).json({error:"AUTH_REQUIRED"});
    console.error("DASHBOARD_POLICY_ERROR",error?.message||"unknown");
    return res.status(503).json({error:"POLICY_UNAVAILABLE"});
  }
};
