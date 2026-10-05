const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,userCapabilities,canUseDashboard,httpError}=require("./_core");
const {_internals}=require("./_territorial");

const BGA_SHEET_ID="1w0uI4dTF46ZBWALGTqmDj-BF1XPkv61qJlBD3XbGDqs";
const CACHE_MS=10*60*1000;
const cache=new Map();

const CONFIG={
  barrios:{
    sheet:"02_BARRIOS",
    metaRanges:["A:N","P:U"],
    wktCol:"O",
    id:"ID_Barrio",
    name:"Barrio",
    minZoom:10,
    maxFeatures:320
  },
  estratos:{
    sheet:"03_ESTRATOS",
    metaRanges:["A:J","L:Q"],
    wktCol:"K",
    id:"ID_Estrato_Poligono",
    name:"Estrato",
    minZoom:11,
    maxFeatures:1200
  }
};

function norm(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
}
function num(v){
  const n=Number(String(v??"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}
function truthy(v){
  return v===true||["true","si","sí","1","yes","verdadero"].includes(norm(v));
}
function stateOk(v){
  const s=String(v||"").trim().toUpperCase();
  return !s||s==="OFICIAL"||s.startsWith("VALIDADO");
}
function tableRows(values){
  const header=values?.[0]||[];
  return (values||[]).slice(1).map((row,index)=>{
    const out={__row:index+2};
    header.forEach((h,i)=>{if(String(h||"").trim())out[String(h).trim()]=row?.[i]??"";});
    return out;
  });
}
function intersects(a,b){
  return !(a.maxLon<b.minLon||a.minLon>b.maxLon||a.maxLat<b.minLat||a.minLat>b.maxLat);
}
function parseBbox(raw){
  const p=String(raw||"").split(",").map(Number);
  if(p.length!==4||!p.every(Number.isFinite))throw httpError("INVALID_BBOX",400);
  const [minLon,minLat,maxLon,maxLat]=p;
  if(minLon>=maxLon||minLat>=maxLat||minLon<-180||maxLon>180||minLat<-90||maxLat>90)throw httpError("INVALID_BBOX",400);
  return {minLon,minLat,maxLon,maxLat};
}
function safeValue(row,key){
  const value=row?.[key];
  return value===undefined||value===null?"":String(value);
}
function featureProperties(row,cfg,layer){
  const common={
    layer,
    id:safeValue(row,cfg.id),
    name:safeValue(row,cfg.name),
    municipio:safeValue(row,"Municipio")||safeValue(row,"Ciudad"),
    source:safeValue(row,"Fuente_nombre")||safeValue(row,"Fuente_tipo"),
    sourceType:safeValue(row,"Fuente_tipo"),
    sourceUrl:safeValue(row,"Fuente_URL"),
    year:safeValue(row,"Año_Vigencia"),
    quality:safeValue(row,"Estado_Calidad"),
    observations:safeValue(row,"Observaciones"),
    codeOrigin:safeValue(row,"Codigo_Origen")
  };
  if(layer==="barrios"){
    return {
      ...common,
      comuna:safeValue(row,"Comuna_Localidad"),
      areaHa:safeValue(row,"Area_ha"),
      population:safeValue(row,"Poblacion"),
      households:safeValue(row,"Hogares")
    };
  }
  return {
    ...common,
    estrato:safeValue(row,"Estrato"),
    categoria:safeValue(row,"Categoria_Estrato"),
    areaHa:safeValue(row,"Area_ha")
  };
}
function geometryFromWkt(wkt){
  const polygons=_internals.parseWkt(String(wkt||""));
  if(!polygons?.length)return null;
  return polygons.length===1
    ?{type:"Polygon",coordinates:polygons[0]}
    :{type:"MultiPolygon",coordinates:polygons};
}
async function loadMeta(auth,layer){
  const cfg=CONFIG[layer],now=Date.now();
  const hit=cache.get(layer);
  if(hit&&hit.expires>now)return hit.value;

  const sheets=google.sheets({version:"v4",auth});
  const response=await sheets.spreadsheets.values.batchGet({
    spreadsheetId:BGA_SHEET_ID,
    ranges:cfg.metaRanges.map(range=>cfg.sheet+"!"+range)
  });
  const parts=(response.data.valueRanges||[]).map(vr=>tableRows(vr.values||[]));
  const max=Math.max(0,...parts.map(x=>x.length));
  const rows=[];
  for(let i=0;i<max;i++){
    const row={__row:i+2};
    for(const part of parts)Object.assign(row,part[i]||{});
    const id=safeValue(row,cfg.id);
    const minLon=num(row.Min_Lon),minLat=num(row.Min_Lat),maxLon=num(row.Max_Lon),maxLat=num(row.Max_Lat);
    if(!id||!truthy(row.Preferida_Analisis)||!stateOk(row.Estado_Calidad))continue;
    if(![minLon,minLat,maxLon,maxLat].every(Number.isFinite))continue;
    rows.push({...row,minLon,minLat,maxLon,maxLat});
  }
  const value={cfg,rows};
  cache.set(layer,{expires:now+CACHE_MS,value});
  return value;
}
async function getWkts(auth,cfg,rows){
  const sheets=google.sheets({version:"v4",auth});
  const out=new Map();
  const ordered=[...rows].sort((a,b)=>a.__row-b.__row);
  const groups=[];
  let current=null;
  for(const row of ordered){
    if(!current||row.__row!==current.end+1||(current.end-current.start+1)>=350){
      current={start:row.__row,end:row.__row};
      groups.push(current);
    }else{
      current.end=row.__row;
    }
  }
  const batchSize=80;
  for(let i=0;i<groups.length;i+=batchSize){
    const chunk=groups.slice(i,i+batchSize);
    const response=await sheets.spreadsheets.values.batchGet({
      spreadsheetId:BGA_SHEET_ID,
      ranges:chunk.map(g=>cfg.sheet+"!"+cfg.wktCol+g.start+":"+cfg.wktCol+g.end)
    });
    const ranges=response.data.valueRanges||[];
    chunk.forEach((group,index)=>{
      const values=ranges[index]?.values||[];
      for(let offset=0;offset<=group.end-group.start;offset++){
        out.set(group.start+offset,String(values[offset]?.[0]||""));
      }
    });
  }
  return out;
}
function bboxArea(row){
  return Math.max(0,row.maxLon-row.minLon)*Math.max(0,row.maxLat-row.minLat);
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=20");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    const user=await verifyUser(req);
    const layer=String(req.query.layer||"").toLowerCase();
    const cfg=CONFIG[layer];
    if(!cfg)throw httpError("INVALID_LAYER",400);

    const zoom=Number(req.query.zoom||0);
    const bbox=parseBbox(req.query.bbox);
    const auth=gauth();
    const [forms,caps,meta]=await Promise.all([
      loadForms(auth),
      userCapabilities(auth,user.email),
      loadMeta(auth,layer)
    ]);
    if(!canUseDashboard(user,caps.adminActive,forms))throw httpError("DASHBOARD_ACCESS_DENIED",403);

    if(Number.isFinite(zoom)&&zoom<cfg.minZoom){
      return res.status(200).json({
        ok:true,layer,minZoom:cfg.minZoom,requiresZoom:true,truncated:false,totalVisible:0,features:[]
      });
    }

    let candidates=meta.rows.filter(row=>intersects(row,bbox));
    const totalVisible=candidates.length;
    candidates.sort((a,b)=>bboxArea(a)-bboxArea(b)||String(a[cfg.id]).localeCompare(String(b[cfg.id])));
    const truncated=candidates.length>cfg.maxFeatures;
    candidates=candidates.slice(0,cfg.maxFeatures);

    const wkts=await getWkts(auth,cfg,candidates);
    const features=[];
    for(const row of candidates){
      const geometry=geometryFromWkt(wkts.get(row.__row));
      if(!geometry)continue;
      features.push({
        type:"Feature",
        id:safeValue(row,cfg.id),
        properties:featureProperties(row,cfg,layer),
        geometry
      });
    }

    return res.status(200).json({
      ok:true,
      layer,
      scope:"BUC_AMB",
      minZoom:cfg.minZoom,
      requiresZoom:false,
      truncated,
      totalVisible,
      features
    });
  }catch(error){
    const status=error.status||500;
    console.error("MAP_POLYGONS_ERROR",error?.message||error);
    return res.status(status).json({error:status===500?"No se pudieron cargar los polígonos.":error.message});
  }
};