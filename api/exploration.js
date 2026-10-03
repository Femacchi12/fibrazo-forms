const {google}=require("googleapis");
const {gauth,verifyUser,httpError}=require("./_core");

const BGF_SHEET_ID=process.env.BUCARAMANGA_EXPLORACION_SHEET_ID||"1LKNNf7a1VlUGpr9SlRqJGAkZq4NprW-wvdjNIlmB4E4";
const TERRITORIAL_SHEET_ID=process.env.TERRITORIAL_SHEET_ID||"19_ixY0PwYIlobp94h-X7AD_CnFgHHIOso0H2RZlkGHY";
const COMPETENCIA_SHEET_ID=process.env.COMPETENCIA_SHEET_ID||"1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU";
let cache={expires:0,bgfBarrios:null,bgfEstratos:null,territorialBarrios:null,operators:null,presence:null};

function norm(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
}
function canonicalCity(value){
  const v=norm(value);
  const aliases=[
    ["cartagena","Cartagena"],["barranquilla","Barranquilla"],["santa marta","Santa Marta"],
    ["sincelejo","Sincelejo"],["monteria","Montería"],["bucaramanga","Bucaramanga"],
    ["floridablanca","Floridablanca"],["giron","Girón"],["piedecuesta","Piedecuesta"]
  ];
  return aliases.find(([key])=>v.includes(key))?.[1]||String(value||"").trim();
}
function num(v){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:NaN;}

