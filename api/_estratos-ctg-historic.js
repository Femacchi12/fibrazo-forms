// FO-CHG-056: historical Cartagena 2022 strata for VISUAL QA only.
// Historical source is marked Preferida_Analisis=FALSE; never use for
// authoritative territorial point classification or production.
const {google}=require("googleapis");
const AdmZip=require("adm-zip");
const {gzipSync}=require("node:zlib");
const ARCHIVE="1iM1ClOL205PTpPekbn3apTpGCiPTGJe5";
const SOURCE="CARTAGENA/CARTAGENA_estratos_unificados_historicos_2022.geojson";
const TTL=10*60*1000;
let cache=null,expires=0,loading=null;
function target(query){
  const cities=String(query?.cities||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  return cities.length===1&&cities[0]==="cartagena";
}
async function source(auth){
  if(cache&&expires>Date.now())return cache;
  if(loading)return loading;
  const job=(async()=>{
    const drive=google.drive({version:"v3",auth});
    const reply=await drive.files.get({fileId:ARCHIVE,alt:"media",supportsAllDrives:true},{responseType:"arraybuffer"});
    const zip=new AdmZip(Buffer.from(reply.data));
    const entry=zip.getEntry(SOURCE);
    if(!entry)throw Error("CARTAGENA_HISTORICAL_QA_ASSET_MISSING");
    const geo=JSON.parse(zip.readAsText(entry));
    if(geo.type!=="FeatureCollection"||!Array.isArray(geo.features)||geo.features.length!==6)throw Error("CARTAGENA_HISTORICAL_QA_INVALID");
    if(geo.features.some(f=>f.properties?.quality!=="HISTORICO_2022_NO_VIGENTE"||f.geometry?.type!=="MultiPolygon"))throw Error("CARTAGENA_HISTORICAL_QA_PROVENANCE");
    cache=geo.features;expires=Date.now()+TTL;return cache;
  })();
  loading=job;
  try{return await job;}finally{loading=null;}
}
async function handle(auth,req,res){
  const rows=await source(auth);
  const counts=["1","2","3","4","5","6"].map(value=>{
    const f=rows.find(row=>String(row.properties.estrato)===value);
    return {value,count:f?f.geometry.coordinates.length:0};
  });
  if(String(req.query.mode||"geometry")==="index"){
    return res.status(200).json({
      ok:true,mode:"index",layer:"estratos",scope:"CARTAGENA_HISTORICAL_2022_QA",
      minZoom:11,requiresZoom:false,truncated:false,
      qaHistorical:true,sourceYear:2022,canonical:false,
      totalVisible:counts.reduce((n,r)=>n+r.count,0),items:counts
    });
  }
  const selected=new Set(String(req.query.estratos||"").split(",").map(x=>x.trim()));
  const features=rows.filter(f=>selected.has(String(f.properties.estrato)));
  const payload={
    ok:true,mode:"geometry",layer:"estratos",scope:"CARTAGENA_HISTORICAL_2022_QA",
    minZoom:11,requiresZoom:false,truncated:false,
    displayMode:"PRECALCULADA_HISTORICA",delivery:"FULL_CITY_MULTIPOLYGON",
    viewportFiltered:false,qaOptimized:true,precomputed:true,
    qaHistorical:true,sourceYear:2022,canonical:false,
    warning:"Estratos históricos de Cartagena (2022). Solo referencia visual QA; vigencia no validada.",
    originalFeatureCount:features.reduce((n,f)=>n+Number(f.properties.originalCount||0),0),
    totalVisible:features.reduce((n,f)=>n+f.geometry.coordinates.length,0),
    optimizedFeatureCount:features.length,features
  };
  const gz=gzipSync(Buffer.from(JSON.stringify(payload)),{level:5});
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Encoding","gzip");
  res.setHeader("Vary","Accept-Encoding");
  res.setHeader("X-Fibrazo-Layer-Mode","CARTAGENA_HISTORICAL_2022_QA");
  return res.status(200).send(gz);
}
module.exports={target,handle};
