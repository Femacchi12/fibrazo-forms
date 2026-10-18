// FO-CHG-065. QA reference overlays reuse the canonical point-in-polygon
// and distance algorithms without activating pilot source books as canonical.
const {google}=require("googleapis");
const {_internals:{parseWkt,inGeometry,geometryDistance,bboxDistance}}=require("./_territorial");
const PILOTS={
  neiva:{city:"Neiva",id:"NVA",sheet:"1_w8eEE0c6X-CBZaxv5J8TMCC8IPQlMTEQ3rFhZ68y-4"},
  villavicencio:{city:"Villavicencio",id:"VVC",sheet:"1Kr1ZLsTgi06vNVSf-v6XgqsTpMPihiIwytJfbkoJHKU"},
  ibague:{city:"Ibagué",id:"IBG",sheet:"1DnFwlMUFQucl2B12m5jSBjEvqcx537cl16znAQSr1NA"}
};
const TTL=600000,NEAR_BARRIO_M=5000,NEAR_CITY_M=20000;
const cache=new Map(),pending=new Map(),wkts=new Map();
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}
function num(v){const raw=String(v??"").trim();if(!raw)return NaN;const n=Number(raw.replace(",","."));return Number.isFinite(n)?n:NaN;}
function preferred(v){return ["true","si","sí","1","yes","verdadero"].includes(norm(v));}
function shape(row){return {minLon:num(row[0]),minLat:num(row[1]),maxLon:num(row[2]),maxLat:num(row[3])};}
function validBox(o){return [o.minLon,o.minLat,o.maxLon,o.maxLat].every(Number.isFinite)&&o.minLon<=o.maxLon&&o.minLat<=o.maxLat;}
function empty(status){return {status,assigned:null,nearby:null,distanceM:null,source:"",canonical:false};}
function named(item){return {id:item.id,name:item.name};}
function inside(item){return {...empty("DENTRO"),assigned:named(item),distanceM:0,source:item.source};}
function outside(item,distance){return {...empty("FUERA"),nearby:named(item),distanceM:Math.round(distance*10)/10,source:item.source};}
async function memo(key,work){
  const now=Date.now(),hit=cache.get(key);
  if(hit&&hit.expiry>now)return hit.value;
  if(pending.has(key))return pending.get(key);
  const promise=work().then(value=>{cache.set(key,{value,expiry:Date.now()+TTL});return value;});
  pending.set(key,promise);
  try{return await promise;}finally{pending.delete(key);}
}
async function cityFootprint(auth,pilot){
  return memo("city:"+pilot.id,async()=>{
    const sheets=google.sheets({version:"v4",auth});
    const result=await sheets.spreadsheets.values.get({
      spreadsheetId:pilot.sheet,range:"11_POLIGONOS_CIUDAD!A1:O10"
    });
    const values=result.data.values||[],header=values[0]||[];
    const col=name=>header.indexOf(name);
    const row=values.slice(1).find(row=>row[col("WKT")]&&preferred(row[col("Preferida_Analisis")]));
    if(!row)throw Error("QA_CITY_POLYGON_MISSING:"+pilot.id);
    const box=shape(["Min_Lon","Min_Lat","Max_Lon","Max_Lat"].map(k=>row[col(k)]));
    const polygons=parseWkt(row[col("WKT")]);
    if(!validBox(box)||!polygons.length)throw Error("QA_CITY_POLYGON_INVALID:"+pilot.id);
    return {...box,polygons,id:String(row[col("ID_Ciudad_Poligono")]||pilot.id),
      name:String(row[col("Municipio")]||pilot.city).trim(),source:"DANE MGN 2025 · QA referencial, no canónico"};
  });
}
async function neighborhoodIndex(auth,pilot){
  return memo("index:"+pilot.id,async()=>{
    const sheets=google.sheets({version:"v4",auth});
    const response=await sheets.spreadsheets.values.batchGet({
      spreadsheetId:pilot.sheet,
      ranges:["02_BARRIOS!A2:D","02_BARRIOS!N2:N","02_BARRIOS!P2:S"]
    });
    const [base=[],flags=[],bounds=[]]=(response.data.valueRanges||[]).map(x=>x.values||[]);
    const entries=[];
    for(let i=0;i<base.length;i++){
      const row=base[i]||[],bb=shape(bounds[i]||[]);
      if(!row[0]||!row[2]||!preferred(flags[i]?.[0])||!validBox(bb))continue;
      entries.push({...bb,row:i+2,id:String(row[0]),name:String(row[2]),
        source:"Barrios cargados FO-CHG-058 · QA referencial, no canónico"});
    }
    return entries;
  });
}
async function getPolygons(auth,pilot,items){
  const now=Date.now(),needs=[],results=new Map();
  for(const item of items){
    const key=pilot.id+":"+item.row,hit=wkts.get(key);
    if(hit&&hit.expiry>now)results.set(item.row,hit.polygons);
    else needs.push(item);
  }
  if(needs.length){
    const sheets=google.sheets({version:"v4",auth});
    for(let i=0;i<needs.length;i+=50){
      const batch=needs.slice(i,i+50);
      const response=await sheets.spreadsheets.values.batchGet({
        spreadsheetId:pilot.sheet,
        ranges:batch.map(item=>"02_BARRIOS!O"+item.row+":O"+item.row)
      });
      batch.forEach((item,j)=>{
        const polygons=parseWkt(response.data.valueRanges?.[j]?.values?.[0]?.[0]||"");
        results.set(item.row,polygons);
        wkts.set(pilot.id+":"+item.row,{polygons,expiry:Date.now()+TTL});
      });
    }
  }
  return results;
}
async function findNeighborhood(auth,pilot,lat,lon){
  const items=await neighborhoodIndex(auth,pilot);
  if(!items.length)return empty("SIN_CAPA");
  // Same bbox pruning and true polygon distance methods as the canonical engine.
  const exactCandidates=items.filter(item=>lon>=item.minLon&&lon<=item.maxLon&&lat>=item.minLat&&lat<=item.maxLat);
  if(exactCandidates.length){
    const shapes=await getPolygons(auth,pilot,exactCandidates);
    const exact=exactCandidates.filter(item=>inGeometry(lon,lat,shapes.get(item.row)))
      .sort((a,b)=>((a.maxLon-a.minLon)*(a.maxLat-a.minLat))-((b.maxLon-b.minLon)*(b.maxLat-b.minLat)));
    if(exact.length)return inside(exact[0]);
  }
  const ranked=items.map(item=>({item,min:bboxDistance(lon,lat,item)}))
    .filter(x=>x.min<=NEAR_BARRIO_M)
    .sort((a,b)=>a.min-b.min);
  let best=null,distance=NEAR_BARRIO_M+0.01;
  for(let i=0;i<ranked.length;){
    if(ranked[i].min>distance)break;
    const group=ranked.slice(i,i+20).filter(x=>x.min<=distance);
    if(!group.length)break;
    const shapes=await getPolygons(auth,pilot,group.map(x=>x.item));
    for(const x of group){
      const d=geometryDistance(lon,lat,shapes.get(x.item.row));
      if(Number.isFinite(d)&&d<distance){best=x.item;distance=d;}
    }
    i+=group.length;
  }
  return best&&distance<=NEAR_BARRIO_M?outside(best,distance):empty("FUERA_COBERTURA");
}
function referenceCity(footprint,lat,lon){
  if(inGeometry(lon,lat,footprint.polygons))return inside(footprint);
  const distance=geometryDistance(lon,lat,footprint.polygons);
  return Number.isFinite(distance)&&distance<=NEAR_CITY_M?outside(footprint,distance):empty("FUERA_COBERTURA");
}
async function resolveQaTerritorial(auth,latValue,lonValue,cityHint=""){
  const lat=num(latValue),lon=num(lonValue);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return null;
  const hint=norm(cityHint),match=Object.entries(PILOTS).filter(([key,p])=>!hint||hint===key||hint===norm(p.city));
  if(!match.length)return null;
  // A coordinate can be outside the stratum archive footprint but inside the
  // official municipality. Determine municipality using actual DANE WKT.
  const footprints=await Promise.all(match.map(async([key,p])=>({pilot:p,footprint:await cityFootprint(auth,p)})));
  const possibles=footprints.filter(x=>bboxDistance(lon,lat,x.footprint)<=NEAR_CITY_M)
    .map(x=>({...x,city:referenceCity(x.footprint,lat,lon)}))
    .filter(x=>x.city.status==="DENTRO"||x.city.status==="FUERA")
    .sort((a,b)=>(a.city.status==="DENTRO"?0:1)-(b.city.status==="DENTRO"?0:1)||
      Number(a.city.distanceM||0)-Number(b.city.distanceM||0));
  if(!possibles.length)return null;
  const selected=possibles[0];
  // Do not return city membership for overlapping pilot footprints.
  if(possibles.length>1&&possibles[1].city.status==="DENTRO"&&selected.city.status==="DENTRO")return null;
  const barrio=await findNeighborhood(auth,selected.pilot,lat,lon);
  return {city:selected.city,barrio,estrato:empty("SIN_CAPA"),troncal:empty("SIN_CAPA"),
    pilot:selected.pilot.city,catalogId:selected.pilot.id,
    canonical:false,source:"FO-CHG-058 + DANE · QA referencial"};
}
module.exports={resolveQaTerritorial,_internals:{PILOTS,shape,validBox,referenceCity,findNeighborhood,inside,outside,empty}};
