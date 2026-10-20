"use strict";
const assert=require("node:assert/strict");
const Module=require("node:module");

const originalLoad=Module._load;
const calls=[];
const sources={
  Neiva:{id:"NVA",sheet:"SHEET_NEIVA",prefix:"NVA",name:"CENTRO"},
  Villavicencio:{id:"VVC",sheet:"SHEET_VILLAVICENCIO",prefix:"VVC",name:"BARZAL"},
  "Ibagué":{id:"IBG",sheet:"SHEET_IBAGUE",prefix:"IBG",name:"LA POLA"}
};

const sheets={spreadsheets:{values:{
  async get({spreadsheetId,range}){
    calls.push({method:"get",spreadsheetId,range});
    assert.equal(spreadsheetId,"MASTER_TERRITORIAL");
    assert.match(range,/01_CIUDADES/);
    return {data:{values:[
      ["ID_Ciudad","Ciudad","Municipios_Ambito","Archivo_Territorial_URL","Estado_Archivo"],
      ...Object.entries(sources).map(([city,item])=>[
        item.id,city,city,`https://docs.google.com/spreadsheets/d/${item.sheet}/edit`,"ACTIVO"
      ])
    ]}};
  },
  async batchGet({spreadsheetId,ranges}){
    calls.push({method:"batchGet",spreadsheetId,ranges});
    const source=Object.entries(sources).find(([,item])=>item.sheet===spreadsheetId);
    assert.ok(source,"la capa debe leerse desde la hoja territorial de la ciudad solicitada");
    const [city,item]=source;
    assert.ok(ranges.every(range=>range.startsWith("02_BARRIOS!")));
    if(ranges.every(range=>/^02_BARRIOS!O\d+:O\d+$/.test(range))){
      return {data:{valueRanges:ranges.map(()=>({values:[
        ["POLYGON ((-75.4 2.8, -73 2.8, -73 4.8, -75.4 4.8, -75.4 2.8))"]
      ]}))}};
    }
    return {data:{valueRanges:[
      {values:[
        ["ID_Barrio","Ciudad","Barrio","Comuna_Localidad","Area_m2","Area_ha","Poblacion","Hogares","Densidad","Fuente_tipo","Fuente_nombre","Fuente_URL","Año_Vigencia","Preferida_Analisis"],
        [`${item.prefix}_BARR_0001`,city,item.name,"1","","","","","","TECNICO_GIS","Fuente","https://example.test",2026,true]
      ]},
      {values:[
        ["Min_Lon","Min_Lat","Max_Lon","Max_Lat","Codigo_Origen","Estado_Calidad"],
        [-75.4,2.8,-73.0,4.8,"1","VALIDADO_TECNICO"]
      ]}
    ]}};
  }
}}};

Module._load=function(request,parent,isMain){
  if(request==="googleapis")return {google:{sheets:()=>sheets}};
  if(request==="./_core"&&parent?.filename?.replaceAll(String.fromCharCode(92),"/").endsWith("api/map-polygons.js"))return {
    gauth:()=>({}),verifyUser:async()=>({email:"qa@fibrazo.com"}),loadForms:async()=>[],
    userCapabilities:async()=>({adminActive:true}),canUseDashboard:()=>true,
    httpError:(message,status)=>Object.assign(new Error(message),{status})
  };
  if(request==="./_territorial"&&parent?.filename?.replaceAll(String.fromCharCode(92),"/").endsWith("api/map-polygons.js"))return {
    TERRITORIAL_MASTER_SHEET_ID:"MASTER_TERRITORIAL",_internals:{parseWkt:()=>[[[
      [-75.4,2.8],[-73,2.8],[-73,4.8],[-75.4,4.8],[-75.4,2.8]
    ]]]}
  };
  return originalLoad(request,parent,isMain);
};

const handler=require("../api/map-polygons");
Module._load=originalLoad;

function response(){
  return {headers:{},statusCode:200,body:null,setHeader(name,value){this.headers[name]=value;},
    status(value){this.statusCode=value;return this;},json(value){this.body=value;return value;}};
}

(async()=>{
  for(const [city,item] of Object.entries(sources)){
    const req={method:"GET",query:{layer:"barrios",mode:"index",scope:"all",cities:city,
      bbox:"-76,2,-72,5",zoom:"12"}};
    const res=response();
    await handler(req,res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.scope,item.id+"_ALL");
    assert.equal(res.body.totalVisible,1);
    assert.equal(res.body.items[0].name,item.name);
    assert.ok(calls.some(call=>call.method==="batchGet"&&call.spreadsheetId===item.sheet));
  }
  const geometryRes=response();
  await handler({method:"GET",query:{layer:"barrios",mode:"geometry",cities:"Neiva",
    bbox:"-76,2,-72,5",zoom:"12",allBarrios:"1",fullCoverage:"1"}},geometryRes);
  assert.equal(geometryRes.statusCode,200);
  assert.equal(geometryRes.body.scope,"NVA");
  assert.equal(geometryRes.body.features.length,1);
  assert.equal(geometryRes.body.features[0].properties.name,"CENTRO");
  assert.ok(calls.some(call=>call.method==="batchGet"&&call.spreadsheetId==="SHEET_NEIVA"&&
    call.ranges.some(range=>/^02_BARRIOS!O\d+:O\d+$/.test(range))));
  console.log("PASS: /api/map-polygons selecciona y dibuja desde las hojas de Neiva, Villavicencio e Ibagué.");
})().catch(error=>{console.error(error);process.exitCode=1;});

