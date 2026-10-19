// FO-CHG-068: after an async GPS fix, enrichment for barrio/estrato/troncal
// must be in-flight BEFORE the GPS completion promise releases review().
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const ux=read("ux-v04.js"),css=read("executive-density.css"),cfg=JSON.parse(read("vercel.json"));
assert.match(css,/FO-CHG-068 · compact paired coordinate actions/);
assert.match(css,/territorial-coordinate-actions\{\s*display:flex!important;flex-direction:row!important/);
assert.equal(cfg.functions["api/exploration.js"].maxDuration,30);
assert.match(ux,/setTimeout\(\(\)=>controller\.abort\(\),27000\)/);
assert.ok(ux.includes('return res.status')===false); // no backend embedded in UI
const start=ux.indexOf("  function captureGps(value,btn,key){");
const end=ux.indexOf("  function normalizeCityName(",start);
assert.ok(start>=0&&end>start);
const source=ux.slice(start,end);
const create=new Function("navigator","state","isExplorationForm","setTimeout",
  "clearTimeout","invalidateTerritorialOnCoordinateChange","document",
  "resolveExplorationMunicipality","setStatus","clearError","setTerritorialProgress",
  "currentSection","renderSection",source+"return captureGps;");
async function run(){
  let watch,finishLookup,lookups=0,settled=0;const phases=[];
  const state={form:{id:"EXPLORACION_PRESENCIAL"},startedAt:42,gps:null,
    gpsCapturePending:false,geoPromise:null,locationValidated:false};
  const value={textContent:"",_onGpsStatus(){},_onGpsCaptured(){},
    _onGpsSettled(){settled++;},closest(){return {};}};
  const button={dataset:{gpsOriginalLabel:"GPS"},textContent:"",disabled:false};
  const navigator={geolocation:{
    watchPosition(callback){watch=callback;return 7;},
    clearWatch(){}}
  };
  const capture=create(navigator,state,()=>true,()=>13,()=>{},()=>{},
    {querySelector:()=>null},
    async (lat,lng)=>{
      lookups++;assert.equal(lat,2.9252688);assert.equal(lng,-75.2738189);
      return new Promise(resolve=>{finishLookup=resolve;});
    },()=>{},()=>{},phase=>phases.push(phase),()=>({id:"operadores"}),()=>{});
  capture(value,button,"coordenadas");
  assert.equal(state.gpsCapturePending,true);
  assert.ok(state.gpsCapturePromise);
  const pendingFix=state.gpsCapturePromise;
  watch({coords:{latitude:2.9252688,longitude:-75.2738189,accuracy:7}});
  assert.ok(state.geoPromise,"territorial request must be registered synchronously with GPS fix");
  const pendingTerritorial=state.geoPromise;
  await pendingFix;
  assert.equal(state.geoPromise,pendingTerritorial);
  await Promise.resolve();
  assert.equal(lookups,1,"exactly one full territorial lookup after the GPS fix");
  assert.equal(state.locationBusy,true,"lookup must remain busy after GPS capture");
  finishLookup("Neiva");
  await pendingTerritorial;
  await Promise.resolve();
  assert.equal(state.gpsCapturePending,false);
  assert.equal(state.geoPromise,null);
  assert.equal(state.locationBusy,false);
  assert.equal(button.disabled,false);
  assert.equal(settled,1);
  assert.deepEqual(phases,["gps","territorial"]);
}
run().then(()=>console.log("FO-CHG-068 GPS fix -> parallel territorial lookup -> review wait PASS"))
  .catch(error=>{console.error(error);process.exitCode=1;});
