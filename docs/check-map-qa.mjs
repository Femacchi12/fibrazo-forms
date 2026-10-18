#!/usr/bin/env node
// FO-CHG-021: regresión estática sin acceso a redes ni Google Sheets.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const scripts=["map-v01.js","map-controls-ui.js","ux-v04.js","api/submissions.js","api/map.js","api/map-polygons.js","api/_estratos-precalc.js","api/_estratos-amb-precalc.js","api/_estratos-ctg-historic.js","api/map-city-catalog.js","api/isps.js","app.js","service-worker.js"];
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
assert.ok(types.includes("Panel de mapa anclado a la esquina superior izquierda: no se arrastra."),"Panel anclado al mapa según la decisión UX vigente");
assert.ok(map.includes('map-copy-feedback'),"Aviso breve de coordenadas copiadas");
for(const id of ["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter"]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*multiple'),id+" permite selección múltiple");
}
assert.ok(types.includes("map-typeahead-selections")&&types.includes('input.value="";sync();draw()'),"La búsqueda se limpia y conserva selecciones visibles");
assert.ok(!html.includes('id="mapBaseStreet"')&&!html.includes('id="mapBaseSatellite"')&&html.includes('id="mapBaseToggle"'),"Un solo botón alterna el tipo de mapa");
assert.ok(map.includes("installCoordinateSheetDrag")&&map.includes("map-coordinate-primary")&&map.includes('>↗ Ir</button>'),"Punto seleccionado movible y compacto");
assert.ok(map.includes("polygonResponseCache")&&map.includes("ttl:90000")&&read("api/map-polygons.js").includes("geometryCache"),"Caché cliente/servidor para polígonos");
assert.ok(read("api/map-polygons.js").includes("applyCityFilter")&&map.includes('cities:filterValues("mapCityFilter")'),"Capas territoriales respetan ciudades filtradas");
assert.ok(read("api/map-polygons.js").includes('if(layer==="estratos"&&!/^[1-6]$/.test(String(row.Estrato||row.Categoria_Estrato||"").trim()))continue;'),"Se excluyen estratos sin clasificación del índice original sin alterar el maestro");
assert.ok(types.includes("content.dataset.selectedCount")&&map.includes("host.dataset.selectedCount"),"El resumen de capas conserva el conteo real aunque el filtro o viewport oculten opciones");
assert.ok(types.includes('byLayer("Barrios"),byLayer("Troncales")')&&!types.includes("Capas adicionales · Troncales"),"Troncales aparece inmediatamente debajo de Barrios, sin bloque separado");
assert.ok(types.includes('map-control-label')&&types.includes('map-control-count')&&read("brand-alignment.css").includes("FO-CHG-043"),"Filtros y capas comparten fila, contador y jerarquía visual");
const alignmentCss=read("brand-alignment.css");
assert.ok(alignmentCss.includes("FO-CHG-044")&&alignmentCss.includes("grid-row:1!important"),"Ojo, nombre, contador y flecha permanecen alineados en una sola fila");
assert.ok(alignmentCss.includes("min-height:40px!important")&&alignmentCss.includes("grid-template-columns:24px minmax(0,1fr) auto 14px"),"Controladores compactos en escritorio y móvil");
assert.ok(types.includes("map-filter-eye-action")&&types.includes("_typeaheadOpen")&&types.includes('if(group.open)control._typeaheadOpen'),"Ciudades y Operadores comparten ojo, búsqueda y apertura completa");
assert.ok(alignmentCss.includes("FO-CHG-045")&&alignmentCss.includes("min-height:31px!important")&&alignmentCss.includes("gap:0!important"),"Opciones internas compactas, sin separación excesiva");
assert.ok(map.includes("resetTerritorialScopeForCity")&&map.includes('cities!==filterValues("mapCityFilter").join(",")'),"El cambio de ciudad cancela y descarta respuestas territoriales anteriores");
assert.ok(map.includes("const incumbents=new Set")&&map.includes("hasOnlyIsps"),"Operadores disponibles dependen de los puntos de la ciudad seleccionada");
assert.ok(read("api/map-polygons.js").includes("requestedCityCount===1?cfg.maxFeatures"),"Una sola ciudad usa el límite completo de geometrías de la capa");

