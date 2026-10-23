const assert=require('node:assert/strict'),Module=require('node:module'),crypto=require('node:crypto'),Zip=require('adm-zip');
const originalLoad=Module._load,approved=require('../api/strata-kmz-approved.json');
const rectangle=(a,b,c,d)=>[[[a,c],[b,c],[b,d],[a,d],[a,c]]];
const geo={type:'FeatureCollection',features:[
 {type:'Feature',properties:{estrato:'1',cantidad:1},geometry:{type:'MultiPolygon',coordinates:[[...rectangle(-75.8,-75.7,2.5,2.6),...rectangle(-75.78,-75.77,2.52,2.53)]]}},
 {type:'Feature',properties:{estrato:'2',cantidad:1},geometry:{type:'MultiPolygon',coordinates:[rectangle(-75.6,-75.5,2.5,2.6)]}},
 {type:'Feature',properties:{estrato:'3',cantidad:1},geometry:{type:'MultiPolygon',coordinates:[rectangle(-75.55,-75.45,2.5,2.6)]}}
]};
const zip=new Zip();for(const c of ['NEIVA','VILLAVICENCIO','IBAGUE'])zip.addFile(c+'/'+c+'_estratos_unificados.geojson',Buffer.from(JSON.stringify(geo)));
const bytes=zip.toBuffer(),fixtureManifest={...approved,archiveSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
let downloads=0,corrupt=false;
const cityWkt='POLYGON ((-76 2,-75 2,-75 3,-76 3,-76 2))';
const google={drive:()=>({files:{get:async()=>{downloads++;return{data:corrupt?Buffer.from('corrupt'):bytes};}}}),sheets:()=>({spreadsheets:{values:{
 get:async()=>({data:{values:[['ID_Ciudad','Ciudad','Municipios_Ambito','Estado_Archivo','Archivo_Territorial_URL'],['NVA','Neiva','Neiva','ACTIVO','https://docs.google.com/spreadsheets/d/FIXTURE/edit']]}}),
 batchGet:async args=>({data:{valueRanges:args.ranges.length===3?[{values:[['ID_Ciudad_Poligono','Municipio','WKT','Preferida_Analisis','Min_Lon','Min_Lat','Max_Lon','Max_Lat','Estado_Calidad'],['CITY','Neiva',cityWkt,'TRUE',-76,2,-75,3,'VALIDADO']]},{values:[]},{values:[]}]:args.ranges.map(()=>({values:[]}))}})
}}})};
Module._load=function(name,parent,isMain){if(name==='googleapis')return{google};if(name==='./strata-kmz-approved.json')return fixtureManifest;return originalLoad.call(this,name,parent,isMain);};
(async()=>{
 const {lookup}=require('../api/_strata-kmz-canonical');
 for(const id of ['NVA','VVC','IBG'])for(const [lng,value]of [[-75.75,'1'],[-75.58,'2'],[-75.48,'3']]){const r=await lookup({},2.55,lng,id);assert.equal(r.assigned.name,value);assert.equal(r.canonical,true);assert.equal(r.municipalCertification,false);}
 assert.equal(downloads,1,'shared immutable archive cached across cities');
 for(const [lat,lng,status]of [[2.55,-75.53,'AMBIGUO'],[2.2,-75.2,'FUERA'],[2.525,-75.775,'FUERA']]){const r=await lookup({},lat,lng,'NVA');assert.equal(r.status,status);assert.equal(r.assigned,null);}
 assert.equal(await lookup({},2.55,-75.75,'BUC_AMB'),null);
 const t=await require('../api/_territorial').resolveTerritorial({},2.55,-75.58,{cityHint:'Neiva'});assert.equal(t.city.status,'DENTRO');assert.equal(t.estrato.status,'DENTRO');assert.equal(t.estrato.assigned.name,'2');assert.equal(t.barrio.status,'SIN_CAPA');
 corrupt=true;delete require.cache[require.resolve('../api/_estratos-precalc')];await assert.rejects(()=>lookup({},2.55,-75.75,'NVA'),/STRATA_APPROVED_ARCHIVE_CHANGED/);
 console.log('PASS approved KMZ: nine city/stratum controls, cached archive, holes/outside/overlap, unchanged other catalogs, real engine routing and hash mismatch rejection');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=originalLoad;});
