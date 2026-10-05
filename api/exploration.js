const {google}=require("googleapis");
const {gauth,verifyUser,httpError}=require("./_core");
const {resolveTerritorial,TERRITORIAL_VERSION}=require("./_territorial");

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
    ["piedecuesta","Piedecuesta"]
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
  const [operators,presence]=await Promise.all([
    values(sheets,COMPETENCIA_SHEET_ID,"01_OPERADORES!A2:P1000").catch(()=>[]),
    values(sheets,COMPETENCIA_SHEET_ID,"03_PRESENCIA!C2:J3000").catch(()=>[])
  ]);
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
    const [territorial,competition]=await Promise.all([
      resolveTerritorial(auth,lat,lng),
      loadCompetition(auth)
    ]);

    const city=territorial.city?.status==="DENTRO"
      ?canonicalCity(territorial.city.assigned?.name||"")
      :"";
    const cityNearby=canonicalCity(territorial.city?.nearby?.name||"");
    const hint=canonicalCity(req.query.city||"");
    const ispCity=city||cityNearby||hint;

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
