"use strict";
// FO-CHG-176 · Tres gestiones en Impacto Social, con validación por flujo.
const schema=require("../impacto-social-schema.json");
const formFields=schema.fields.filter(f=>f.type!=="info");
const photoFields=formFields.filter(f=>f.type==="photo-single");
const answerFields=formFields.filter(f=>f.type!=="photo-single");
const sections=Object.fromEntries(schema.sections.map(s=>[s.id,s]));
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern=/^3[0-9]{9}$/;
function error(code){const e=new Error(code);e.status=400;return e;}
function empty(value){return value==null||(Array.isArray(value)?value.length===0:String(value).trim()==="");}
function matches(cond,d){
  if(!cond)return true;
  const value=d[cond.field];
  if(cond.notEmpty===true)return !empty(value);
  if(cond.notEquals!==undefined)return String(value??"")!==cond.notEquals;
  if(cond.in)return cond.in.includes(String(value??""));
  if(cond.equals!==undefined)return Array.isArray(value)?value.includes(cond.equals):String(value??"")===cond.equals;
  return true;
}
function visible(field,d){return matches(sections[field.section]?.when,d)&&matches(field.showWhen,d);}
function validate(payload){
  const d=payload?.data;
  if(!d||typeof d!=="object"||Array.isArray(d))throw error("INVALID_SOCIAL_DATA");
  if(!schema.flows.includes(d.soc_gestion)&&!payload.isTest)throw error("SOCIAL_GESTION_REQUIRED");
  if(!Array.isArray(d.soc_correo_confirmado)||!d.soc_correo_confirmado.includes("Confirmo que este es el correo con el que completaré el formulario"))
    throw error("SOCIAL_EMAIL_CONFIRMATION_REQUIRED");
  for(const field of answerFields){
    if(!payload.isTest&&!visible(field,d))continue;
    const value=d[field.key];
    if(!payload.isTest&&field.required&&empty(value))throw error("REQUIRED_FIELD_"+field.key);
    if(empty(value))continue;
    if(field.type==="checkbox"){
      if(!Array.isArray(value)||value.length>20||value.some(v=>typeof v!=="string"||!(field.options||[]).includes(v)))throw error("INVALID_OPTIONS_"+field.key);
    }else{
      if(typeof value!=="string"||value.length>2500)throw error("INVALID_FIELD_"+field.key);
      if((field.type==="radio"||field.type==="select")&&!(field.options||[]).includes(value))throw error("INVALID_OPTION_"+field.key);
      if(field.format==="celular-co"&&!mobilePattern.test(value))throw error("INVALID_COLOMBIAN_MOBILE_"+field.key);
      if(field.format==="email"&&(value.length>254||!emailPattern.test(value)))throw error("INVALID_EMAIL_"+field.key);
      if(field.type==="coordinates-social"){
        const parts=value.trim().split(/\s*[,;]\s*/);
        if(parts.length!==2||!parts.every(part=>/^[+-]?\d+(?:\.\d+)?$/.test(part))||Number(parts[0])<-90||Number(parts[0])>90||Number(parts[1])<-180||Number(parts[1])>180)
          throw error("INVALID_SOCIAL_COORDINATES_"+field.key);
      }
    }
  }
  if(!payload.isTest&&d.soc_gestion==="Actualización de datos de institución educativa"){
    if(d.soc_actualizacion_tipo==="Datos de la institución"){
      const decisions=answerFields.filter(f=>f.key.startsWith("soc_confirmar_")).map(f=>d[f.key]).filter(Boolean);
      if(!decisions.length)throw error("SOCIAL_UPDATE_MUST_CONFIRM_OR_MODIFY_FIELD");
    }else if(d.soc_actualizacion_tipo==="Datos de contacto"){
      let complete=0;
      for(const role of ["rector","coordinador","otro"]){
        const vals=["nombre","celular","correo"].map(part=>d["soc_contacto_"+role+"_"+part]);
        if(vals.some(x=>!empty(x))&&!vals.every(x=>!empty(x)))throw error("SOCIAL_INCOMPLETE_CONTACT_"+role);
        if(vals.every(x=>!empty(x)))complete++;
      }
      if(!complete)throw error("SOCIAL_CONTACT_TRIPLE_REQUIRED");
      if(!empty(d.soc_contacto_otro_nombre)&&empty(d.soc_contacto_otro_cargo))throw error("SOCIAL_OTHER_ROLE_REQUIRED");
    }else throw error("SOCIAL_UPDATE_TYPE_REQUIRED");
  }
  const photos=Array.isArray(payload.photos)?payload.photos:[];
  const keys=photoFields.map(f=>f.key),seen=new Set();
  for(const photo of photos){
    const key=String(photo?.fieldKey||"");
    if(!keys.includes(key)||seen.has(key))throw error("INVALID_SOCIAL_PHOTO_FIELD");
    if(!payload.isTest&&!visible(photoFields.find(f=>f.key===key),d))throw error("PHOTO_NOT_APPLICABLE_"+key);
    seen.add(key);
  }
  for(const f of photoFields)if(!payload.isTest&&visible(f,d)&&f.required&&!seen.has(f.key))throw error("REQUIRED_SOCIAL_PHOTO_"+f.key);
  if(photos.length>6)throw error("PHOTO_LIMIT");
}
function headers(){return ["Fecha de registro","ID respuesta","Correo del socializador","Prueba QA","Fuente",...formFields.map(f=>f.label)]}
function buildRow(payload,id,links,email){
  const d=payload.data||{},photoLinks=new Map((payload.photos||[]).map((photo,i)=>[String(photo.fieldKey),links[i]||""]));
  return [new Date().toISOString(),id,email||"",payload.isTest?"Sí":"No","FIBRAZO Forms · Impacto Social",
    ...formFields.map(f=>{
      if(f.type==="photo-single")return photoLinks.get(f.key)||"";
      if(!payload.isTest&&!visible(f,d))return "";
      const value=d[f.key];return Array.isArray(value)?value.join(" | "):String(value??"");
    })];
}
function resultData(row){
  const d={};formFields.forEach((f,i)=>{if(f.type!=="photo-single")d[f.key]=row[i+5]||""});
  return {formId:schema.id,timestamp:row[0],id:row[1],data:{
    gestion:d.soc_gestion||"",novedad:d.soc_novedad_tipo||"",ciudad:d.soc_1797344950||"",
    institucion:d.soc_identificacion_nombre||d.soc_645189067||"",sede:d.soc_identificacion_sede||d.soc_27544894||"",
    barrio:d.soc_1219605481||"",nit:d.soc_identificacion_nit||d.soc_1488187177||"",
    dane:d.soc_identificacion_dane||d.soc_950119148||"",
    actualizacion:d.soc_actualizacion_tipo||""
  },user:row[2]||""};
}
module.exports={validate,headers,buildRow,resultData,visible,matches,schema};
