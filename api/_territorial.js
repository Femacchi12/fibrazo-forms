const {google}=require("googleapis");

const TERRITORIAL_MASTER_SHEET_ID =
  process.env.TERRITORIAL_MASTER_SHEET_ID ||
  "1cVAEv60ZdDTcQoPmmiSbJV_gfhAXKwywbzf0F0WDp_0";
const TERRITORIAL_VERSION="3.4";
// FO-CHG-031 · No aceptar una ciudad a cientos de km como resultado territorial del punto.
const CITY_NEARBY_MAX_M=20000;
const LAYER_NEARBY_MAX_M={barrio:5000,estrato:5000,troncal:10000};
const DANE_QUERY=
  process.env.DANE_MUNICIPIO_QUERY||
  "https://geoportal.dane.gov.co/mparcgis/rest/services/Hosted/Serv_Mpio_MGN_2025/FeatureServer/317/query";
const CACHE_MS=10*60*1000;
const WKT_BATCH=48;

const cache={
  catalog:null,
  catalogExpires:0,
  cityItems:null,
  cityExpires:0,
  bundle:new Map(),
  layerMeta:new Map(),
  geometry:new Map()
};

const LAYER={
  barrio:{
    sheet:"02_BARRIOS",
    ranges:["A:N","P:U"],
    id:"ID_Barrio",label:"Barrio",wktCol:"O"
  },
  estrato:{
    sheet:"03_ESTRATOS",
    ranges:["A:J","L:Q"],
    id:"ID_Estrato_Poligono",label:"Estrato",wktCol:"K"
  },
  troncal:{
    sheet:"04_TRONCALES",
    ranges:["A:I","K:O"],
    id:"ID_Troncal",label:"Troncal",wktCol:"J"
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
function fileIdFromUrl(url){
  const m=String(url||"").match(/\/spreadsheets\/d\/([^/]+)/i);
  return m?m[1]:"";
}
function tableRows(values){
  const header=values?.[0]||[];
  const rows=(values||[]).slice(1);
  return rows.map((row,index)=>{
    const o={__row:index+2};
    header.forEach((h,i)=>{if(String(h||"").trim())o[String(h).trim()]=row?.[i]??"";});
    return o;
  });
}
function itemView(item){
  if(!item)return null;
  return {
    id:item.id||"",
    name:item.name||"",
    source:item.source||"",
    sourceUrl:item.sourceUrl||"",
    year:item.year||""
  };
}
function empty(status){
  return {status,assigned:null,nearby:null,distanceM:null,source:""};
}
function inside(item){
  return {status:"DENTRO",assigned:itemView(item),nearby:null,distanceM:0,source:item.source||""};
}
function outside(item,distance){
  return {
    status:"FUERA",
    assigned:null,
    nearby:itemView(item),
    distanceM:Number.isFinite(distance)?Math.round(distance*10)/10:null,
    source:item?.source||""
  };
}

function stripOuter(text){
  const s=String(text||"").trim();
  if(!(s.startsWith("(")&&s.endsWith(")")))return s;
  let depth=0;
  for(let i=0;i<s.length;i++){
    if(s[i]==="(")depth++;
    else if(s[i]===")")depth--;
    if(depth===0&&i<s.length-1)return s;
  }
  return s.slice(1,-1).trim();
}
function groupsAtTop(text){
  const s=String(text||"").trim(),out=[];
  let depth=0,start=-1;
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==="("){
      if(depth===0)start=i+1;
      depth++;
    }else if(ch===")"){
      depth--;
      if(depth===0&&start>=0){out.push(s.slice(start,i));start=-1;}
    }
  }
  return out;
}
function parseRing(text){
  return String(text||"").split(",").map(pair=>{
    const p=pair.trim().split(/\s+/);
    return [Number(p[0]),Number(p[1])];
  }).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
}
function parseWkt(wkt){
  const s=String(wkt||"").trim();
  if(/^POLYGON\s*/i.test(s)){
    const body=stripOuter(s.replace(/^POLYGON\s*/i,""));
    const rings=groupsAtTop(body).map(parseRing).filter(r=>r.length>=3);
    return rings.length?[rings]:[];
  }
  if(/^MULTIPOLYGON\s*/i.test(s)){
    const body=stripOuter(s.replace(/^MULTIPOLYGON\s*/i,""));
    return groupsAtTop(body).map(polyText=>
      groupsAtTop(polyText).map(parseRing).filter(r=>r.length>=3)
    ).filter(poly=>poly.length);
  }
  return [];
}
function pointOnSegment(px,py,a,b){
  const [x1,y1]=a,[x2,y2]=b,eps=1e-10;
  const cross=(px-x1)*(y2-y1)-(py-y1)*(x2-x1);
  return Math.abs(cross)<=eps&&px>=Math.min(x1,x2)-eps&&px<=Math.max(x1,x2)+eps&&py>=Math.min(y1,y2)-eps&&py<=Math.max(y1,y2)+eps;
}
function inRing(x,y,ring){
  let insideFlag=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    if(pointOnSegment(x,y,ring[j],ring[i]))return true;
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    const crosses=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-30)+xi);
    if(crosses)insideFlag=!insideFlag;
  }
  return insideFlag;
}
function inPolygon(x,y,rings){
  if(!rings.length||!inRing(x,y,rings[0]))return false;
  for(let i=1;i<rings.length;i++)if(inRing(x,y,rings[i]))return false;
  return true;
}
function inGeometry(x,y,polygons){
  return (polygons||[]).some(poly=>inPolygon(x,y,poly));
}
function localDistance(lon1,lat1,lon2,lat2,latRef){
  const R=6371000,rad=Math.PI/180;
  return Math.hypot((lon2-lon1)*R*Math.cos(latRef*rad)*rad,(lat2-lat1)*R*rad);
}
function bboxDistance(lon,lat,item){
  const x=Math.max(item.minLon,Math.min(item.maxLon,lon));
  const y=Math.max(item.minLat,Math.min(item.maxLat,lat));
  return localDistance(lon,lat,x,y,lat);
}
function segmentDistance(px,py,a,b){
  const R=6371000,rad=Math.PI/180,xScale=R*Math.cos(py*rad)*rad,yScale=R*rad;
  const ax=(a[0]-px)*xScale,ay=(a[1]-py)*yScale,bx=(b[0]-px)*xScale,by=(b[1]-py)*yScale;
  const vx=bx-ax,vy=by-ay,vv=vx*vx+vy*vy;
  let t=vv?-(ax*vx+ay*vy)/vv:0;
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+t*vx,ay+t*vy);
}
function geometryDistance(lon,lat,polygons){
  let best=Infinity;
  for(const poly of polygons||[])for(const ring of poly||[])for(let i=0;i<ring.length;i++){
    const d=segmentDistance(lon,lat,ring[i],ring[(i+1)%ring.length]);
    if(d<best)best=d;
  }
  return best;
}

