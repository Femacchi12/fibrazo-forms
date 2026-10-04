const {google}=require("googleapis");
const {gauth,verifyUser,httpError}=require("./_core");

const TERRITORIAL_SHEET_ID=process.env.TERRITORIAL_SHEET_ID||"19_ixY0PwYIlobp94h-X7AD_CnFgHHIOso0H2RZlkGHY";
const COMPETENCIA_SHEET_ID=process.env.COMPETENCIA_SHEET_ID||"1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU";
let cache={expires:0,territorialBarrios:null,territorialEstratos:null,operators:null,presence:null};

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
function truthy(v){return v===true||["true","si","sí","1","yes"].includes(norm(v));}
function headerKey(v){return norm(v).replace(/[^a-z0-9_]+/g,"_").replace(/^_+|_+$/g,"");}
function tableReader(table){
  const header=table?.[0]||[];
  const index=new Map(header.map((name,i)=>[headerKey(name),i]));
  return{rows:(table||[]).slice(1),get(row,...names){
    for(const name of names){const i=index.get(headerKey(name));if(i!==undefined)return row?.[i]??"";}
    return"";
  }};
}

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
function segmentDistanceMeters(lon,lat,a,b){
  const lat0=lat*Math.PI/180, mx=111320*Math.cos(lat0), my=110540;
  const px=lon*mx,py=lat*my,x1=a[0]*mx,y1=a[1]*my,x2=b[0]*mx,y2=b[1]*my;
  const dx=x2-x1,dy=y2-y1,den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/den)):0;
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function nearestPolygon(lon,lat,items,city,maxMeters=5000){
  const cityNorm=norm(canonicalCity(city));let best=null;
  for(const item of items||[]){
    if(cityNorm&&norm(canonicalCity(item.city))!==cityNorm)continue;
    const approxLat=Math.max(item.minLat,Math.min(lat,item.maxLat));
    const approxLon=Math.max(item.minLon,Math.min(lon,item.maxLon));
    const boxDist=Math.hypot((approxLat-lat)*110540,(approxLon-lon)*111320*Math.cos(lat*Math.PI/180));
    if(best&&boxDist>best.distance)continue;
    for(const poly of item.polygons||[])for(const ring of poly||[])for(let i=0;i<ring.length;i++){
      const d=segmentDistanceMeters(lon,lat,ring[i],ring[(i+1)%ring.length]);
      if(!best||d<best.distance)best={item,distance:d};
    }
  }
  return best&&best.distance<=maxMeters?best:null;
}
async function values(sheets,spreadsheetId,range){
  const r=await sheets.spreadsheets.values.get({spreadsheetId,range});
  return r.data.values||[];
}
async function loadGeo(auth){
  const now=Date.now();
  if(cache.expires>now&&cache.territorialBarrios&&cache.operators)return cache;
  const sheets=google.sheets({version:"v4",auth});
  const [tb,te,ops,pres]=await Promise.all([
    values(sheets,TERRITORIAL_SHEET_ID,"02_BARRIOS!A:T").catch(()=>[]),
    values(sheets,TERRITORIAL_SHEET_ID,"03_ESTRATOS!A:R").catch(()=>[]),
    values(sheets,COMPETENCIA_SHEET_ID,"01_OPERADORES!A2:P1000").catch(()=>[]),
    values(sheets,COMPETENCIA_SHEET_ID,"03_PRESENCIA!C2:J3000").catch(()=>[])
  ]);
  const barrios=tableReader(tb),estratos=tableReader(te);
  cache={
    expires:now+10*60*1000,
    territorialBarrios:barrios.rows.map(r=>({
      id:barrios.get(r,"ID_Barrio"),city:barrios.get(r,"Ciudad"),name:barrios.get(r,"Barrio"),
      preferred:truthy(barrios.get(r,"Preferida_Analisis")),
      sourceType:String(barrios.get(r,"Fuente_tipo")||""),source:String(barrios.get(r,"Fuente_nombre","Fuente_tipo")||""),
      sourceUrl:String(barrios.get(r,"Fuente_URL")||""),year:String(barrios.get(r,"Año_Vigencia")||""),
      minLon:num(barrios.get(r,"Min_Lon")),minLat:num(barrios.get(r,"Min_Lat")),
      maxLon:num(barrios.get(r,"Max_Lon")),maxLat:num(barrios.get(r,"Max_Lat")),
      polygons:parseWkt(barrios.get(r,"WKT"))
    })).filter(x=>x.id&&x.preferred&&x.polygons.length&&[x.minLon,x.minLat,x.maxLon,x.maxLat].every(Number.isFinite)),
    territorialEstratos:estratos.rows.map(r=>({
      id:estratos.get(r,"ID_Estrato_Poligono"),city:estratos.get(r,"Ciudad"),estrato:String(estratos.get(r,"Estrato")||""),
      sourceType:String(estratos.get(r,"Fuente_tipo")||""),source:String(estratos.get(r,"Fuente_nombre","Fuente_tipo")||""),
      sourceUrl:String(estratos.get(r,"Fuente_URL")||""),year:String(estratos.get(r,"Año_Vigencia")||""),
      preferred:truthy(estratos.get(r,"Preferida_Analisis")),
      minLon:num(estratos.get(r,"Min_Lon")),minLat:num(estratos.get(r,"Min_Lat")),
      maxLon:num(estratos.get(r,"Max_Lon")),maxLat:num(estratos.get(r,"Max_Lat")),
      polygons:parseWkt(estratos.get(r,"WKT"))
    })).filter(x=>x.id&&/^[1-6]$/.test(x.estrato)&&x.polygons.length&&[x.minLon,x.minLat,x.maxLon,x.maxLat].every(Number.isFinite)),
    operators:ops,presence:pres
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

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=60");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    await verifyUser(req);
    const lat=num(req.query.lat),lng=num(req.query.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)throw httpError("INVALID_COORDINATES",400);
    const auth=gauth(),data=await loadGeo(auth);
    const hint=canonicalCity(req.query.city||"");
    const territorial=findPolygon(lng,lat,data.territorialBarrios);
    const territorialEstrato=findPolygon(lng,lat,(data.territorialEstratos||[]).filter(x=>x.preferred));
    const historicalEstrato=findPolygon(lng,lat,(data.territorialEstratos||[]).filter(x=>!x.preferred&&norm(x.city)==="cartagena"));
    const city=canonicalCity(territorial?.city||territorialEstrato?.city||historicalEstrato?.city||hint);
    const barrio=territorial?.name||"";
    let estrato=territorialEstrato?.estrato||"";
    let estratoSource=territorialEstrato?.source||"";
    let estratoMatch=estrato?"exacto":"";
    let estratoDistanceM=estrato?0:null;
    if(!estrato&&historicalEstrato){
      estrato=historicalEstrato.estrato;
      estratoSource=(historicalEstrato.source||"GeoInformador Cartagena")+" · "+(historicalEstrato.year||"histórico");
      estratoMatch="historico";estratoDistanceM=0;
    }
    if(!estrato&&norm(city)==="cartagena"){
      const nearestHistorical=nearestPolygon(lng,lat,(data.territorialEstratos||[]).filter(x=>!x.preferred&&norm(x.city)==="cartagena"),"Cartagena",5000);
      if(nearestHistorical){
        estrato=nearestHistorical.item.estrato;
        estratoSource=(nearestHistorical.item.source||"GeoInformador Cartagena")+" · "+(nearestHistorical.item.year||"histórico");
        estratoMatch="historico_cercano";estratoDistanceM=Math.round(nearestHistorical.distance);
      }
    }
    return res.status(200).json({
      ok:true,city,barrio,estrato,estratoMatch,estratoDistanceM,
      barrioSource:territorial?.source||"",estratoSource,
      isps:ispOptions(city||hint,data)
    });
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo consultar la información geográfica.":error.message});
  }
};
