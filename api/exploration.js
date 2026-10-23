const {google}=require("googleapis");
const {gauth,verifyUser,httpError}=require("./_core");
const {resolveTerritorial,resolveMapCity,TERRITORIAL_VERSION}=require("./_territorial");

const COMPETENCIA_SHEET_ID=
  process.env.COMPETENCIA_SHEET_ID||
  "1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU";

let competitionCache={expires:0,operators:null,presence:null};
const CACHE_MS=10*60*1000;

function norm(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
}
function num(v){
  const n=Number(String(v??"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}
function canonicalCity(value){
  const v=norm(value);
  const aliases=[
    ["cartagena de indias","Cartagena"],
    ["cartagena","Cartagena"],
    ["barranquilla","Barranquilla"],
    ["santa marta","Santa Marta"],
    ["sincelejo","Sincelejo"],
    ["monteria","Montería"],
    ["turbaco","Turbaco"],
    ["bucaramanga","Bucaramanga"],
    ["floridablanca","Floridablanca"],
    ["giron","Girón"],
    ["piedecuesta","Piedecuesta"],
    ["neiva","Neiva"],
    ["villavicencio","Villavicencio"],
    ["ibague","Ibagué"]
  ];
  return aliases.find(([key])=>v.includes(key))?.[1]||String(value||"").trim();
}

async function values(sheets,spreadsheetId,range){
  const r=await sheets.spreadsheets.values.get({spreadsheetId,range});
  return r.data.values||[];
}
async function loadCompetition(auth){
  const now=Date.now();
  if(competitionCache.expires>now&&competitionCache.operators)return competitionCache;
  const sheets=google.sheets({version:"v4",auth});
  let operators=[],presence=[];
  try{
    const response=await sheets.spreadsheets.values.batchGet({
      spreadsheetId:COMPETENCIA_SHEET_ID,
      ranges:["01_OPERADORES!A2:P1000","03_PRESENCIA!C2:J3000"]
    });
    operators=response.data.valueRanges?.[0]?.values||[];
    presence=response.data.valueRanges?.[1]?.values||[];
  }catch(error){
    console.error("EXPLORATION_COMPETITION_READ_ERROR",error?.code||error?.message||"READ_FAILED");
  }
  competitionCache={expires:now+CACHE_MS,operators,presence};
  return competitionCache;
}
function ispOptions(city,data){
  const cityNorm=norm(canonicalCity(city));
  if(!cityNorm)return[];
  const meta=new Map();
  for(const r of data.operators||[]){
    const id=String(r[0]||""),name=String(r[1]||"").trim(),type=String(r[4]||""),
      base=String(r[11]||""),coverage=String(r[12]||"");
    meta.set(id,{name,type,base,coverage});
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
function legacyMatch(layer){
  if(layer?.status==="DENTRO")return"exacto";
  if(layer?.status==="FUERA")return"fuera";
  if(layer?.status==="SIN_CAPA_CANONICA")return"sin_capa_canonica";
  if(layer?.status==="SIN_CAPA")return"sin_capa";
  return"";
}
function dist(layer){
  const value=layer?.distanceM;
  return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))
    ?Number(value)
    :null;
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=60");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    await verifyUser(req);

    const lat=num(req.query.lat),lng=num(req.query.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180){
      throw httpError("INVALID_COORDINATES",400);
    }

    const auth=gauth();
    if(String(req.query.cityOnly||"")==="1"){
      const resolved=await resolveMapCity(auth,lat,lng);
      return res.status(200).json({ok:true,cityStatus:resolved.status,
        city:resolved.status==="DENTRO"?canonicalCity(resolved.assigned?.name||""):""});
    }
    const hint=canonicalCity(req.query.city||"");
    // FO-CHG-072: offer read-only, noncanonical strata references in Production
    // and Preview. Start the lookup alongside canonical enrichment so GPS does
    // not wait twice. This never activates a canonical stratum.
    const referenceTask=["preview","production"].includes(process.env.VERCEL_ENV)
      ?Promise.resolve().then(()=>require("./_estratos-precalc").lookupReference(
        auth,lat,lng,hint
      )).catch(error=>{
        console.error("QA_STRATA_REFERENCE_ERROR",error?.code||error?.message||"READ_FAILED");
        return null;
      })
      :Promise.resolve(null);
    const [territorial,competition,referenceCandidate]=await Promise.all([
      resolveTerritorial(auth,lat,lng,{cityHint:hint}),
      loadCompetition(auth),
      referenceTask
    ]);
    // The three activated cities now use the same canonical city workbook as
    // the map. The old QA barrio resolver is kept only as a last-resort preview
    // fallback when no canonical catalog could be routed.
    const pilotCandidate=process.env.VERCEL_ENV==="preview"&&!territorial.catalogId
      ?await Promise.resolve().then(()=>require("./_territorial-qa").resolveQaTerritorial(
        auth,lat,lng,hint
      )).catch(error=>{
        console.error("QA_TERRITORIAL_REFERENCE_ERROR",error?.code||error?.message||"READ_FAILED");
        return null;
      }):null;
    // Never substitute noncanonical QA geometry for an operational layer.
    const qaStratum=["SIN_CAPA","SIN_CAPA_CANONICA"].includes(territorial.estrato?.status)
      ?referenceCandidate:null;

    const city=territorial.city?.status==="DENTRO"
      ?canonicalCity(territorial.city.assigned?.name||"")
      :"";
    const cityNearby=canonicalCity(territorial.city?.nearby?.name||"");
    const qaCity=pilotCandidate?.city?.status==="DENTRO"?String(pilotCandidate.city.assigned?.name||""):"";
    const ispCity=city||qaCity||cityNearby||hint;

    const barrio=territorial.barrio?.status==="DENTRO"
      ?String(territorial.barrio.assigned?.name||"")
      :"";
    const estrato=territorial.estrato?.status==="DENTRO"
      ?String(territorial.estrato.assigned?.name||"")
      :"";
    const troncal=territorial.troncal?.status==="DENTRO"
      ?String(territorial.troncal.assigned?.name||"")
      :"";

    return res.status(200).json({
      ok:true,
      territorialVersion:TERRITORIAL_VERSION,
      qaStratum,
      qaTerritorial:pilotCandidate,
      city,
      cityStatus:territorial.city?.status||"",
      cityNearby,
      cityDistanceM:dist(territorial.city),
      barrio,
      barrioStatus:territorial.barrio?.status||"",
      barrioNearby:String(territorial.barrio?.nearby?.name||""),
      barrioDistanceM:dist(territorial.barrio),
      barrioSource:territorial.barrio?.source||"",
      estrato,
      estratoStatus:territorial.estrato?.status||"",
      estratoNearby:String(territorial.estrato?.nearby?.name||""),
      estratoMatch:legacyMatch(territorial.estrato),
      estratoDistanceM:dist(territorial.estrato),
      estratoSource:territorial.estrato?.source||"",
      troncal,
      troncalStatus:territorial.troncal?.status||"",
      troncalNearby:String(territorial.troncal?.nearby?.name||""),
      troncalDistanceM:dist(territorial.troncal),
      troncalSource:territorial.troncal?.source||"",
      catalogId:territorial.catalogId||"",
      territorialFileId:territorial.territorialFileId||"",
      territorialDataSource:territorial.dataSource||"",
      isps:ispOptions(ispCity,competition),
      territorial
    });
  }catch(error){
    const status=error.status||500;
    console.error("EXPLORATION_GEO_ERROR",error?.message||error);
    return res.status(status).json({
      error:status===500?"No se pudo consultar la información geográfica.":error.message
    });
  }
};
