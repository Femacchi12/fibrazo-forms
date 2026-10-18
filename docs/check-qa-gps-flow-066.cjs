// FO-CHG-066: no redundant GPS tap when the first coordinate field is empty.
// Actual next() control-flow is exercised with stubbed GPS callbacks.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const ui=read("ux-v04.js"),css=read("executive-density.css");
const nextSource=ui.slice(ui.indexOf("  function next(){"),ui.indexOf("  function hasExplorationOperator(){"));
function simulate({value="",dirty="0",originalGps=null,disabled=false}={}){
  const state={form:{id:"EXPLORACION_PRESENCIAL"},sectionIndex:0,maxSectionReached:0,
    gps:originalGps,gpsCapturePending:false};
  let clicked=0,validated=0,rendered=0,errors=0;
  const entry={value,dataset:{coordinateDirty:dirty},_continueAfterGps:false,
    _applyManualCoordinate(){const match=value.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);if(!match)return false;state.gps={lat:Number(match[1]),lng:Number(match[2])};return true;}};
  const auto={disabled,click(){clicked++;}};
  const doc={querySelector:s=>s===".gps-exec-auto"?auto:entry};
  const next=new Function("state","isExplorationForm","currentSection","document","setError",
    "validateSection","renderSection","showValidation","saveLastOperatorTendidoQuality",
    "saveLastInfrastructure","saveLastOperators",nextSource+"return next;")(
    state,()=>true,()=>({id:"coordenada"}),doc,()=>{errors++;},
    ()=>{validated++;return state.gps?[]:[{field:"coordenadas"}];},
    ()=>{rendered++;},()=>{},()=>{},()=>{},()=>{}
  );
  return {state,entry,next,summary:()=>({clicked,validated,rendered,errors})};
}
const blank=simulate();
blank.next();
assert.deepEqual(blank.summary(),{clicked:1,validated:0,rendered:0,errors:0});
assert.equal(blank.entry._continueAfterGps,true);
blank.next();assert.equal(blank.summary().clicked,1); // no double GPS request
blank.state.gps={lat:2.9252688,lng:-75.2738189};
blank.entry.value="2.9252688, -75.2738189";blank.entry.dataset.coordinateDirty="0";
blank.entry._continueAfterGps=false;
blank.next();assert.equal(blank.state.sectionIndex,1);
const denied=simulate({disabled:true});denied.next();assert.deepEqual(denied.summary(),{clicked:0,validated:0,rendered:0,errors:1});
const cleared=simulate({dirty:"1",originalGps:{lat:4.1557452,lng:-73.6268849}});
cleared.next();assert.equal(cleared.summary().clicked,1);assert.equal(cleared.state.sectionIndex,0);
const pasted=simulate({value:"4.1557452, -73.6268849",dirty:"1"});
pasted.next();assert.equal(pasted.summary().clicked,0);assert.equal(pasted.state.sectionIndex,1);
// Execute actual capture callback with no browser dependencies.
const start=ui.indexOf("    input._onGpsCaptured=point=>{");
const end=ui.indexOf("    input._onGpsSettled=",start);
assert.ok(start>0&&end>start);
const callbackText=ui.slice(start,end);
const input={value:"",dataset:{coordinateDirty:"1"},_continueAfterGps:true,isConnected:true};
const auto={dataset:{}},state={gps:{lat:4.1557452,lng:-73.6268849}};
let advanced=0;
const capture=new Function("input","box","format","auto","sync","queueMicrotask","currentSection","state","next",callbackText+"return input._onGpsCaptured;")(
  input,{querySelector:()=>null},p=>p.lat+","+p.lng,auto,()=>{},f=>f(),
  ()=>({id:"coordenada"}),state,()=>{advanced++;}
);
capture({...state.gps,accuracy:8});
assert.equal(advanced,1);assert.equal(input._continueAfterGps,false);
assert.equal(input.dataset.coordinateDirty,"0");
assert.ok(ui.includes('summaryValue._onGpsCaptured=point=>'));
assert.ok(ui.includes('quick.append(copyCoord,mapsCoord)'));
assert.ok(ui.includes('actions.append(applyEdit,gpsEdit)'));
assert.ok(css.includes('FO-CHG-066 · Shared first/final coordinate layout'));
assert.ok(css.includes('.territorial-coordinate-quick>button'));
console.log("FO-CHG-066: blank/cancel/disabled GPS, pasted Continue, auto-next after fix, final editor layout PASS");
