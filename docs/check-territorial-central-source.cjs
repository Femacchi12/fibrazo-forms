"use strict";
// FO-CHG-070 · the form resolves one city workbook, not every territorial file.
const assert=require("node:assert/strict");
const Module=require("node:module");
const fs=require("node:fs"),path=require("node:path");

const originalLoad=Module._load;
const calls=[];
const cityWkt="POLYGON ((-73.70 4.00,-73.50 4.00,-73.50 4.20,-73.70 4.20,-73.70 4.00))";
const barrioWkt="POLYGON ((-73.64 4.12,-73.59 4.12,-73.59 4.17,-73.64 4.17,-73.64 4.12))";
const catalog=[
  ["ID_Ciudad","Ciudad","Municipios_Ambito","Estado_Archivo","Archivo_Territorial_URL"],
  ["VVC","Villavicencio","Villavicencio","ACTIVO","https://docs.google.com/spreadsheets/d/VVC_SHEET/edit"]
];
const bundle=[
  {values:[
    ["ID_Ciudad_Poligono","Municipio","Fuente_nombre","Fuente_URL","Año_Vigencia","WKT","Preferida_Analisis","Min_Lon","Min_Lat","Max_Lon","Max_Lat","Estado_Calidad"],
    ["DANE_MPIO_50001","Villavicencio","DANE","https://dane.gov.co","2025",cityWkt,"TRUE","-73.70","4.00","-73.50","4.20","VALIDADO"]
  ]},
  {values:[
    ["ID_Barrio","Ciudad","Barrio","Fuente_nombre","Fuente_URL","Año_Vigencia"],
    ["VVC_B_001","Villavicencio","Centro","Alcaldía","https://villavicencio.gov.co","2026"]
  ]},
  {values:[
    ["Preferida_Analisis","Min_Lon","Min_Lat","Max_Lon","Max_Lat","Estado_Calidad"],
    ["TRUE","-73.64","4.12","-73.59","4.17","VALIDADO"]
  ]},
  {values:[["ID_Estrato_Poligono","Estrato"]]},
  {values:[["Preferida_Analisis","Min_Lon","Min_Lat","Max_Lon","Max_Lat","Estado_Calidad"]]},
  {values:[["ID_Troncal","Troncal"]]},
  {values:[["Preferida_Analisis","Min_Lon","Min_Lat","Max_Lon","Max_Lat"]]}
];

const values={
  async get(args){
    calls.push({method:"get",...args});
    assert.equal(args.spreadsheetId,"1cVAEv60ZdDTcQoPmmiSbJV_gfhAXKwywbzf0F0WDp_0");
    return {data:{values:catalog}};
  },
  async batchGet(args){
    calls.push({method:"batchGet",...args});
    assert.equal(args.spreadsheetId,"VVC_SHEET");
    if(args.ranges.length===3)return {data:{valueRanges:bundle.slice(0,3)}};
    if(args.ranges.length===4)return {data:{valueRanges:bundle.slice(3)}};
    assert.deepEqual(args.ranges,["02_BARRIOS!O2:O2"]);
    return {data:{valueRanges:[{values:[[barrioWkt]]}]}};
  }
};
Module._load=function(request,parent,isMain){
  if(request==="./_strata-kmz-canonical")return {lookup:async()=>({status:"SIN_CAPA"})}; // isolate city/barrio routing; adopted strata covered by094
  if(request==="googleapis")return {google:{sheets:()=>({spreadsheets:{values}})}};
  return originalLoad.call(this,request,parent,isMain);
};

(async()=>{
  const territorial=require("../api/_territorial");
  const result=await territorial.resolveTerritorial({},4.1412127,-73.614958,{cityHint:"villavicencio"});
  assert.equal(result.version,"3.4");
  assert.equal(result.catalogId,"VVC");
  assert.equal(result.dataSource,"MAESTRO_TERRITORIAL_POR_CIUDAD");
  assert.equal(result.city.status,"DENTRO");
  assert.equal(result.city.assigned.name,"Villavicencio");
  assert.equal(result.barrio.status,"DENTRO");
  assert.equal(result.barrio.assigned.name,"Centro");
  assert.equal(result.estrato.status,"SIN_CAPA");
  assert.equal(result.troncal.status,"SIN_CAPA");
  assert.equal(calls.filter(call=>call.method==="get").length,1,"only the master catalog is read separately");
  assert.equal(calls.filter(call=>call.method==="batchGet").length,3,"one core city read, one optional-layer read and one exact WKT read");
  const requestedRanges=calls.filter(call=>call.method==="batchGet").flatMap(call=>call.ranges);
  assert.ok(requestedRanges.includes("11_POLIGONOS_CIUDAD!A:O"));
  assert.ok(requestedRanges.includes("02_BARRIOS!A:N"));
  assert.ok(requestedRanges.includes("03_ESTRATOS!A:J"));
  assert.ok(requestedRanges.includes("04_TRONCALES!A:I"));
  assert.equal(territorial._internals.catalogForHint([{city:"Ibagué",municipalities:[]}],"ibague").city,"Ibagué");
  const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
  const exploration=read("api/exploration.js"),ui=read("ux-v04.js"),submissions=read("api/submissions.js");
  assert.ok(exploration.includes("resolveTerritorial(auth,lat,lng,{cityHint:hint})"));
  assert.ok(exploration.includes("!territorial.catalogId"),"legacy QA resolver is fallback-only");
  assert.ok(exploration.includes("spreadsheets.values.batchGet"),"competition ranges share one request");
  assert.ok(ui.includes("queryExplorationEnrichment(lat,lng,fallback)"));
  for(const city of ["Neiva","Villavicencio","Ibagué"])assert.ok(ui.includes('{name:"'+city+'"'));
  assert.ok(submissions.includes("cityHint:String(payload.data?.municipio||payload.location?.cityDetected||\"\").trim()"));
  console.log("FO-CHG-070: one city source, grouped layers and exact barrio resolution PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});