assert.ok(html.includes('id="mapQaOptimizeToolbar"')&&map.includes('updateQaToolbar')&&map.includes('mapQaOptimizeToolbar'),"El botón QA de unión es visible junto a Actualizar");
assert.equal(html.split('id="mapQuickEstratoUnion"').length,2,"El botón de unión aparece una sola vez en la barra real del mapa fullscreen");
assert.ok(html.includes('id="mapQuickEstratoUnion"')&&html.includes('id="mapQuickRefresh"')&&map.includes('$("mapQuickEstratoUnion")?.addEventListener("click"'),"El botón visible fullscreen está conectado a la unificación");
assert.ok(map.includes('quick.hidden=!isBuc')&&map.includes('quick.setAttribute("aria-pressed"')&&map.includes('state.qaDissolveEstratos=true;'),"El botón QA se muestra en AMB e inicia con la capa multipolígono precalculada");
assert.ok(map.includes("completeBuc")&&map.includes('fullCoverage=1')&&map.includes('baseUrl+"&page="'),"Bucaramanga solicita páginas completas y evita el límite 650");
assert.ok(read("api/map-polygons.js").includes("candidates.slice(page*limit")&&read("api/map-polygons.js").includes("pageCount"),"API envía todas las geometrías solicitadas en lotes");
assert.ok(map.includes("state.manualRefreshId")&&map.includes("recargando cobertura")&&map.includes('forceRefresh=1'),"Actualizar vuelve a solicitar capas sin vaciar prematuramente");

assert.ok(read("api/map-polygons.js").includes("precalcCity")&&read("api/_estratos-precalc.js").includes("QA_PRECALCULATED"),"Adapter QA de estratos precalculados conectado");
assert.ok(read("api/map-polygons.js").includes('ambPrecalcCity')&&read("api/_estratos-amb-precalc.js").includes('AMB_QA_PRECALCULATED'),"AMB utiliza adaptador offline en modo optimizado");
assert.ok(read("api/_estratos-amb-precalc.js").includes("11T-x0QBB9W1GYUf0AaAvB9f5yvsLIGfJ")&&read("api/_estratos-amb-precalc.js").includes('["1","2","3","4","5","6"]'),"Fuente versionada de Drive y seis estratos AMB");
assert.ok(read("api/map-polygons.js").includes('(precalcCity||ambPrecalcCity)?Promise.resolve(null):loadMeta'),"Modo optimizado evita escanear el Sheet de polígonos");
assert.ok(read("api/_estratos-amb-precalc.js").includes('const detail="full"')&&read("api/_estratos-amb-precalc.js").includes('viewportFiltered:false')&&!read("api/_estratos-amb-precalc.js").includes('intersects('),"AMB optimizado devuelve geometrías completas sin filtrar por zona visible");
assert.ok(map.includes('const queryBbox=completeCity?"-180,-90,180,90":bbox')&&map.includes('const queryZoom=completeCity?15:zoom'),"Las solicitudes AMB optimizadas no cambian por desplazamiento o zoom");
assert.ok(map.includes('state.polygonFullKey===fullKey')&&map.includes('state.polygonFullLoadingKey===fullKey'),"Evita reconsultas y redibujos de multipolígonos completos ante navegación");
assert.ok(map.includes('s (carga + dibujo)'),"Expone segundos de carga y dibujo para comparar modo original vs optimizado");

assert.ok(map.includes('!state.qaDissolveEstratos')&&map.includes('mode=index&layer=')&&map.includes('&qaDissolve=1'),"La carga AMB original pagina; la optimizada está precalculada");
assert.ok(map.includes('QA precalculado · '),"Estado del mapa identifica capas precomputadas");
assert.ok(map.includes('territorialDisplay=(layer,kind)=>')&&map.includes('" (cercano)"')&&map.includes('" · a "+meters+" del polígono"'),"Popups muestran estrato/barrio cercano con distancia y sin asignación falsa");
assert.ok(map.includes('statusLine("",point.barrio,"barrio")')&&map.includes('statusLine("",point.estrato,"estrato")'),"Ficha de punto aplica formato territorial tanto a barrio como estrato");
assert.ok(map.includes('if(label==="Barrio"||label==="Estrato")'),"El selector de coordenadas aplica el mismo formato territorial");
assert.ok(map.includes('"Sin estrato clasificado"'),"Estrato Sin información heredado no se anuncia como estrato exacto");