async function loadCatalog(auth){
  const now=Date.now();
  if(cache.catalog&&cache.catalogExpires>now)return cache.catalog;
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({
    spreadsheetId:TERRITORIAL_MASTER_SHEET_ID,
    range:"01_CIUDADES!A:M"
  });
  const rows=tableRows(r.data.values||[]);
  cache.catalog=rows.filter(row=>norm(row.Estado_Archivo)==="activo"&&row.Archivo_Territorial_URL).map(row=>({
    id:String(row.ID_Ciudad||"").trim(),
    city:String(row.Ciudad||"").trim(),
    municipalities:String(row.Municipios_Ambito||"").split(";").map(x=>x.trim()).filter(Boolean),
    url:String(row.Archivo_Territorial_URL||"").trim(),
    fileId:fileIdFromUrl(row.Archivo_Territorial_URL)
  })).filter(x=>x.id&&x.fileId);
  cache.catalogExpires=now+CACHE_MS;
  return cache.catalog;
}

function catalogForHint(catalog,hintValue){
  const hint=norm(hintValue);
  if(!hint)return null;
  const exact=(catalog||[]).find(entry=>
    [entry.city,...(entry.municipalities||[])].some(value=>norm(value)===hint)
  );
  if(exact)return exact;
  return (catalog||[]).find(entry=>
    [entry.city,...(entry.municipalities||[])].some(value=>{
      const candidate=norm(value);
      return candidate&&hint&&(candidate.includes(hint)||hint.includes(candidate));
    })
  )||null;
}

