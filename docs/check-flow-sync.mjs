#!/usr/bin/env node
// FO-CHG-019: QA estructural bidireccional, sin modificar producción.
// Ejecutar: node docs/check-flow-sync.mjs
import fs from "node:fs";
import vm from "node:vm";

const read=(p)=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const configText=read("forms-config.js");
const manifest=JSON.parse(read("docs/flow-sync-manifest.json"));
const xml=read("docs/FIBRAZO_Forms_Flujos.drawio");
const sandbox={window:{},Date};
vm.runInNewContext(configText,sandbox,{timeout:5000});
const actual=sandbox.window.FIBRAZO_FORMS||{};
const errors=[];
const warnings=[];
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=(ok,msg)=>{if(!ok)errors.push(msg);};
const norm=(v)=>JSON.parse(JSON.stringify(v??null));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const pageNames=new Set();
const expectedPages=["Churn","Exploración virtual","Exploración presencial","Inteligencia de operadores","Seguridad y publicación","Convenciones","Modo offline"];
const diagrams=[...xml.matchAll(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g)];
for(const m of diagrams){
  const name=m[1].match(/\bname="([^"]+)"/)?.[1]||"SIN_NOMBRE";
  check(!pageNames.has(name),"Página Draw.io duplicada: "+name);
  pageNames.add(name);
}
for(const name of expectedPages)check(pageNames.has(name),"Falta página Draw.io: "+name);
check(diagrams.length===expectedPages.length,"Se esperaban "+expectedPages.length+" páginas y existen "+diagrams.length);

const formIds=Object.keys(actual).filter(id=>actual[id]&&Array.isArray(actual[id].fields));
check(eq(formIds.slice().sort(),Object.keys(manifest.forms).sort()),"Inventario de formularios distinto entre forms-config.js y manifest");
let declaredFields=0;
let reachableFields=0;
let orphanCount=0;
for(const id of formIds){
  const source=actual[id],copy=manifest.forms[id];
  if(!copy){errors.push("No existe "+id+" en el manifest");continue;}
  check(source.name===copy.name,id+": nombre no sincronizado");
  const sourceSections=source.sections||[],targetSections=copy.sections||[];
  check(eq(sourceSections.map(s=>s.id),targetSections.map(s=>s.id)),id+": secciones/orden no sincronizados");
  for(let i=0;i<sourceSections.length;i++){
    const a=sourceSections[i],b=targetSections[i]||{};
    for(const k of ["id","title","description"])check(eq(norm(a[k]),norm(b[k])),id+": sección "+i+" difiere en "+k);
  }
  const sourceFields=source.fields||[],targetFields=copy.fields||[];
  declaredFields+=sourceFields.length;
  check(eq(sourceFields.map(f=>f.key),targetFields.map(f=>f.key)),id+": claves/orden de campos no sincronizados");
  for(let i=0;i<sourceFields.length;i++){
    const a=sourceFields[i],b=targetFields[i]||{};
    for(const k of ["key","section","label","type"]){
      check(eq(norm(a[k]),norm(b[k])),id+": campo "+(a.key||i)+" difiere en "+k);
    }
    check(Boolean(a.required)===Boolean(b.required),id+": campo "+a.key+" difiere en required");
    check(eq(norm(a.options||[]),norm(b.options||[])),id+": campo "+a.key+" difiere en options");
    check(eq(norm(a.showWhen),norm(b.showWhen)),id+": campo "+a.key+" difiere en showWhen");
    if(sourceSections.some(s=>s.id===a.section))reachableFields++;
    else {
      orphanCount++;
      const documented=(manifest.syncAudit?.issues||[]).some(x=>x.formId===id&&x.fieldKey===a.key&&x.declaredSection===a.section);
      check(documented,id+": campo "+a.key+" asociado a sección inexistente no documentada: "+a.section);
      warnings.push(id+": "+a.key+" permanece huérfano y DOCUMENTADO (FO-PEN-004).");
    }
  }
  const page=diagrams.find(m=>(m[1].match(/\bname="([^"]+)"/)?.[1])===copy.page);
  if(!page){errors.push("Falta diagrama asignado para "+id+": "+copy.page);continue;}
  const content=page[2];
  check(content.includes("[decision:es_prueba]"),id+": falta decisión QA en Draw.io");
  check(copy.submissionReview?.testFlag?.key==="Es_Prueba"&&copy.submissionReview.testFlag.default==="No",id+": metadata QA ausente");
  const fieldTags=[...content.matchAll(/\[field:([^\]]+)\]/g)].map(m=>m[1]);
  const sectionTags=[...content.matchAll(/\[section:([^\]]+)\]/g)].map(m=>m[1]);
  const fieldKeys=sourceFields.map(f=>f.key);
  const sectionIds=sourceSections.map(s=>s.id);
  for(const key of fieldKeys)check(fieldTags.filter(x=>x===key).length===1,id+": etiqueta [field:"+key+"] ausente/duplicada");
  for(const key of fieldTags)check(fieldKeys.includes(key),id+": campo extra en Draw.io: "+key);
  for(const key of sectionIds)check(sectionTags.filter(x=>x===key).length===1,id+": etiqueta [section:"+key+"] ausente/duplicada");
  for(const key of sectionTags)check(sectionIds.includes(key),id+": sección extra en Draw.io: "+key);
  const cells=[...content.matchAll(/<mxCell\b([^>]*?)(?:\/>|>)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]])));
  const ids=new Set(cells.map(c=>c.id));
  check(ids.size===cells.length,id+": IDs de celdas duplicados");
  for(const edge of cells.filter(c=>c.edge==="1")){
    for(const key of ["source","target"])if(edge[key])check(ids.has(edge[key]),id+": arista "+edge.id+" referencia un "+key+" inexistente");
  }
}
check(declaredFields===manifest.syncAudit?.declaredFields,"Total de campos no coincide con syncAudit.declaredFields");
check(reachableFields===manifest.syncAudit?.fieldsWithReachableSection,"Total de campos con sección alcanzable difiere del manifiesto");
console.log("FIBRAZO FLOW_SYNC · "+formIds.length+" formularios · "+declaredFields+" campos · "+diagrams.length+" páginas · "+orphanCount+" incidencia(s) documentada(s).");
warnings.forEach(x=>console.warn("AVISO: "+x));
if(errors.length){
  errors.forEach(x=>console.error("ERROR: "+x));
  process.exitCode=1;
}else console.log("QA estructural OK. No reemplaza verificación visual ni validación funcional de rutas/cambios Draw.io.");