function parseWkt(wkt){
  const s=String(wkt||"").trim();
  const ring=text=>text.split(",").map(pair=>{
    const p=pair.trim().split(/\s+/);return[Number(p[0]),Number(p[1])];
  }).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
  if(/^POLYGON/i.test(s)){
    const body=s.replace(/^POLYGON\s*\(\(/i,"").replace(/\)\)\s*$/,"");
    return [body.split(/\)\s*,\s*\(/).map(ring).filter(r=>r.length>=3)];
  }
  if(/^MULTIPOLYGON/i.test(s)){
    const body=s.replace(/^MULTIPOLYGON\s*\(\(\(/i,"").replace(/\)\)\)\s*$/,"");
    return body.split(/\)\)\s*,\s*\(\(/).map(poly=>poly.split(/\)\s*,\s*\(/).map(ring).filter(r=>r.length>=3)).filter(Boolean);
  }
  return[];
}
function pointOnSegment(px,py,a,b){
  const [x1,y1]=a,[x2,y2]=b,eps=1e-10;
  const cross=(px-x1)*(y2-y1)-(py-y1)*(x2-x1);
  return Math.abs(cross)<=eps&&px>=Math.min(x1,x2)-eps&&px<=Math.max(x1,x2)+eps&&py>=Math.min(y1,y2)-eps&&py<=Math.max(y1,y2)+eps;
}
function inRing(x,y,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    if(pointOnSegment(x,y,ring[j],ring[i]))return true;
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-30)+xi))inside=!inside;
  }
  return inside;
}
function inPolygon(x,y,rings){
  if(!rings.length||!inRing(x,y,rings[0]))return false;
  for(let i=1;i<rings.length;i++)if(inRing(x,y,rings[i]))return false;
  return true;
}
function findPolygon(lon,lat,items){
  for(const item of items||[]){
    if(lon<item.minLon||lon>item.maxLon||lat<item.minLat||lat>item.maxLat)continue;
    if((item.polygons||[]).some(poly=>inPolygon(lon,lat,poly)))return item;
  }
  return null;
}
async function values(sheets,spreadsheetId,range){
  const r=await sheets.spreadsheets.values.get({spreadsheetId,range});
  return r.data.values||[];
}
async function loadGeo(auth){
  const now=Date.now();
  if(cache.expires>now&&cache.bgfBarrios&&cache.operators)return cache;
  const sheets=google.sheets({version:"v4",auth});
  const [bb,be,tb,ops,pres]=await Promise.all([
    values(sheets,BGF_SHEET_ID,"06_POLIGONOS_BARRIOS!A2:I1000").catch(()=>[]),
    values(sheets,BGF_SHEET_ID,"03_POLIGONOS_ESTRATOS!A2:I10000").catch(()=>[]),
    values(sheets,TERRITORIAL_SHEET_ID,"02_BARRIOS!A2:S1500").catch(()=>[]),
    values(sheets,COMPETENCIA_SHEET_ID,"01_OPERADORES!A2:P1000").catch(()=>[]),
    values(sheets,COMPETENCIA_SHEET_ID,"03_PRESENCIA!C2:J3000").catch(()=>[])
  ]);
  cache={
    expires:now+10*60*1000,
    bgfBarrios:bb.map(r=>({id:r[0],city:r[2],name:r[3],minLon:num(r[4]),minLat:num(r[5]),maxLon:num(r[6]),maxLat:num(r[7]),polygons:parseWkt(r[8])})).filter(x=>x.id&&x.polygons.length),
    bgfEstratos:be.map(r=>({id:r[0],city:r[1],estrato:String(r[2]||""),minLon:num(r[4]),minLat:num(r[5]),maxLon:num(r[6]),maxLat:num(r[7]),polygons:parseWkt(r[8])})).filter(x=>x.id&&/^[1-6]$/.test(x.estrato)&&x.polygons.length),
    territorialBarrios:tb.map(r=>({id:r[0],city:r[1],name:r[2],preferred:r[13]===true||String(r[13]).toUpperCase()==="TRUE",source:r[10]||r[9]||"",minLon:num(r[15]),minLat:num(r[16]),maxLon:num(r[17]),maxLat:num(r[18]),polygons:parseWkt(r[14])})).filter(x=>x.id&&x.polygons.length).sort((a,b)=>Number(b.preferred)-Number(a.preferred)),
    operators:ops,
    presence:pres
  };
  return cache;
}
function ispOptions(city,data){
  const cityNorm=norm(canonicalCity(city));
  if(!cityNorm)return[];
  const meta=new Map();
  for(const r of data.operators||[]){
    const id=String(r[0]||""),name=String(r[1]||"").trim(),type=String(r[4]||""),base=String(r[11]||""),coverage=String(r[12]||""),status=String(r[14]||"");
    meta.set(id,{name,type,base,coverage,status});
  }
  const names=new Set();
  const eligible=m=>{
    if(!m||norm(m.type)!=="local / regional")return false;
    const n=norm(m.name);
    if(!n||n.includes("claro")||n.includes("tigo")||n.includes("movistar")||n.includes("isp sin identificar"))return false;
    return true;
  };
  for(const r of data.presence||[]){
    if(norm(r[1])!==cityNorm)continue;
    const m=meta.get(String(r[6]||""));
    const visible=String(r[7]||"").trim();
    if(eligible(m))names.add(m.name);
    else if(visible&&!/(claro|tigo|movistar|isp sin identificar)/i.test(norm(visible)))names.add(visible);
  }
  for(const m of meta.values()){
    if(!eligible(m))continue;
    const haystack=norm(m.base+" | "+m.coverage);
    if(haystack.includes(cityNorm))names.add(m.name);
  }
  return [...names].sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
}
async function barranquillaEstrato(lat,lng){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3500);
  try{
    const url="https://services3.arcgis.com/oGYAc07w6wsvgUYr/ArcGIS/rest/services/PANORAMA_URBANO_AGOL_WFL1/FeatureServer/0/query?geometry="+encodeURIComponent(lng+","+lat)+"&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=estrato&returnGeometry=false&f=json";
    const r=await fetch(url,{signal:controller.signal});
    if(!r.ok)return"";
    const j=await r.json();
    const v=j.features?.[0]?.attributes?.estrato;
    return /^[1-6]$/.test(String(v??""))?String(v):"";
  }catch(_){return"";}finally{clearTimeout(timer);}
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=60");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    await verifyUser(req);
    const lat=num(req.query.lat),lng=num(req.query.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)throw httpError("INVALID_COORDINATES",400);
    const auth=gauth(),data=await loadGeo(auth);
    const hint=canonicalCity(req.query.city||"");
    const bgBarrio=findPolygon(lng,lat,data.bgfBarrios);
    const bgEstrato=findPolygon(lng,lat,data.bgfEstratos);
    const territorial=findPolygon(lng,lat,data.territorialBarrios);
    const city=canonicalCity(bgBarrio?.city||bgEstrato?.city||territorial?.city||hint);
    const barrio=bgBarrio?.name||territorial?.name||"";
    let estrato=bgEstrato?.estrato||"";
    let estratoSource=bgEstrato?"Bucaramanga_Exploracion":"";
    if(!estrato&&norm(city)==="barranquilla"){
      estrato=await barranquillaEstrato(lat,lng);
      if(estrato)estratoSource="Barranquilla GIS público";
    }
    return res.status(200).json({
      ok:true,city,barrio,estrato,
      barrioSource:bgBarrio?"AMB Barrios":territorial?.source||"",
      estratoSource,
      isps:ispOptions(city||hint,data)
    });
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo consultar la información geográfica.":error.message});
  }
};