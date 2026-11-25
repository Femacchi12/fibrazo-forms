"use strict";
// FO-CHG-142 · Inscripción de instituciones educativas públicas.
const schema=require("../impacto-social-schema.json");
const formFields=schema.fields.filter(field=>field.type!=="info");
const photoFields=formFields.filter(field=>field.type==="photo-single");
const answerFields=formFields.filter(field=>field.type!=="photo-single");
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern=/^3[0-9]{9}$/;
function error(code){const e=new Error(code);e.status=400;return e;}
function visible(field,answers){
  if(!field.showWhen)return true;
  const value=answers[field.showWhen.field];
  return Array.isArray(value)?value.includes(field.showWhen.equals):String(value??"")===field.showWhen.equals;
}
function empty(value){return value==null||(Array.isArray(value)?value.length===0:String(value).trim()==="");}
function validate(payload){
  const d=payload?.data;
  if(!d||typeof d!=="object"||Array.isArray(d))throw error("INVALID_SOCIAL_DATA");
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
        if(parts.length!==2||!parts.every(part=>/^[+-]?\d+(?:\.\d+)?$/.test(part))||Number(parts[0])<-90||Number(parts[0])>90||Number(parts[1])<-180||Number(parts[1])>180)throw error("INVALID_SOCIAL_COORDINATES_"+field.key);
      }
    }
  }
  const photos=Array.isArray(payload.photos)?payload.photos:[];
  const keys=photoFields.map(field=>field.key);
  const seen=new Set();
  for(const photo of photos){
    const key=String(photo?.fieldKey||"");
    if(!keys.includes(key)||seen.has(key))throw error("INVALID_SOCIAL_PHOTO_FIELD");
    seen.add(key);
  }
  for(const field of photoFields){if(!payload.isTest&&field.required&&!seen.has(field.key))throw error("REQUIRED_SOCIAL_PHOTO_"+field.key);}
  // No otros flujos y no datos derivados sin el campo principal.
  if(photos.length>keys.length)throw error("PHOTO_LIMIT");
}
function headers(){
  return ["Fecha de registro","ID respuesta","Correo del socializador","Prueba QA","Fuente",...formFields.map(f=>f.label)];
}
function buildRow(payload,id,links,email){
  const d=payload.data||{};
  const photoLinks=new Map((payload.photos||[]).map((photo,i)=>[String(photo.fieldKey),links[i]||""]));
  return [
    new Date().toISOString(),id,email||"",payload.isTest?"Sí":"No","FIBRAZO Forms · Impacto Social",
    ...formFields.map(field=>{
      if(field.type==="photo-single")return photoLinks.get(field.key)||"";
      if(!payload.isTest&&!visible(field,d))return"";
      const value=d[field.key];
      return Array.isArray(value)?value.join(" | "):String(value??"");
    })
  ];
}
function resultData(row){
  const d={};
  formFields.forEach((field,i)=>{if(field.type!=="photo-single")d[field.key]=row[i+5]||"";});
  return{formId:schema.id,timestamp:row[0],id:row[1],data:{
    ciudad:d.soc_1797344950||"",institucion:d.soc_645189067||"",sede:d.soc_27544894||"",
    barrio:d.soc_1219605481||"",nit:d.soc_1488187177||"",dane:d.soc_950119148||""
  },user:row[2]||""};
}
module.exports={validate,buildRow,headers,resultData,schema};
