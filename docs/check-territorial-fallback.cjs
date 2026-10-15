"use strict";
const assert=require("node:assert/strict");
const {resolveCityItems}=require("../api/_territorial")._internals;

function rectangle(name,minLon,minLat,maxLon,maxLat,id){
  const ring=[[minLon,minLat],[maxLon,minLat],[maxLon,maxLat],[minLon,maxLat],[minLon,minLat]];
  return {id,name,minLon,minLat,maxLon,maxLat,polygons:[[ring]],catalog:{id:"CAT_"+id,city:name,fileId:"TEST_"+id}};
}
(async()=>{
  const bucaramanga=rectangle("BUCARAMANGA",-73.17,7.07,-73.09,7.20,"BUC_TEST");
  const cartagena=rectangle("CARTAGENA DE INDIAS",-75.6,10.3,-75.4,10.5,"CTG_TEST");
  const lon=-73.124286,lat=7.133875;

  const correct=await resolveCityItems([cartagena,bucaramanga],lon,lat);
  assert.equal(correct.result.status,"DENTRO");
  assert.equal(correct.result.assigned.name,"BUCARAMANGA");
  assert.equal(correct.catalog.id,"CAT_BUC_TEST");

  const sourceTemporarilyUnavailable=await resolveCityItems([cartagena],lon,lat);
  assert.equal(sourceTemporarilyUnavailable.result.status,"FUERA_COBERTURA");
  assert.equal(sourceTemporarilyUnavailable.catalog,null);
  assert.equal(sourceTemporarilyUnavailable.result.nearby,null);

  const nearby=await resolveCityItems([cartagena,bucaramanga],-73.124286,7.202);
  assert.equal(nearby.result.status,"FUERA");
  assert.equal(nearby.result.nearby.name,"BUCARAMANGA");
  assert.ok(nearby.result.distanceM<20000);

  const noSources=await resolveCityItems([],lon,lat);
  assert.equal(noSources.result.status,"SIN_CAPA");

  console.log("PASS: punto en Bucaramanga; rechazo de Cartagena remota; proximidad local; sin fuente.");
})().catch(error=>{console.error(error);process.exitCode=1;});