function parseCityRows(entry,values){
  const out=[];
  for(const row of tableRows(values)){
    const id=String(row.ID_Ciudad_Poligono||"").trim();
    const preferred=truthy(row.Preferida_Analisis);
    const minLon=num(row.Min_Lon),minLat=num(row.Min_Lat),maxLon=num(row.Max_Lon),maxLat=num(row.Max_Lat);
    const polygons=parseWkt(row.WKT);
    if(!id||!preferred||!stateOk(row.Estado_Calidad)||!polygons.length||![minLon,minLat,maxLon,maxLat].every(Number.isFinite))continue;
    out.push({
      id,name:String(row.Municipio||row.Ciudad||"").trim(),
      source:String(row.Fuente_nombre||row.Fuente_tipo||"").trim(),
      sourceUrl:String(row.Fuente_URL||"").trim(),
      year:String(row["Año_Vigencia"]||"").trim(),
      minLon,minLat,maxLon,maxLat,polygons,
      catalog:entry
    });
  }
  return out;
}

function layerMetaFromRanges(fileId,kind,valueRanges){
  const cfg=LAYER[kind];
  const maps=(valueRanges||[]).map(vr=>tableRows(vr?.values||[]));
  const max=Math.max(0,...maps.map(rows=>rows.length));
  const all=[];
  for(let i=0;i<max;i++){
    const merged={__row:i+2};
    for(const rows of maps){
      const part=rows[i]||{};
      for(const [key,value] of Object.entries(part))if(key!=="__row")merged[key]=value;
    }
    if(String(merged[cfg.id]||"").trim())all.push(merged);
  }
  const items=all.map(row=>{
    const minLon=num(row.Min_Lon),minLat=num(row.Min_Lat),maxLon=num(row.Max_Lon),maxLat=num(row.Max_Lat);
    return {
      row:row.__row,
      id:String(row[cfg.id]||"").trim(),
      name:String(row[cfg.label]||"").trim(),
      source:String(row.Fuente_nombre||row.Fuente_tipo||"").trim(),
      sourceUrl:String(row.Fuente_URL||"").trim(),
      year:String(row["Año_Vigencia"]||"").trim(),
      minLon,minLat,maxLon,maxLat,
      preferred:truthy(row.Preferida_Analisis),
      quality:String(row.Estado_Calidad||"").trim()
    };
  }).filter(item=>item.id&&item.preferred&&stateOk(item.quality)&&
    [item.minLon,item.minLat,item.maxLon,item.maxLat].every(Number.isFinite));
  const usableItems=kind==="estrato"
    ?items.filter(item=>/^[1-6]$/.test(String(item.name||"").trim()))
    :items;
  return {hasData:all.length>0,items:usableItems,cfg,fileId,kind};
}

// One city workbook is the canonical unit of territorial data. Reading its
// municipality and all layer indexes in one batch avoids independent requests
// competing for the same Google Sheets per-user quota on a cold function.
async function loadTerritorialBundle(auth,entry){
  const now=Date.now(),hit=cache.bundle.get(entry.fileId);
  if(hit&&hit.expires>now)return hit.value;
  const sheets=google.sheets({version:"v4",auth});
  const coreRanges=[
    "11_POLIGONOS_CIUDAD!A:O",
    ...LAYER.barrio.ranges.map(range=>LAYER.barrio.sheet+"!"+range)
  ];
  const optionalRanges=[
    ...LAYER.estrato.ranges.map(range=>LAYER.estrato.sheet+"!"+range),
    ...LAYER.troncal.ranges.map(range=>LAYER.troncal.sheet+"!"+range)
  ];
  const [coreResponse,optionalResponse]=await Promise.all([
    sheets.spreadsheets.values.batchGet({spreadsheetId:entry.fileId,ranges:coreRanges})
      .catch(error=>{
        console.error("TERRITORIAL_CITY_CORE_READ_ERROR",entry.id,entry.fileId,error?.code||error?.message||"READ_FAILED");
        throw error;
      }),
    sheets.spreadsheets.values.batchGet({spreadsheetId:entry.fileId,ranges:optionalRanges})
      .catch(error=>{
        // A missing/unshared optional layer must not suppress municipality and
        // barrio. The response remains explicit as SIN_CAPA.
        console.warn("TERRITORIAL_OPTIONAL_LAYERS_UNAVAILABLE",entry.id,error?.code||error?.message||"READ_FAILED");
        return {data:{valueRanges:optionalRanges.map(()=>({values:[]}))}};
      })
  ]);
  const parts=[
    ...(coreResponse.data.valueRanges||[]),
    ...(optionalResponse.data.valueRanges||[])
  ];
  const value={entry,cityItems:parseCityRows(entry,parts[0]?.values||[]),layers:{}};
  let offset=1;
  for(const kind of ["barrio","estrato","troncal"]){
    const count=LAYER[kind].ranges.length;
    value.layers[kind]=layerMetaFromRanges(entry.fileId,kind,parts.slice(offset,offset+count));
    cache.layerMeta.set(entry.fileId+"|"+kind,{expires:now+CACHE_MS,value:value.layers[kind]});
    offset+=count;
  }
  cache.bundle.set(entry.fileId,{expires:now+CACHE_MS,value});
  return value;
}

