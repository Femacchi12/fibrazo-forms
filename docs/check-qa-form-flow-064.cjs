// FO-CHG-064 · QA regression: pasted coordinate + mandatory classification.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const ui=read("ux-v04.js");
const html=read("index.html");
const style=read("executive-density.css");
const sw=read("service-worker.js");
assert.match(ui,/serverHistory:\[\],isTest:null,qaReference:null/);
assert.match(ui,/state\.sectionIndex=0;state\.isTest=null/);
assert.ok(html.includes('name="qaTestEntry" value="No">'));
assert.ok(html.includes('name="qaTestEntry" value="Sí">'));
assert.ok(!html.includes('name="qaTestEntry" value="No" checked'));
assert.ok(html.includes('id="formTestChoiceError"'));
assert.match(ui,/input\.checked=state\.isTest!==null/);
assert.ok(ui.includes('if(!requireTestChoice())return;'));
assert.ok(ui.includes('if(!requireTestChoice()){'));
assert.ok(ui.includes('entry._applyManualCoordinate()'));
assert.ok(ui.includes('input._applyManualCoordinate=applyManualCoordinate'));
assert.ok(ui.includes('search.addEventListener("click",applyManualCoordinate)'));
assert.ok(ui.includes('const parsed=parseCoordinateText(input.value);'));
assert.ok(ui.includes('input.setCustomValidity(message)'));
assert.ok(ui.includes('const allowed=mayIdentifyTest()&&state.isTest!==false&&isExplorationForm()&&current;'));
assert.ok(ui.includes('if(!payload.isTest&&String(payload.location?.estratoStatus||"").startsWith("QA_"))'));
assert.ok(ui.includes('!data?.qaStratum'));
assert.ok(style.includes('.form-test-choice-error[hidden]{display:none!important;}'));
assert.ok(sw.includes('"/qa-stratum-policy.js"'));
console.log("FO-CHG-064: GPS continue, no default classification, test/real review and save guard OK");

// Exercise the actual current next() function without a browser or network.
const nextFnSource=ui.slice(ui.indexOf("  function next(){"),ui.indexOf("  function hasExplorationOperator(){"));
assert.ok(nextFnSource.includes("entry._applyManualCoordinate()"));
function exerciseContinue(valid){
  const state={form:{id:"EXPLORACION_PRESENCIAL"},sectionIndex:0,maxSectionReached:0,gps:null};
  let applied=0,validated=0,rendered=0;
  const coordinate={dataset:{coordinateDirty:"1"},_applyManualCoordinate(){
    applied++;if(!valid)return false;
    state.gps={lat:2.9252688,lng:-75.2738189};return true;
  }};
  const next=new Function("state","isExplorationForm","currentSection","document",
    "validateSection","renderSection","showValidation","saveLastOperatorTendidoQuality",
    "saveLastInfrastructure","saveLastOperators",nextFnSource+"return next;")(
    state,()=>true,()=>({id:"coordenada"}),{querySelector:()=>coordinate},
    ()=>{validated++;assert.ok(state.gps);return[];},()=>{rendered++;},
    ()=>{},()=>{},()=>{},()=>{}
  );
  next();
  return{applied,validated,rendered,section:state.sectionIndex};
}
assert.deepEqual(exerciseContinue(true),{applied:1,validated:1,rendered:1,section:1});
assert.deepEqual(exerciseContinue(false),{applied:1,validated:0,rendered:0,section:0});

// Exercise mandatory classification blocking directly.
const choiceSource=ui.slice(ui.indexOf("  function requireTestChoice(){"),ui.indexOf("  async function review(){"));
assert.ok(choiceSource.includes("state.isTest===true||state.isTest===false"));
const state={isTest:null};
const error={hidden:true,setAttribute(){this.hidden=true;}};
const box={hidden:true,scrollIntoView(){this.scrolled=true;}};
const required=new Function("state","mayIdentifyTest","$","setStatus",choiceSource+"return requireTestChoice;")(
  state,()=>true,id=>id==="formTestChoiceError"?error:box,()=>{}
);
assert.equal(required(),false);
assert.equal(error.hidden,false);
assert.ok(box.scrolled);
state.isTest=true;assert.equal(required(),true);
state.isTest=false;assert.equal(required(),true);
console.log("FO-CHG-064 runtime tests: valid/invalid Continue + required QA/real choice PASS");
