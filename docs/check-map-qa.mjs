#!/usr/bin/env node
// FO-CHG-021: regresión estática sin acceso a redes ni Google Sheets.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const scripts=["map-v01.js","map-controls-ui.js","ux-v04.js","api/submissions.js","api/map.js","api/map-polygons.js","api/isps.js","app.js","service-worker.js"];
for(const path of scripts)new vm.Script(read(path),{filename:path});
const html=read("index.html"),css=read("styles.css"),map=read("map-v01.js"),backend=read("api/submissions.js"),apiMap=read("api/map.js"),ui=read("ux-v04.js"),types=read("map-controls-ui.js");
const expectedPalette={"1":"#22C55E","2":"#FACC15","3":"#3B82F6","4":"#EF4444","5":"#A855F7","6":"#EC4899"};
for(const [k,v] of Object.entries(expectedPalette))assert.ok(map.includes('"'+k+'":"'+v+'"'),"Estrato "+k+" debe ser "+v);
for(const id of ["formTestFlag","mapFloatingTools","mapFloatingHost","mapShowTests","mapTestControl","mapEstratoSearch","mapFiltersPanel","mapLayersPanel","mapPointLegendPanel"])
  assert.equal(html.split('id="'+id+'"').length,2,"Un solo control "+id);
assert.ok(!html.includes('id="reviewTestFlag"'),"La bandera QA no se duplica en revisión");
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

const formFlagPosition=html.indexOf('id="formTestFlag"');
assert.ok(formFlagPosition>html.indexOf('id="dynamicFields"')&&formFlagPosition<html.indexOf('id="reviewForm"'),"Selector QA como última pregunta antes de revisar");
assert.ok(ui.includes("isLastSection")&&ui.includes('box.hidden=!(permitted&&isLastSection)'),"Selector QA solo en la última sección");
assert.ok(types.includes('strata.className="map-reference-group map-strata-index"')&&html.includes('data-floating-tab="legend"'),"Índice de estratos desplegable solo en Referencia");
assert.ok(map.includes("Índice de formas de los elementos")&&map.includes("Índice de operadores"),"Índices de formas y operadores desplegables");
assert.ok(!html.includes('id="mapFiltersToggle"')&&!html.includes('id="mapLayersToggle"'),"Sin barra de botones duplicados");
assert.ok(!html.includes('id="mapVisibilityBadge"')&&!html.includes("Actualización automática"),"Sin badges redundantes sobre la búsqueda");
assert.ok(css.includes("bounds.clientHeight-panel.offsetHeight")||types.includes("bounds.clientHeight-panel.offsetHeight"),"Arrastre limitado al mapa");
assert.ok(map.includes('map-copy-feedback'),"Aviso breve de coordenadas copiadas");
for(const id of ["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter"]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*multiple'),id+" permite selección múltiple");
}
assert.ok(types.includes("map-typeahead-selections")&&types.includes('input.value="";sync();draw()'),"La búsqueda se limpia y conserva selecciones visibles");
assert.ok(!html.includes('id="mapBaseStreet"')&&!html.includes('id="mapBaseSatellite"')&&html.includes('id="mapBaseToggle"'),"Un solo botón alterna el tipo de mapa");
assert.ok(map.includes("installCoordinateSheetDrag")&&map.includes("map-coordinate-primary")&&map.includes('>↗ Ir</button>'),"Punto seleccionado movible y compacto");
assert.ok(map.includes("polygonResponseCache")&&map.includes("ttl:90000")&&read("api/map-polygons.js").includes("geometryCache"),"Caché cliente/servidor para polígonos");
assert.ok(read("api/map-polygons.js").includes("applyCityFilter")&&map.includes('cities:filterValues("mapCityFilter")'),"Capas territoriales respetan ciudades filtradas");