async function loadCityItems(auth){
  const now=Date.now();
  if(cache.cityItems&&cache.cityExpires>now)return cache.cityItems;
  const sheets=google.sheets({version:"v4",auth});
  const catalog=await loadCatalog(auth);
  const responses=await Promise.all(catalog.map(async entry=>{
    try{
      const r=await sheets.spreadsheets.values.get({
        spreadsheetId:entry.fileId,
        range:"11_POLIGONOS_CIUDAD!A:O"
      });
      return {entry,values:r.data.values||[]};
    }catch(error){
      // No convertir fallas de permisos/conectividad en una ciudad lejana falsa.
      console.error("TERRITORIAL_CITY_SOURCE_UNAVAILABLE",entry.id,error?.code||error?.message||"READ_FAILED");
      return {entry,values:[]};
    }
  }));
  const out=[];
  for(const {entry,values} of responses){
    out.push(...parseCityRows(entry,values));
  }
  cache.cityItems=out;
  cache.cityExpires=now+CACHE_MS;
  return out;
}

async function loadLayerMeta(auth,fileId,kind){
  const cfg=LAYER[kind];
  if(!cfg)throw new Error("UNKNOWN_TERRITORIAL_LAYER");
  const key=fileId+"|"+kind,now=Date.now();
  const hit=cache.layerMeta.get(key);
  if(hit&&hit.expires>now)return hit.value;

  const sheets=google.sheets({version:"v4",auth});
  const ranges=cfg.ranges.map(r=>cfg.sheet+"!"+r);
  const response=await sheets.spreadsheets.values.batchGet({
    spreadsheetId:fileId,
    ranges
  });
  const value=layerMetaFromRanges(fileId,kind,response.data.valueRanges||[]);
  cache.layerMeta.set(key,{expires:now+CACHE_MS,value});
  return value;
}

async function fetchGeometries(auth,meta,items){
  if(!items.length)return new Map();
  const sheets=google.sheets({version:"v4",auth});
  const out=new Map(),missing=[];
  for(const item of items){
    const key=meta.fileId+"|"+meta.cfg.sheet+"|"+item.row;
    const cached=cache.geometry.get(key);
    if(cached){out.set(item.row,cached);continue;}
    missing.push(item);
  }
  if(missing.length){
    const ranges=missing.map(item=>meta.cfg.sheet+"!"+meta.cfg.wktCol+item.row+":"+meta.cfg.wktCol+item.row);
    const r=await sheets.spreadsheets.values.batchGet({
      spreadsheetId:meta.fileId,
      ranges
    });
    const valueRanges=r.data.valueRanges||[];
    missing.forEach((item,i)=>{
      const wkt=String(valueRanges[i]?.values?.[0]?.[0]||"");
      const geometry=parseWkt(wkt);
      const key=meta.fileId+"|"+meta.cfg.sheet+"|"+item.row;
      cache.geometry.set(key,geometry);
      out.set(item.row,geometry);
    });
  }
  return out;
}

