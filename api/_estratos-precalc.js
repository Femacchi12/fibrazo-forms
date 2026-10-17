// FO-CHG-049 · QA layer, NOT a canonical classification source.
const {google}=require("googleapis");
const AdmZip=require("adm-zip");
const {gzipSync}=require("node:zlib");
const ARCHIVE="1iLbZP5F-xJB2DRbXTDM9Mu5IoxvvRmro";
const CITIES={neiva:["NEIVA","Neiva"],villavicencio:["VILLAVICENCIO","Villavicencio"],ibague:["IBAGUE","Ibagué"]};
const cache=new Map(),pending=new Map(),TTL=600000;
function norm(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}
function target(query){
  const parts=String(query?.cities||"").split(",").map(norm).filter(Boolean);
  return parts.length===1&&CITIES[parts[0]]?CITIES[parts[0]]:null;
}
function bounds(coords){
  let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;
  for(const ring of coords)for(const p of ring){const x=p[0],y=p[1];a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);d=Math.max(d,y);}
  return [a,b,c,d];
}
function hits(a,b){return !(a[2]<b[0]||a[0]>b[2]||a[3]<b[1]||a[1]>b[3]);}
async function load(auth,city){
  const current=cache.get(city[0]);if(current&&current.until>Date.now())return current.data;
  if(pending.has(city[0]))return pending.get(city[0]);
  const job=(async()=>{
    const drive=google.drive({version:"v3",auth});
    const r=await drive.files.get({fileId:ARCHIVE,alt:"media",supportsAllDrives:true},{responseType:"arraybuffer"});
    const zip=new AdmZip(Buffer.from(r.data));
    const entry=zip.getEntry(city[0]+"/"+city[0]+"_estratos_unificados.geojson");
    if(!entry)throw Error("CITY_ZIP_ENTRY_NOT_FOUND");
    const geo=JSON.parse(zip.readAsText(entry));
    if(geo.type!=="FeatureCollection"||geo.features.length!==3)throw Error("INVALID_CITY_STRATA");
    const data=geo.features.map(f=>{
      const estrato=String(f.properties?.estrato||"");
      if(!["1","2","3"].includes(estrato)||f.geometry?.type!=="MultiPolygon")throw Error("INVALID_CITY_GEOMETRY");
      return {estrato,originalCount:Number(f.properties?.cantidad)||0,
        polygons:f.geometry.coordinates.map(coords=>({coords,bbox:bounds(coords)}))};
    });
    cache.set(city[0],{until:Date.now()+TTL,data});return data;
  })();
  pending.set(city[0],job);
  try{return await job;}finally{pending.delete(city[0]);}
}
async function handle(auth,req,res,city,bbox,zoom){
  if(Number.isFinite(zoom)&&zoom<11)return res.status(200).json({
    ok:true,layer:"estratos",requiresZoom:true,minZoom:11,truncated:false,totalVisible:0,features:[]
  });
  const data=await load(auth,city);
  const visible=data.map(row=>({...row,polygons:row.polygons.filter(p=>hits(p.bbox,bbox))}));
  const count=visible.reduce((sum,r)=>sum+r.polygons.length,0);
  if(String(req.query.mode||"geometry")==="index")return res.status(200).json({
    ok:true,mode:"index",layer:"estratos",scope:city[0]+"_QA_PRECALCULATED",
    minZoom:11,requiresZoom:false,totalVisible:count,
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
      source:"KMZ original · SHP y GeoJSON precalculados · QA",quality:"QA_NO_CANONICO"},
    geometry:{type:"MultiPolygon",coordinates:row.polygons.map(p=>p.coords)}
  }));
  const payload={ok:true,mode:"geometry",layer:"estratos",
    scope:city[0]+"_QA_PRECALCULATED",requiresZoom:false,minZoom:11,
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
module.exports={target,handle};
