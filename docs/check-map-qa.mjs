#!/usr/bin/env node
// FO-CHG-021: regresión estática sin acceso a redes ni Google Sheets.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const scripts=["map-v01.js","map-controls-ui.js","ux-v04.js","api/submissions.js","api/map.js","api/isps.js","app.js","service-worker.js"];
for(const path of scripts)new vm.Script(read(path),{filename:path});
const html=read("index.html"),css=read("styles.css"),map=read("map-v01.js"),backend=read("api/submissions.js"),apiMap=read("api/map.js"),ui=read("ux-v04.js"),types=read("map-controls-ui.js");
const expectedPalette={"1":"#22C55E","2":"#FACC15","3":"#3B82F6","4":"#EF4444","5":"#A855F7","6":"#EC4899"};
for(const [k,v] of Object.entries(expectedPalette))assert.ok(map.includes('"'+k+'":"'+v+'"'),"Estrato "+k+" debe ser "+v);
for(const id of ["reviewTestFlag","mapFloatingTools","mapFloatingHost","mapShowTests","mapTestControl","mapFiltersPanel","mapLayersPanel","mapPointLegendPanel"])
  assert.equal(html.split('id="'+id+'"').length,2,"Un solo control "+id);
assert.ok(html.includes("/map-controls-ui.js?v=")&&read("service-worker.js").includes('"/map-controls-ui.js"'),"UI nueva cargada y cacheada");
assert.ok(backend.includes('throw httpError("TEST_FLAG_FORBIDDEN",403)'),"Guardia de token");
assert.ok(backend.includes("TEST_NO_MASTER_SYNC"),"No sincronizar QA con maestro");
assert.ok(backend.includes('!payload.isTest&&await hasExistingResponseForEmail'),"Pruebas no consumen cuota real");
assert.ok(backend.includes("submissionRow[82]=payload.isTest"),"Metadatos en exploración");
assert.ok(backend.includes("submissionRow[28]=payload.isTest"),"Metadatos en Churn");
assert.ok(backend.includes("submissionRow[31]=payload.isTest"),"Metadatos en Inteligencia");
assert.ok(apiMap.includes('canViewTests=email==="eduardo@fibrazo.com"'),"Solo propietario puede recuperar QA");
assert.equal(apiMap.split("if(isTest&&(!includeTests||rowEmail!==email))continue").length,3,"Filtrar QA en ambos orígenes");
assert.ok(ui.includes("state.isTest=false")&&ui.includes("isTest:mayIdentifyTest()&&state.isTest"),"No por defecto");
assert.ok(types.includes('input.type="search"')&&types.includes("select.dispatchEvent"),"Filtros tecleables enlazados al select original");
assert.ok(map.includes("googlePointUrl(lat,lng)"),"Google Maps como marcador, no ruta");
const manifest=JSON.parse(read("docs/flow-sync-manifest.json"));
for(const form of Object.values(manifest.forms)){
  assert.equal(form.qaTestFlow?.default,"No");
  assert.equal(form.qaTestFlow?.visibleOnlyFor,"eduardo@fibrazo.com");
}
const xml=read("docs/FIBRAZO_Forms_Flujos.drawio");
assert.equal(xml.split("[decision:es_prueba]").length,5,"Cuatro diagramas QA");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"CSS balanceado");
console.log("FO-CHG-021: sintaxis JS, fuentes, permisos QA, metadatos, colores, 4 flujos y CSS OK");