async function resolveLayer(auth,meta,lon,lat){
  if(!meta||!meta.hasData)return empty("SIN_CAPA");
  if(!meta.items.length)return empty("SIN_CAPA_CANONICA");

  const exactCandidates=meta.items
    .filter(x=>lon>=x.minLon&&lon<=x.maxLon&&lat>=x.minLat&&lat<=x.maxLat)
    .sort((a,b)=>Number(a.quality?.endsWith("_COMPLEMENTO"))-Number(b.quality?.endsWith("_COMPLEMENTO"))||((a.maxLon-a.minLon)*(a.maxLat-a.minLat))-((b.maxLon-b.minLon)*(b.maxLat-b.minLat)));
  if(exactCandidates.length){
    const geometries=await fetchGeometries(auth,meta,exactCandidates);
    for(const item of exactCandidates){
      if(inGeometry(lon,lat,geometries.get(item.row)))return inside(item);
    }
  }

  const maxDistance=LAYER_NEARBY_MAX_M[meta.kind]??5000;
  const ranked=meta.items.map(item=>({item,min:bboxDistance(lon,lat,item)}))
    .filter(candidate=>candidate.min<=maxDistance)
    .sort((a,b)=>a.min-b.min);
  let best=null,bestDistance=maxDistance+0.01,index=0;
  while(index<ranked.length&&ranked[index].min<=bestDistance){
    const slice=ranked.slice(index,index+WKT_BATCH).filter(x=>x.min<=bestDistance);
    if(!slice.length)break;
    const geometries=await fetchGeometries(auth,meta,slice.map(x=>x.item));
    for(const candidate of slice){
      const d=geometryDistance(lon,lat,geometries.get(candidate.item.row));
      if(Number.isFinite(d)&&d<bestDistance){bestDistance=d;best=candidate.item;}
    }
    index+=slice.length;
  }
  return best&&bestDistance<=maxDistance?outside(best,bestDistance):empty("FUERA_COBERTURA");
}

function code5(value){
  const s=String(value??"").replace(/\.0+$/,"").trim();
  return s?s.padStart(5,"0"):"";
}

async function daneExactCity(items,lon,lat){
  const byCode=new Map();
  for(const item of items){
    const m=String(item.id||"").match(/^DANE_MPIO_(\d{5})$/i);
    if(m)byCode.set(m[1],item);
  }
  if(!byCode.size)return null;
  const where="mpio_cdpmp IN ("+[...byCode.keys()].map(x=>"'"+x+"'").join(",")+")";
  const params=new URLSearchParams({
    where,
    geometry:lon+","+lat,
    geometryType:"esriGeometryPoint",
    inSR:"4326",
    spatialRel:"esriSpatialRelIntersects",
    outFields:"mpio_cdpmp,mpio_cnmbre,dpto_cnmbre,mpio_tipo",
    returnGeometry:"false",
    f:"geojson"
  });
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try{
    const response=await fetch(DANE_QUERY+"?"+params.toString(),{signal:controller.signal});
    if(!response.ok)return null;
    const json=await response.json();
    const p=json?.features?.[0]?.properties||null;
    if(!p)return null;
    const raw=p.mpio_cdpmp??p.MPIO_CDPMP??"";
    return byCode.get(code5(raw))||null;
  }catch(_){
    return null;
  }finally{
    clearTimeout(timer);
  }
}

async function resolveCityItems(items,lon,lat){
  if(!items.length)return {result:empty("SIN_CAPA"),catalog:null};

  const exact=items.filter(x=>lon>=x.minLon&&lon<=x.maxLon&&lat>=x.minLat&&lat<=x.maxLat&&inGeometry(lon,lat,x.polygons));
  if(exact.length){
    exact.sort((a,b)=>((a.maxLon-a.minLon)*(a.maxLat-a.minLat))-((b.maxLon-b.minLon)*(b.maxLat-b.minLat)));
    return {result:inside(exact[0]),catalog:exact[0].catalog};
  }
  // The city workbook already contains the full official geometry. DANE is a
  // fallback only, so the common exact-match path does not depend on a second
  // network service.
  const daneItem=await daneExactCity(items,lon,lat);
  if(daneItem)return {result:inside(daneItem),catalog:daneItem.catalog};
  let best=null,bestDistance=Infinity;
  const ranked=items.map(item=>({item,min:bboxDistance(lon,lat,item)})).sort((a,b)=>a.min-b.min);
  for(const candidate of ranked){
    if(candidate.min>bestDistance)break;
    const distance=geometryDistance(lon,lat,candidate.item.polygons);
    if(Number.isFinite(distance)&&distance<bestDistance){best=candidate.item;bestDistance=distance;}
  }
  return best&&bestDistance<=CITY_NEARBY_MAX_M
    ?{result:outside(best,bestDistance),catalog:best.catalog}
    :{result:empty("FUERA_COBERTURA"),catalog:null};
}

