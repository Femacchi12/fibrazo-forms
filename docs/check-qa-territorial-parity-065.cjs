// FO-CHG-065: QA territory uses the same geometric truth as canonical,
 // without registering pilot layers as canonical or changing production.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {inGeometry}=require("../api/_territorial")._internals;
const {resolveQaTerritorial,_internals}=require("../api/_territorial-qa");
const {referenceCity,shape,validBox,inside,empty}= _internals;
const rectangle=[[[
  [-75.3,2.90],[-75.25,2.90],[-75.25,2.97],[-75.3,2.97],[-75.3,2.90]
]]];
const city={id:"TEST_DANE",name:"Neiva",source:"DANE QA",polygons:rectangle};
assert.equal(inGeometry(-75.28,2.93,rectangle),true);
const exact=referenceCity(city,2.93,-75.28);
assert.equal(exact.status,"DENTRO");assert.equal(exact.assigned.name,"Neiva");
assert.equal(exact.canonical,false);assert.equal(exact.distanceM,0);
assert.equal(referenceCity(city,2.99,-75.28).status,"FUERA");
assert.equal(referenceCity(city,20,-75).status,"FUERA_COBERTURA");
assert.equal(validBox(shape(["-75,3","2,90","-75,25","2,97"])),true);
assert.equal(validBox(shape(["","2,90","-75,25","2,97"])),false);
assert.equal(empty("SIN_CAPA").canonical,false);
assert.equal(typeof resolveQaTerritorial,"function");
assert.equal(Object.keys(_internals.PILOTS).length,3);
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const map=read("map-v01.js"),api=read("api/exploration.js"),form=read("ux-v04.js");
assert.ok(api.includes("process.env.VERCEL_ENV===\"preview\""));
assert.ok(api.includes("qaTerritorial:pilotCandidate"));
assert.ok(map.includes('layerRow(data,"city","Ciudad / municipio")'));
assert.ok(map.includes('layerRow(data,"barrio","Barrio")'));
assert.ok(map.includes('referenceStratumRow(data)'));
assert.ok(map.includes("QA referencial (no canónico)"));
assert.ok(map.includes('Number(lat).toFixed(7)+","+Number(lng).toFixed(7)'));
assert.ok(api.includes('const ispCity=city||qaCity||cityNearby||hint;'));
assert.ok(form.includes('QA_DENTRO')&&form.includes('coincidencia exacta QA (no canónica)'));
assert.ok(form.includes("refreshQaNeighborhood()"));
assert.ok(form.includes("invalidateTerritorialOnCoordinateChange("));
assert.ok(form.includes('qaBarrioSession'));
assert.ok(form.includes("canonicalBarrioStatus"));
assert.ok(map.includes('canonical?.status==="DENTRO"'));
assert.ok(form.includes("canonicalBarrioStatus"));
assert.ok(form.includes('if(!payload.isTest&&String(payload.location?.barrioStatus||"").startsWith("QA_"))'));
console.log("FO-CHG-065: city/barrio geometry, normalized presentation and QA safeguards PASS");