assert.ok(map.includes('scopeCity=value=>')&&map.includes('"bucaramanga-amb"')&&map.includes('matchesCitySelection'),"Bucaramanga y los tres municipios del AMB comparten filtro de puntos y operadores");
assert.ok(read("api/map-city-catalog.js").includes('visibleCity')&&read("api/map-city-catalog.js").includes('"Bucaramanga + AMB"'),"Catálogo solo muestra la agrupación Bucaramanga + AMB");
assert.ok(read("api/map-polygons.js").includes('cities.has("bucaramanga-amb")')&&read("api/map-polygons.js").includes('"floridablanca","giron","piedecuesta"'),"Bucaramanga + AMB filtra todos los municipios de barrios y troncales");
assert.ok(read("api/_estratos-amb-precalc.js").includes('loadCombined')&&read("api/_estratos-amb-precalc.js").includes('polygons:matches.flatMap(row=>row.polygons)'),"AMB unido se entrega como máximo en seis Features MultiPolygon sin inventar superficies");
assert.ok(read("api/_estratos-precalc.js").includes('delivery:"FULL_CITY_MULTIPOLYGON"')&&!read("api/_estratos-precalc.js").includes('hits('),"Neiva, Ibagué y Villavicencio entregan toda su geometría, sin viewport");
assert.ok(map.includes('hasStaticEstratos(cities)')&&map.includes('state.polygonFullKey===fullKey'),"Capas de todas las ciudades con estratos se conservan durante pan y zoom");
assert.ok(read("api/map-polygons.js").includes("ctgHistoricCity")&&read("api/_estratos-ctg-historic.js").includes("HISTORICO_2022_NO_VIGENTE"),"Cartagena QA se entrega desde archivo histórico declarado sin activar estratos vigentes");
assert.ok(read("api/_estratos-ctg-historic.js").includes("1iM1ClOL205PTpPekbn3apTpGCiPTGJe5")&&read("api/_estratos-ctg-historic.js").includes("canonical:false"),"Cartagena usa paquete Growth versionado y nunca se declara fuente canónica");
assert.ok(map.includes("HISTÓRICO 2022 · SOLO QA")&&read("map-controls-ui.js").includes("únicamente como referencia visual QA"),"Advertencia de datos históricos claramente visible");



assert.ok(read("api/map-city-catalog.js").includes("QA_ESTRATOS"),"Ciudades en estado QA se ofrecen solo en versión QA");
assert.ok(map.includes("centerQaCityIfEmpty")&&map.includes("QA_CITY_BOUNDS"),"Mapa centra ciudades nuevas sin puntos");
assert.equal(html.split('id="mapEstratoOptimizePilot"').length,2,"Control QA de estratos único");
assert.ok(map.includes('territorialCityReady=()=>filterValues("mapCityFilter").length===1')&&map.includes('state.polygonSelections.estratos=new Set(["1","2","3"])'),"Capas territoriales requieren una ciudad y preseleccionan estratos 1, 2 y 3");
assert.ok(map.includes('state.polygonActive[layer]=ready&&layer==="estratos"')&&types.includes("territorial-locked"),"Cero o varias ciudades apagan capas y bloquean sus desplegables");
assert.ok(types.includes('compactCity=select.id==="mapCityFilter"')&&alignmentCss.includes('data-control="mapCityFilter"'),"Ciudad oculta el chip redundante y conserva el selector");
assert.ok(alignmentCss.includes("FO-CHG-046")&&alignmentCss.includes("position:relative!important")&&alignmentCss.includes("territorial-ready"),"El tachado del ojo queda contenido y los estados rojo/verde son visibles");