async function resolveTerritorial(auth,latValue,lonValue,{cityHint=""}={}){
  const lat=num(latValue),lon=num(lonValue);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180){
    const e=new Error("INVALID_COORDINATES");e.status=400;throw e;
  }
  const catalog=await loadCatalog(auth);
  const hintedCatalog=catalogForHint(catalog,cityHint);
  const hintedBundle=hintedCatalog?await loadTerritorialBundle(auth,hintedCatalog):null;
  const cityItems=hintedBundle?.cityItems||await loadCityItems(auth);
  const cityResolved=await resolveCityItems(cityItems,lon,lat);
  let selected=cityResolved.catalog;

  // Some city files can have usable canonical barrio/estrato/troncal layers before
  // their municipal polygon is available in 11_POLIGONOS_CIUDAD. In that case,
  // choose the territorial catalog whose canonical layer footprint contains the
  // coordinate. This enables layer resolution without falsely changing cityStatus.
  if(!selected){
    if(hintedBundle){
      const matches=Object.values(hintedBundle.layers).some(meta=>
        meta?.items?.some(item=>lon>=item.minLon&&lon<=item.maxLon&&lat>=item.minLat&&lat<=item.maxLat)
      );
      if(matches)selected=hintedCatalog;
    }else{
      const candidates=[];
      for(const cat of catalog){
        let score=0;
        for(const kind of ["barrio","estrato","troncal"]){
          const meta=await loadLayerMeta(auth,cat.fileId,kind).catch(()=>null);
          if(meta?.items?.some(item=>lon>=item.minLon&&lon<=item.maxLon&&lat>=item.minLat&&lat<=item.maxLat))score++;
        }
        if(score)candidates.push({cat,score});
      }
      candidates.sort((a,b)=>b.score-a.score);
      if(candidates.length)selected=candidates[0].cat;
    }
  }

  let barrio=empty("SIN_CAPA"),estrato=empty("SIN_CAPA"),troncal=empty("SIN_CAPA");
  if(selected){
    const selectedBundle=hintedBundle&&hintedBundle.entry.fileId===selected.fileId
      ?hintedBundle
      :await loadTerritorialBundle(auth,selected);
    const bMeta=selectedBundle.layers.barrio;
    const eMeta=selectedBundle.layers.estrato;
    const tMeta=selectedBundle.layers.troncal;
    [barrio,estrato,troncal]=await Promise.all([
      resolveLayer(auth,bMeta,lon,lat),
      resolveLayer(auth,eMeta,lon,lat),
      resolveLayer(auth,tMeta,lon,lat)
    ]);
  }

  if(selected&&["NVA","VVC","IBG"].includes(selected.id)&&cityResolved.result.status==="DENTRO"){
    estrato=await require("./_strata-kmz-canonical").lookup(auth,lat,lon,selected.id);
  }
  if(selected?.id==="CTG"&&cityResolved.result.status==="DENTRO"){
    estrato=await require("./_strata-loaded-canonical").lookupCartagena(auth,lat,lon);
  }

  return {
    version:TERRITORIAL_VERSION,
    masterId:TERRITORIAL_MASTER_SHEET_ID,
    catalogId:selected?.id||"",
    catalogCity:selected?.city||"",
    territorialFileId:selected?.fileId||"",
    territorialFileUrl:selected?.url||"",
    dataSource:"MAESTRO_TERRITORIAL_POR_CIUDAD",
    city:cityResolved.result,
    barrio,
    estrato,
    troncal
  };
}

