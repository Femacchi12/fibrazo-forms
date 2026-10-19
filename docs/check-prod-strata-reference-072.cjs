// FO-CHG-072: reference strata in Production remain advisory, never canonical.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../api/exploration.js"),"utf8");

async function check(env,estratoStatus="SIN_CAPA",failReference=false,catalogId="VVC"){
  let lookups=0,previewFallbacks=0,authenticated=0,response=null,status=null;
  const canonical={
    city:{status:"DENTRO",assigned:{name:"Villavicencio"}},barrio:{status:"DENTRO",assigned:{name:"PORVENIR"},source:"Oficial"},
    estrato:{status:estratoStatus,assigned:estratoStatus==="DENTRO"?{name:"3"}:null,source:estratoStatus==="DENTRO"?"Oficial":""},
    troncal:{status:"SIN_CAPA"},catalogId
  };
  const google={sheets:()=>({spreadsheets:{values:{batchGet:async()=>({data:{valueRanges:[{values:[]},{values:[]}]}})}}})};
  const mod={exports:{}};
  const fakeRequire=name=>{
    if(name==="googleapis")return{google};
    if(name==="./_core")return{
      gauth:()=>({}),
      verifyUser:async()=>{authenticated++;},
      httpError:(code,status)=>Object.assign(new Error(code),{status})
    };
    if(name==="./_territorial")return{resolveTerritorial:async()=>canonical,TERRITORIAL_VERSION:"3.4"};
    if(name==="./_estratos-precalc")return{
      lookupReference:async()=>{
        lookups++;
        if(failReference)throw Error("REFERENCE_UNAVAILABLE");
        return{city:"Villavicencio",status:"DENTRO",value:"1",nearby:[],
          source:"MultiPolygon precalculado · QA referencial",canonical:false};
      }
    };
    if(name==="./_territorial-qa")return{resolveQaTerritorial:async()=>{previewFallbacks++;return null;}};
    throw Error("Unexpected require: "+name);
  };
  vm.runInNewContext(source,{module:mod,require:fakeRequire,process:{env:{VERCEL_ENV:env}},
    console:{error:()=>{}}},{filename:"api/exploration.js"});
  const res={setHeader:()=>{},status(v){status=v;return this;},json(v){response=v;return v;}};
  await mod.exports({method:"GET",query:{lat:"4.1557452",lng:"-73.6268849",city:"Villavicencio"}},res);
  assert.equal(status,200);
  assert.equal(authenticated,1,"authentication must remain mandatory");
  assert.equal(response.ok,true);
  assert.equal(response.city,"Villavicencio");
  assert.equal(response.barrio,"PORVENIR");
  assert.equal(response.estratoStatus,estratoStatus);
  assert.equal(response.estrato,estratoStatus==="DENTRO"?"3":"","never assign reference as canonical");
  assert.equal(response.qaTerritorial,null,"canonical city book retains priority");
  return{lookups,previewFallbacks,reference:response.qaStratum};
}
(async()=>{
  const prod=await check("production");
  assert.equal(prod.lookups,1);
  assert.equal(prod.reference?.value,"1");
  assert.equal(prod.reference?.canonical,false);
  const preview=await check("preview");
  assert.equal(preview.lookups,1);
  assert.equal(preview.reference?.value,"1");
  const dev=await check("development");
  assert.equal(dev.lookups,0);
  assert.equal(dev.reference,null);
  const canonical=await check("production","DENTRO");
  assert.equal(canonical.reference,null,"do not replace canonical stratum");
  const fallback=await check("production","SIN_CAPA",true);
  assert.equal(fallback.reference,null,"Drive failure degrades gracefully without inventing assignment");
  console.log("FO-CHG-072: Production/Preview reference, auth, official precedence, failure isolation PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
