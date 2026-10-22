// FO-CHG-067: complete coordinate capture asynchronously, but block review/save
// until a valid coordinate exists. Exercises actual navigation and review functions.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const ui=fs.readFileSync(path.join(__dirname,"../ux-v04.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../executive-density.css"),"utf8");
const reviewBody=ui.slice(ui.indexOf("  async function review(){"),ui.indexOf("  function edit(){"));
assert.ok(reviewBody.includes("await state.gpsCapturePromise"));
assert.ok(ui.includes("state.cancelGpsCapture?.();"));
assert.ok(ui.includes("if(state.form!==captureForm||state.startedAt!==captureStartedAt)"));
assert.ok(ui.includes("if(summaryValue._onGpsCaptured)summaryValue._onGpsCaptured(state.gps)"));
assert.ok(ui.includes("state.gpsCapturePending||!window.FIBRAZO_BACKGROUND_TERRITORY.validPoint(state.gps)"));
assert.ok(css.includes("FO-CHG-067 · compact final coordinate controls"));
assert.ok(css.includes("width:auto!important;max-width:100%!important;"));
assert.ok(css.includes("font-size:11px!important;font-weight:650!important"));
async function simulate(success){
  let resolveGps;
  const task=new Promise(resolve=>{resolveGps=resolve;});
  const state={form:{id:"EXPLORACION_PRESENCIAL"},sectionIndex:4,
    gps:null,gpsCapturePending:true,gpsCapturePromise:task,geoPromise:null,
    locationBusy:true,locationValidated:false,maxSectionReached:4};
  const elements={formWorkspace:{hidden:false},reviewWorkspace:{hidden:true},successWorkspace:{hidden:true}};
  let validations=0,reviewBuilt=0,shownErrors=0;
  const sections=[{id:"coordenada"},{id:"operadores"},{id:"infraestructura"},{id:"otros"},{id:"ubicacion"}];
  const review=new Function("backgroundTerritoryEnabled","state","requireTestChoice","isExplorationForm","setStatus","validateAll",
    "activeSections","renderSection","showValidation","$","buildReview","window",
    "resolveExplorationMunicipality","currentSection",reviewBody+"return review;")(
    ()=>false,state,()=>true,()=>true,()=>{},
    ()=>{validations++;return state.gps?[]:[{field:{section:"coordenada",key:"coordenadas"},message:"Sin GPS"}]},
    ()=>sections,()=>{},()=>{shownErrors++;},id=>elements[id],
    ()=>{reviewBuilt++;},{scrollTo(){}},async()=>{},()=>sections[state.sectionIndex]
  );
  const reviewWait=review();
  assert.equal(validations,0); // cannot review while the GPS is pending
  if(success){state.gps={lat:2.9252688,lng:-75.2738189};state.locationValidated=true;}
  state.gpsCapturePending=false;
  resolveGps(success);
  await reviewWait;
  assert.equal(validations,1);
  if(success){
    assert.equal(elements.reviewWorkspace.hidden,false);
    assert.equal(reviewBuilt,1);
    assert.equal(shownErrors,0);
  }else{
    assert.equal(elements.reviewWorkspace.hidden,true);
    assert.equal(shownErrors,1);
    assert.equal(state.sectionIndex,0);
  }
}
(async()=>{
  await simulate(true);
  await simulate(false);
  console.log("FO-CHG-067: capture pending, successful review, failed GPS review block and compact UI PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});