async function searchTerritorial(auth,queryValue,{limit=18}={}){
  const query=norm(queryValue);
  if(query.length<2)return[];

  const rank=value=>{
    const v=norm(value);
    if(v===query)return 0;
    if(v.startsWith(query))return 1;
    if(v.includes(query))return 2;
    return 99;
  };
  const center=item=>({
    lat:(Number(item.minLat)+Number(item.maxLat))/2,
    lng:(Number(item.minLon)+Number(item.maxLon))/2
  });
  const bounds=item=>[
    [Number(item.minLat),Number(item.minLon)],
    [Number(item.maxLat),Number(item.maxLon)]
  ];
  const out=[],seen=new Set();
  const add=result=>{
    const key=[result.type,norm(result.name),norm(result.city||""),result.id||""].join("|");
    if(seen.has(key))return;
    seen.add(key);
    out.push(result);
  };

  const [catalog,cityItems]=await Promise.all([loadCatalog(auth),loadCityItems(auth)]);

  for(const item of cityItems){
    const labels=[item.name,item.catalog?.city,...(item.catalog?.municipalities||[])].filter(Boolean);
    const best=Math.min(...labels.map(rank));
    if(best>=99)continue;
    add({
      type:"ciudad",
      id:item.id,
      name:item.name||item.catalog?.city||"",
      city:item.catalog?.city||"",
      catalogId:item.catalog?.id||"",
      source:"Base territorial FIBRAZO",
      rank:best,
      ...center(item),
      bounds:bounds(item)
    });
  }

  const matchingCatalog=catalog.filter(cat=>
    [cat.city,...cat.municipalities].some(value=>rank(value)<99)
  );
  for(const cat of matchingCatalog){
    if(out.some(x=>x.type==="ciudad"&&x.catalogId===cat.id))continue;
    const metas=await Promise.all([
      loadLayerMeta(auth,cat.fileId,"barrio").catch(()=>null),
      loadLayerMeta(auth,cat.fileId,"troncal").catch(()=>null)
    ]);
    const items=metas.flatMap(meta=>meta?.items||[]);
    if(!items.length)continue;
    const box={
      minLon:Math.min(...items.map(x=>x.minLon)),
      minLat:Math.min(...items.map(x=>x.minLat)),
      maxLon:Math.max(...items.map(x=>x.maxLon)),
      maxLat:Math.max(...items.map(x=>x.maxLat))
    };
    add({
      type:"ciudad",
      id:cat.id,
      name:cat.city,
      city:cat.city,
      catalogId:cat.id,
      source:"Catálogo territorial FIBRAZO",
      rank:Math.min(...[cat.city,...cat.municipalities].map(rank)),
      ...center(box),
      bounds:bounds(box)
    });
  }

  const layerJobs=[];
  for(const cat of catalog){
    for(const kind of ["barrio","troncal"]){
      layerJobs.push(
        loadLayerMeta(auth,cat.fileId,kind)
          .then(meta=>({cat,kind,meta}))
          .catch(()=>({cat,kind,meta:null}))
      );
    }
  }
  const layerData=await Promise.all(layerJobs);
  for(const {cat,kind,meta} of layerData){
    for(const item of meta?.items||[]){
      const r=rank(item.name);
      if(r>=99)continue;
      add({
        type:kind,
        id:item.id,
        name:item.name,
        city:cat.city,
        catalogId:cat.id,
        source:item.source||"Base territorial FIBRAZO",
        rank:r,
        ...center(item),
        bounds:bounds(item)
      });
    }
  }

  return out
    .sort((a,b)=>a.rank-b.rank||({ciudad:0,barrio:1,troncal:2}[a.type]??9)-({ciudad:0,barrio:1,troncal:2}[b.type]??9)||a.name.localeCompare(b.name,"es",{sensitivity:"base"}))
    .slice(0,Math.max(1,Math.min(Number(limit)||18,30)))
    .map(({rank,...item})=>item);
}

function flattenTerritorial(t){
  const value=(layer,prefix)=>({
    [prefix+"Estado"]:layer?.status||"",
    [prefix+"IdAsignado"]:layer?.assigned?.id||"",
    [prefix+"Asignado"]:layer?.assigned?.name||"",
    [prefix+"IdCercano"]:layer?.nearby?.id||"",
    [prefix+"Cercano"]:layer?.nearby?.name||"",
    [prefix+"DistanciaM"]:layer?.distanceM!==null&&layer?.distanceM!==undefined&&layer?.distanceM!==""&&Number.isFinite(Number(layer.distanceM))
      ?Number(layer.distanceM)
      :null,
    [prefix+"Fuente"]:layer?.source||""
  });
  return {
    territorialVersion:t?.version||"",
    territorialCatalogId:t?.catalogId||"",
    territorialFileId:t?.territorialFileId||"",
    ...value(t?.city,"city"),
    ...value(t?.barrio,"barrio"),
    ...value(t?.estrato,"estrato"),
    ...value(t?.troncal,"troncal")
  };
}

module.exports={
  TERRITORIAL_MASTER_SHEET_ID,
  TERRITORIAL_VERSION,
  resolveTerritorial,
  searchTerritorial,
  flattenTerritorial,
  _internals:{resolveLayer,parseWkt,inGeometry,geometryDistance,bboxDistance,resolveCityItems,catalogForHint,layerMetaFromRanges}
};
