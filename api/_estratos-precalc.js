// FO-CHG-049 · QA layer, NOT a canonical classification source.
const {google}=require("googleapis");
const AdmZip=require("adm-zip");
const {gzipSync}=require("node:zlib");
const approved=require("./strata-kmz-approved.json");
const ARCHIVE=approved.archiveId;
const CITIES={neiva:["NEIVA","Neiva"],villavicencio:["VILLAVICENCIO","Villavicencio"],ibague:["IBAGUE","Ibagué"]};
const cache=new Map(),pending=new Map(),TTL=600000;
let zipCached=null,zipUntil=0,zipPending=null;
async function archive(auth){
  if(zipCached&&zipUntil>Date.now())return zipCached;
  if(zipPending)return zipPending;
  const work=(async()=>{
    const drive=google.drive({version:"v3",auth});
    const response=await drive.files.get({fileId:ARCHIVE,alt:"media",supportsAllDrives:true},{responseType:"arraybuffer"});
    const bytes=Buffer.from(response.data);
    if(require("crypto").createHash("sha256").update(bytes).digest("hex")!==approved.archiveSha256)throw Error("STRATA_APPROVED_ARCHIVE_CHANGED");
    zipCached=new AdmZip(bytes);
    zipUntil=Date.now()+TTL;
    return zipCached;
  })();
  zipPending=work;
  try{return await work;}finally{zipPending=null;}
}
function norm(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}
function target(query){
  const parts=String(query?.cities||"").split(",").map(norm).filter(Boolean);
  return parts.length===1&&CITIES[parts[0]]?CITIES[parts[0]]:null;
}
async function load(auth,city){
  const current=cache.get(city[0]);if(current&&current.until>Date.now())return current.data;
  if(pending.has(city[0]))return pending.get(city[0]);
  const job=(async()=>{
    const zip=await archive(auth);
    const entry=zip.getEntry(city[0]+"/"+city[0]+"_estratos_unificados.geojson");
    if(!entry)throw Error("CITY_ZIP_ENTRY_NOT_FOUND");
    const geo=JSON.parse(zip.readAsText(entry));
    if(geo.type!=="FeatureCollection"||geo.features.length!==3)throw Error("INVALID_CITY_STRATA");
    const data=geo.features.map(f=>{
      const estrato=String(f.properties?.estrato||"");
      if(!["1","2","3"].includes(estrato)||f.geometry?.type!=="MultiPolygon")throw Error("INVALID_CITY_GEOMETRY");
      return {estrato,originalCount:Number(f.properties?.cantidad)||0,
        polygons:f.geometry.coordinates};
    });
    cache.set(city[0],{until:Date.now()+TTL,data});return data;
  })();
  pending.set(city[0],job);
  try{return await job;}finally{pending.delete(city[0]);}
}
async function handle(auth,req,res,city,bbox,zoom){
  // QA unified-city test: load full precomputed geometry only once per city.
  // The map keeps it on navigation; no bbox/zoom dependent downloads.
  const visible=await load(auth,city);
  const count=visible.reduce((sum,r)=>sum+r.polygons.length,0);
  if(String(req.query.mode||"geometry")==="index")return res.status(200).json({
    ok:true,mode:"index",layer:"estratos",scope:city[0]+"_QA_PRECALCULATED",
    minZoom:11,requiresZoom:false,totalVisible:count,
    delivery:"FULL_CITY_MULTIPOLYGON",
    items:["1","2","3","4","5","6"].map(value=>({
      value,count:visible.find(r=>r.estrato===value)?.polygons.length||0
    }))
  });
  const selected=new Set(String(req.query.estratos||"").split(","));
  const chosen=visible.filter(r=>selected.has(r.estrato)&&r.polygons.length);
  const features=chosen.map(row=>({
    type:"Feature",id:city[0]+"_QA_E"+row.estrato,
    properties:{id:city[0]+"_QA_E"+row.estrato,layer:"estratos",
      name:"Estrato "+row.estrato,estrato:row.estrato,municipio:city[1],
      originalCount:row.originalCount,qaOptimized:true,
      source:"KMZ FIBRAZO aprobado · GeoJSON unificado · "+approved.version,quality:"VALIDADO_FIBRAZO_KMZ",canonical:true,sourceVersion:approved.version},
    geometry:{type:"MultiPolygon",coordinates:row.polygons}
  }));
  const payload={ok:true,mode:"geometry",layer:"estratos",
    scope:city[0]+"_QA_PRECALCULATED",requiresZoom:false,minZoom:11,
    delivery:"FULL_CITY_MULTIPOLYGON",viewportFiltered:false,
    truncated:false,totalVisible:chosen.reduce((sum,r)=>sum+r.polygons.length,0),
    displayMode:"PRECALCULADA",qaOptimized:true,precomputed:true,
    originalFeatureCount:chosen.reduce((sum,r)=>sum+r.polygons.length,0),
    optimizedFeatureCount:features.length,features};
  // Always return all visible components, gzip avoids the Vercel 4.5 MB payload cap.
  const gz=gzipSync(Buffer.from(JSON.stringify(payload)),{level:5});
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Encoding","gzip");
  res.setHeader("Vary","Accept-Encoding");
  res.setHeader("X-Fibrazo-Layer-Mode","QA_PRECALCULATED");
  return res.status(200).send(gz);
}
// FO-CHG-061 · QA-only reference lookup for a coordinate, using the same
// precalculated MultiPolygon that the map already displays. This is NOT
// a canonical layer and must never silently become an operational classification.
// Bounds verified against the same full-city geometry files (EPSG:4326).
// This also lets map coordinate lookups resolve a QA city when no city query
// parameter has been selected. Bbox is ONLY a routing hint, never an assignment.
const QA_BOUNDS={
  neiva:[-75.30873,2.88679,-75.23607,2.98355],
  villavicencio:[-73.68194,4.05401,-73.53184,4.18334],
  ibague:[-75.27257,4.37572,-75.11994,4.46509]
};
const NEAR_LIMIT_M=25;
function referenceResult(rows,lat,lon){
  const {inGeometry,geometryDistance}=require("./_territorial")._internals;
  const matching=rows.filter(row=>inGeometry(lon,lat,row.polygons));
  if(matching.length===1)return{status:"DENTRO",value:matching[0].estrato,nearby:[],distanceM:0};
  if(matching.length>1)return{status:"AMBIGUO",value:"",nearby:[],distanceM:0};
  const ranked=rows.map(row=>({
    estrato:row.estrato,
    distanceM:Math.round(geometryDistance(lon,lat,row.polygons)*10)/10
  })).filter(item=>Number.isFinite(item.distanceM)).sort((a,b)=>a.distanceM-b.distanceM);
  const closest=ranked[0]?.distanceM<=5000?ranked[0]:null;
  return{
    status:"FUERA",value:"",
    nearby:ranked.filter(item=>item.distanceM<=NEAR_LIMIT_M),
    closest,
    distanceM:closest?closest.distanceM:null
  };
}
async function lookupReference(auth,latValue,lonValue,cityName=""){
  const lat=Number(latValue),lon=Number(lonValue);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const requested=norm(cityName);
  // If city is provided, require that it matches the actual city footprint.
  // Without a city hint, infer from non-overlapping validated QA extents.
  const candidates=Object.entries(CITIES).filter(([key,city])=>{
    if(requested&&norm(city[1])!==requested&&key!==requested)return false;
    const [minLon,minLat,maxLon,maxLat]=QA_BOUNDS[key];
    return lon>=minLon&&lon<=maxLon&&lat>=minLat&&lat<=maxLat;
  });
  if(candidates.length!==1)return null;
  const city=candidates[0][1];
  const rows=await load(auth,city);
  return{
    city:city[1],...referenceResult(rows,lat,lon),
    source:"MultiPolygon precalculado · QA referencial · no canónico",
    canonical:false
  };
}
module.exports={target,handle,lookupReference,load,_internals:{referenceResult}};
