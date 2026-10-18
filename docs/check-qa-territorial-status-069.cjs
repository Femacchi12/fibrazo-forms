// FO-CHG-069 · progress survives navigation and follows real GPS/territorial state.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const ui=read("ux-v04.js"),html=read("index.html"),css=read("executive-density.css");
assert.match(html,/id="territorialProgress"[^>]*role="status"[^>]*aria-live="polite"/);
assert.ok(html.indexOf('id="territorialProgress"')<html.indexOf('id="dynamicFields"'));
assert.match(css,/FO-CHG-069 · compact persistent feedback/);
assert.match(css,/prefers-reduced-motion:reduce/);
const dom={
 territorialProgress:{hidden:true,dataset:{}},
 territorialProgressTitle:{textContent:""},
 territorialProgressDetail:{textContent:""}
};
const state={form:{id:"EXPLORACION_PRESENCIAL"},territorialProgress:null};
const start=ui.indexOf("  function updateTerritorialProgress(){");
const end=ui.indexOf("  function setStatus(m,t)",start);
assert.ok(start>0&&end>start);
const methods=new Function("state","$","isExplorationForm",
  ui.slice(start,end)+"return {setTerritorialProgress,updateTerritorialProgress};")(
    state,id=>dom[id],()=>!!state.form&&state.form.id==="EXPLORACION_PRESENCIAL"
  );
methods.updateTerritorialProgress();
assert.equal(dom.territorialProgress.hidden,true);
methods.setTerritorialProgress("gps");
assert.equal(dom.territorialProgress.hidden,false);
assert.equal(dom.territorialProgress.dataset.phase,"gps");
assert.match(dom.territorialProgressTitle.textContent,/GPS/);
methods.setTerritorialProgress("territorial");
assert.match(dom.territorialProgressDetail.textContent,/municipio, barrio, estrato y troncal/);
methods.updateTerritorialProgress(); // same state after a section re-render
assert.equal(dom.territorialProgress.dataset.phase,"territorial");
methods.setTerritorialProgress("complete");
assert.match(dom.territorialProgressTitle.textContent,/finalizada/);
assert.match(dom.territorialProgressDetail.textContent,/datos disponibles/);
methods.setTerritorialProgress("warning");
assert.match(dom.territorialProgressTitle.textContent,/No se completó/);
state.form=null;methods.updateTerritorialProgress();
assert.equal(dom.territorialProgress.hidden,true);
assert.ok(ui.includes('clearValidation();updateVisibility();updateTerritorialProgress();'));
assert.ok(ui.includes('state.territorialProgress=null;state.gps=null;'));
assert.ok(ui.includes('setTerritorialProgress("gps")'));
assert.ok(ui.includes('setTerritorialProgress("territorial")'));

// Execute the actual resolver on an authenticated-online fast path and a failed
// lookup; completion is announced only after the whole resolver returns.
const r0=ui.indexOf("  async function resolveExplorationMunicipality(");
const r1=ui.indexOf("  function detectAmbMunicipalityOffline(",r0);
assert.ok(r0>0&&r1>r0);
const source=ui.slice(r0,r1);
async function testResolver(valid){
 const phases=[],s={form:{id:"EXPLORACION_PRESENCIAL"},
   gps:{lat:2.9252688,lng:-75.2738189},locationValidated:false,geoLookupCancelled:false};
 const resolver=new Function("state","document","css","setTerritorialProgress",
   "detectAmbMunicipalityOffline","detectConfiguredCityOffline","navigator",
   "applyDetectedCity","geoStatus","queryExplorationEnrichment","reverseGeocodeCity",
   "AbortController","setTimeout","clearTimeout","normalizeCityName",
   source+"return resolveExplorationMunicipality;")(
   s,{querySelector:()=>null},x=>x,phase=>phases.push(phase),
   ()=>"",()=>"",{onLine:true},()=>{},()=>{},
   async()=>{if(valid){s.locationValidated=true;return {cityStatus:"DENTRO",city:"Neiva"};}return null;},
   async()=>"",class{abort(){}},()=>4,()=>{},x=>x
 );
 await resolver(2.9252688,-75.2738189);
 assert.deepEqual(phases,["territorial",valid?"complete":"warning"]);
}
(async()=>{
 await testResolver(true);
 await testResolver(false);
 console.log("FO-CHG-069: GPS/territorial/complete/warning, persistent section status and no-coverage honesty PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
