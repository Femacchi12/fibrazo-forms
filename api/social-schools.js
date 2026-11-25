"use strict";
/* FO-CHG-176: lectura administrativa, no destructiva, de escuelas/sedes oficiales.
   Fuente: Base_Esc-Fund. de Impacto Social. No edita la base maestra. */
const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,userCapabilities,permissionFor,canAccess,httpError}=require("./_core");
const MASTER="1symwDNHvlE6cL4wPivai-Hc12uC5ZturLFHRlHw5QaY";
let cache={until:0,rows:[]};
function value(r,i){const x=String(r[i]??"").trim();return /^(sin (informaci[oó]n|confirmar)|#n\/a)$/i.test(x)?"":x;}
async function schoolRows(auth){
  if(cache.until>Date.now())return cache.rows;
  const result=await google.sheets({version:"v4",auth}).spreadsheets.values.get({
    spreadsheetId:MASTER,range:"'Base_Esc-Fund.'!A2:BL5000",valueRenderOption:"FORMATTED_VALUE"
  });
  const rows=(result.data.values||[]).map((r,i)=>({r,row:i+2})).filter(({r})=>value(r,5)==="Institución Educativa"&&value(r,9)==="Instalado");
  cache={until:Date.now()+300000,rows};
  return rows;
}
function entry(entry){
  const r=entry.r,id=entry.row;
  const school=value(r,0),site=value(r,1),city=value(r,14);
  return {id:String(id),label:[school,site,city].filter(Boolean).join(" · "),school,site,city};
}
function detail(record){
  const r=record.r;
  const data={
    nombre:value(r,0),sede:value(r,1),nit:value(r,22)||value(r,24),dane:value(r,25)||value(r,26),
    ciudad:value(r,14),barrio:value(r,20),sector:value(r,21),direccion:value(r,27),
    email:value(r,29),email_alt:value(r,30),administracion:value(r,7),alumnos:value(r,41),
    internet:value(r,50),aula:value(r,44),computadores:value(r,45),tabletas:value(r,46)
  };
  // Se entregan solo los contactos de una sede seleccionada por usuario autenticado autorizado.
  const contacts={
    rector:{nombre:value(r,31),celular:value(r,32),correo:value(r,33)},
    coordinador:{nombre:value(r,34),celular:value(r,35),correo:value(r,36)}
  };
  return {...entry(record),fields:data,contacts};
}
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
    if(req.method!=="GET")throw httpError("METHOD_NOT_ALLOWED",405);
    const user=await verifyUser(req);
    const auth=gauth(),forms=await loadForms(auth),form=forms.find(f=>f.id==="IMPACTO_SOCIAL");
    const caps=await userCapabilities(auth,user.email);
    if(!canAccess(form,user,caps.base,permissionFor(caps.permissions,user.email,"IMPACTO_SOCIAL",caps.base)))
      throw httpError("ACCESS_DENIED",403);
    const rows=await schoolRows(auth);
    const id=String(req.query.row||"").trim();
    if(id){
      if(!/^\d{1,5}$/.test(id))throw httpError("INVALID_SCHOOL_REF",400);
      const match=rows.find(x=>String(x.row)===id);
      if(!match)throw httpError("SCHOOL_NOT_FOUND",404);
      return res.status(200).json({ok:true,school:detail(match)});
    }
    const q=String(req.query.q||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").slice(0,90);
    const list=rows.map(entry).filter(x=>!q||x.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(q));
    res.status(200).json({ok:true,source:"Base_Esc-Fund.",total:list.length,schools:list.slice(0,450)});
  }catch(e){res.status(e.status||503).json({ok:false,error:e.status?e.message:"SCHOOL_DIRECTORY_UNAVAILABLE"});}
};
