"use strict";
const assert=require("node:assert/strict");
const Module=require("node:module");

const originalLoad=Module._load;
const calls=[];
const citySheetId="SHEET_NEIVA_QA";

const sheets={spreadsheets:{values:{
  async get({spreadsheetId,range}){
    calls.push({method:"get",spreadsheetId,range});
    assert.match(range,/01_CIUDADES/);
    return {data:{values:[
      ["ID_Ciudad","Ciudad","Municipios_Ambito","Archivo_Territorial_URL","Estado_Archivo"],
      ["NVA","Neiva","Neiva",`https://docs.google.com/spreadsheets/d/${citySheetId}/edit`,"QA_ESTRATOS"]
    ]}};
  },
  async batchGet({spreadsheetId,ranges}){
    calls.push({method:"batchGet",spreadsheetId,ranges});
    assert.equal(spreadsheetId,citySheetId,"la capa debe leerse desde la hoja de Neiva");
    return {data:{valueRanges:[
      {values:[
        ["ID_Barrio","Ciudad","Barrio","Comuna_Localidad","Area_m2","Area_ha","Poblacion","Hogares","Densidad","Fuente_tipo","Fuente_nombre","Fuente_URL","Año_Vigencia","Preferida_Analisis"],
        ["NVA_BARR_0001","Neiva","CENTRO","COMUNA 4","","","","","","TECNICO_POT_GIS","POT Neiva","https://example.test/neiva","2019",true]
      ]},
      {values:[
        ["Min_Lon","Min_Lat","Max_Lon","Max_Lat","Codigo_Origen","Estado_Calidad"],
        [-75.30,2.90,-75.20,3.00,"1","VALIDADO_TECNICO_POT_NEIVA"]
      ]}
    ]}};
  }
}}};

Module._load=function(request,parent,isMain){
  if(request==="googleapis")return {google:{sheets:()=>sheets}};
  if(request==="./_core"&&parent?.filename?.endsWith("api/map-polygons.js"))return {
    gauth:()=>({}),
    verifyUser:async()=>({email:"qa@fibrazo.com"}),
    loadForms:async()=>[],
    userCapabilities:async()=>({adminActive:true}),
    canUseDashboard:()=>true,
    httpError:(message,status)=>Object.assign(new Error(message),{status})
  };
  if(request==="./_territorial"&&parent?.filename?.endsWith("api/map-polygons.js"))return {
    TERRITORIAL_MASTER_SHEET_ID:"MASTER_QA",
    _internals:{parseWkt:()=>[]}
  };
  return originalLoad(request,parent,isMain);
};

const handler=require("../api/map-polygons");
Module._load=originalLoad;

(async()=>{
  const req={method:"GET",query:{
    layer:"barrios",mode:"index",scope:"all",cities:"Neiva",
    bbox:"-75.4,2.8,-75.1,3.1",zoom:"12"
  }};
  const res={
    headers:{},statusCode:200,body:null,
    setHeader(name,value){this.headers[name]=value;},
    status(value){this.statusCode=value;return this;},
    json(value){this.body=value;return value;}
  };
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.scope,"NVA_ALL");
  assert.equal(res.body.totalVisible,1);
  assert.equal(res.body.items[0].name,"CENTRO");
  assert.ok(calls.some(call=>call.method==="batchGet"&&call.spreadsheetId===citySheetId));
  console.log("PASS: /api/map-polygons selecciona la hoja territorial QA de Neiva.");
})().catch(error=>{console.error(error);process.exitCode=1;});
