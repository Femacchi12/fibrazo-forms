// FO-CHG-052 · QA-only, offline-precomputed AMB stratum geometries.
// The original 03_ESTRATOS WKT remains the only authoritative territorial source.
// Display optimizations never change point-in-polygon classification.
const {google}=require("googleapis");
const AdmZip=require("adm-zip");
const {gzipSync}=require("node:zlib");
const ARCHIVE_ID="11T-x0QBB9W1GYUf0AaAvB9f5yvsLIGfJ";
const VERSION="20261017-municipal-precalc01";
const CITIES={
  bucaramanga:"Bucaramanga",
  floridablanca:"Floridablanca",
  giron:"Girón",
  piedecuesta:"Piedecuesta"
};
const TTL=10*60*1000;
let archiveValue=null,archiveExpiry=0,archiveJob=null;
const parsed=new Map(),inflight=new Map();
function norm(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}
function target(query){
  if(String(query?.qaDissolve||"")!=="1")return null;
  const parts=String(query?.cities||"").split(",").map(norm).filter(Boolean);
  return parts.length===1&&CITIES[parts[0]]?parts[0]:null;
}
async function archive(auth){
  if(archiveValue&&archiveExpiry>Date.now())return archiveValue;
  if(archiveJob)return archiveJob;
  const job=(async()=>{
    const drive=google.drive({version:"v3",auth});
    const rsp=await drive.files.get({fileId:ARCHIVE_ID,alt:"media",supportsAllDrives:true},{responseType:"arraybuffer"});
    const zip=new AdmZip(Buffer.from(rsp.data));
    if(!zip.getEntry("AMB/manifest.json"))throw Error("AMB_PRECOMPUTED_MANIFEST_MISSING");
    archiveValue=zip;archiveExpiry=Date.now()+TTL;
    return zip;
  })();
  archiveJob=job;
  try{return await job;}finally{archiveJob=null;}
}
async function load(auth,city,detail){
  const key=city+"/"+detail,cached=parsed.get(key);
  if(cached&&cached.expires>Date.now())return cached.rows;
  if(inflight.has(key))return inflight.get(key);
  const job=(async()=>{
    const zip=await archive(auth),entry=zip.getEntry("AMB/"+city+"/"+detail+".geojson");
    if(!entry)throw Error("AMB_PRECOMPUTED_CITY_OR_DETAIL_MISSING:"+key);
    const geo=JSON.parse(zip.readAsText(entry));
    if(geo?.type!=="FeatureCollection"||!Array.isArray(geo.features)||geo.features.length<4)throw Error("AMB_PRECOMPUTED_INVALID_COLLECTION:"+key);
    const rows=geo.features.map(f=>{
      const estrato=String(f.properties?.estrato||"");
      if(!/^[1-6]$/.test(estrato)||f.geometry?.type!=="MultiPolygon")throw Error("AMB_PRECOMPUTED_INVALID_STRATUM");
      return {estrato,originalCount:Number(f.properties.originalCount||0),
        polygons:f.geometry.coordinates};
    });
    parsed.set(key,{rows,expires:Date.now()+TTL});
    return rows;
  })();
  inflight.set(key,job);
  try{return await job;}finally{inflight.delete(key);}
}
async function handle(auth,req,res,city,bbox,zoom){
  // FO-CHG-054: prove the full MultiPolygon delivery without viewport clipping.
  // This QA test intentionally transfers each municipal stratum in its entirety;
  // Leaflet is responsible for viewport clipping when drawing. No lossy LOD.
  const detail="full";
  const visible=await load(auth,city,detail);
  const components=visible.reduce((n,row)=>n+row.polygons.length,0);
  if(String(req.query.mode||"geometry").toLowerCase()==="index"){
    return res.status(200).json({
      ok:true,mode:"index",layer:"estratos",scope:"AMB_"+city+"_PRECALCULATED",
      minZoom:11,requiresZoom:false,truncated:false,totalVisible:components,
      delivery:"FULL_CITY_MULTIPOLYGON",
      items:["1","2","3","4","5","6"].map(value=>({
        value,count:visible.find(row=>row.estrato===value)?.polygons.length||0
      }))
    });
  }
  const selected=new Set(String(req.query.estratos||"").split(",").map(s=>s.trim()));
  const chosen=visible.filter(row=>selected.has(row.estrato)&&row.polygons.length);
  const features=chosen.map(row=>({
    type:"Feature",id:"AMB_"+city+"_E"+row.estrato,
    properties:{id:"AMB_"+city+"_E"+row.estrato,layer:"estratos",
      name:"Estrato "+row.estrato,estrato:row.estrato,
      municipio:CITIES[city],originalCount:row.originalCount,
      source:"FIBRAZO_Territorial_Bucaramanga_AMB · offline dissolve · QA",
      quality:"VALIDADO_DERIVADO_VISUAL",qaOptimized:true,
      geometryVersion:VERSION,detail},
    geometry:{type:"MultiPolygon",coordinates:row.polygons}
  }));
  const payload={
    ok:true,mode:"geometry",layer:"estratos",scope:"AMB_"+city+"_PRECALCULATED",
    delivery:"FULL_CITY_MULTIPOLYGON",viewportFiltered:false,
    requiresZoom:false,minZoom:11,displayMode:"PRECALCULADA",precomputed:true,
    qaOptimized:true,geometryVersion:VERSION,detail,truncated:false,pageCount:1,
    originalFeatureCount:chosen.reduce((n,row)=>n+row.originalCount,0),
    totalVisible:chosen.reduce((n,row)=>n+row.polygons.length,0),
    optimizedFeatureCount:features.length,features
  };
  const gz=gzipSync(Buffer.from(JSON.stringify(payload)),{level:5});
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Encoding","gzip");
  res.setHeader("Vary","Accept-Encoding");
  res.setHeader("X-Fibrazo-Layer-Mode","AMB_QA_PRECALCULATED");
  return res.status(200).send(gz);
}
module.exports={target,handle};
