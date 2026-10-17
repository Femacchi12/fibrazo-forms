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
function componentBox(coords){
  let minLon=Infinity,minLat=Infinity,maxLon=-Infinity,maxLat=-Infinity;
  for(const ring of coords)for(const p of ring){
    const x=p[0],y=p[1];
    if(x<minLon)minLon=x;if(x>maxLon)maxLon=x;
    if(y<minLat)minLat=y;if(y>maxLat)maxLat=y;
  }
  return [minLon,minLat,maxLon,maxLat];
}
function intersects(a,b){return !(a[2]<b[0]||a[0]>b[2]||a[3]<b[1]||a[1]>b[3]);}
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
        polygons:f.geometry.coordinates.map(coords=>({coords,box:componentBox(coords)}))};
    });
    parsed.set(key,{rows,expires:Date.now()+TTL});
    return rows;
  })();
  inflight.set(key,job);
  try{return await job;}finally{inflight.delete(key);}
}
async function handle(auth,req,res,city,bbox,zoom){
  if(Number.isFinite(zoom)&&zoom<11)return res.status(200).json({
    ok:true,layer:"estratos",requiresZoom:true,minZoom:11,
    truncated:false,totalVisible:0,features:[]
  });
  // The full geometry is kept for detailed zoom. Reduced vertex counts for
  // distant views are strictly visualization-only and do not bridge gaps.
  const detail=zoom>=15?"full":zoom>=13?"medio":"general";
  const rows=await load(auth,city,detail);
  const visible=rows.map(row=>({...row,polygons:row.polygons.filter(p=>intersects(p.box,bbox))}));
  const components=visible.reduce((n,row)=>n+row.polygons.length,0);
  if(String(req.query.mode||"geometry").toLowerCase()==="index"){
    return res.status(200).json({
      ok:true,mode:"index",layer:"estratos",scope:"AMB_"+city+"_PRECALCULATED",
      minZoom:11,requiresZoom:false,truncated:false,totalVisible:components,
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
    geometry:{type:"MultiPolygon",coordinates:row.polygons.map(p=>p.coords)}
  }));
  const payload={
    ok:true,mode:"geometry",layer:"estratos",scope:"AMB_"+city+"_PRECALCULATED",
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
