const {google}=require("googleapis");
const admin=require("firebase-admin");
const crypto=require("crypto");

const PROJECT=process.env.FIREBASE_PROJECT_ID||"dashboards-fibrazo";
const SHEET_ID=process.env.GOOGLE_SHEET_ID;
const DEFAULT_DOMAIN=(process.env.ALLOWED_EMAIL_DOMAIN||"@fibrazo.com").toLowerCase();
const EXCEPTION=(process.env.ALLOWED_EMAIL_EXCEPTION||"fernandoemacchi@gmail.com").toLowerCase();

if(!admin.apps.length) admin.initializeApp({projectId:PROJECT});

function gauth(){
  return new google.auth.JWT({
    email:process.env.GOOGLE_CLIENT_EMAIL,
    key:(process.env.GOOGLE_PRIVATE_KEY||"").replace(/\\n/g,"\n"),
    scopes:["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/drive"]
  });
}

async function verifyUser(req,{required=true}={}){
  const header=req.headers.authorization||"";
  if(!header.startsWith("Bearer ")){
    if(required) throw httpError("AUTH_REQUIRED",401);
    return null;
  }
  try{
    const decoded=await admin.auth().verifyIdToken(header.slice(7));
    const email=String(decoded.email||"").trim().toLowerCase();
    if(!decoded.email_verified||!email) throw new Error("bad user");
    return {email};
  }catch(_){
    if(required) throw httpError("AUTH_REQUIRED",401);
    return null;
  }
}

async function loadForms(auth){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"FORMULARIOS!A2:P"});
  return (r.data.values||[]).filter(row=>row[0]).map((row,index)=>({
    row:index+2,
    id:String(row[0]||"").toUpperCase(),
    name:String(row[1]||""),
    description:String(row[2]||""),
    status:String(row[3]||""),
    slug:String(row[4]||""),
    sheet:String(row[5]||""),
    allowsGps:toBool(row[6]),
    allowsPhotos:toBool(row[7]),
    access:String(row[8]||"DOMINIO").toUpperCase(),
    allowedEmails:splitEmails(row[9]),
    domains:splitDomains(row[10]||DEFAULT_DOMAIN),
    domain:splitDomains(row[10]||DEFAULT_DOMAIN)[0]||DEFAULT_DOMAIN,
    rateLimit:clampInt(row[11],1,100,5),
    maxPhotos:clampInt(row[12],0,3,0),
    maxPhotoMb:clampNum(row[13],0.25,2,1.5),
    updatedBy:String(row[14]||""),
    updatedAt:String(row[15]||"")
  }));
}

async function loadUsers(auth){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"USUARIOS!A2:D"});
  return (r.data.values||[]).filter(row=>row[0]).map(row=>({
    email:String(row[0]||"").trim().toLowerCase(),
    role:String(row[1]||"").toUpperCase(),
    status:String(row[2]||"").toUpperCase()
  }));
}

async function isAdmin(auth,email){
  if(!email) return false;
  const users=await loadUsers(auth);
  return users.some(u=>u.email===email.toLowerCase()&&u.role==="ADMIN"&&u.status==="ACTIVO");
}

function canUseDashboard(user,adminFlag=false,forms=[]){
  if(adminFlag)return true;
  const email=String(user?.email||"").trim().toLowerCase();
  if(!email)return false;
  if(email.endsWith(DEFAULT_DOMAIN))return true;
  return (forms||[]).some(form=>{
    if(String(form.status).toLowerCase()!=="activo")return false;
    if(form.access==="CORREOS")return form.allowedEmails.includes(email);
    if(form.access==="DOMINIO")return (form.domains||[]).some(domain=>email.endsWith(domain));
    return false;
  });
}

function canAccess(form,user,adminFlag=false){
  if(!form||String(form.status).toLowerCase()!=="activo") return false;
  if(adminFlag) return true;
  const email=String(user?.email||"").toLowerCase();
  switch(form.access){
    case "PUBLICO": return true;
    case "PRIVADO": return false;
    case "CORREOS": return !!email&&form.allowedEmails.includes(email);
    case "DOMINIO": return !!email&&(form.domains||[form.domain||DEFAULT_DOMAIN]).some(domain=>email.endsWith(domain));
    default: return false;
  }
}

function sanitizeForm(form){
  return {
    id:form.id,name:form.name,description:form.description,status:form.status,slug:form.slug,
    access:form.access,allowedEmails:form.allowedEmails,domains:form.domains||[form.domain].filter(Boolean),domain:form.domain,
    rateLimit:form.rateLimit,maxPhotos:form.maxPhotos,maxPhotoMb:form.maxPhotoMb,
    allowsGps:form.allowsGps,allowsPhotos:form.allowsPhotos,updatedBy:form.updatedBy,updatedAt:form.updatedAt
  };
}

function clientIp(req){
  const raw=req.headers["x-forwarded-for"]||req.headers["x-real-ip"]||"unknown";
  return String(raw).split(",")[0].trim();
}
function hashIp(req){
  return crypto.createHash("sha256").update(PROJECT+"|"+clientIp(req)).digest("hex").slice(0,24);
}

async function checkPublicRate(auth,form,req){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"SECURITY_LOG!A2:E5000"});
  const hash=hashIp(req),cutoff=Date.now()-10*60*1000;
  const count=(r.data.values||[]).filter(row=>
    row[1]===form.id&&row[2]===hash&&row[3]==="PUBLIC_SUBMIT"&&new Date(row[0]).getTime()>=cutoff
  ).length;
  if(count>=form.rateLimit) throw httpError("RATE_LIMIT",429);
  return hash;
}

async function logSecurity(auth,{formId,ipHash,event="PUBLIC_SUBMIT",result="OK",detail="",req}){
  const sheets=google.sheets({version:"v4",auth});
  await sheets.spreadsheets.values.append({
    spreadsheetId:SHEET_ID,range:"SECURITY_LOG!A:G",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",
    requestBody:{values:[[new Date().toISOString(),formId||"",ipHash||"",event,result,String(detail||"").slice(0,250),String(req?.headers?.["user-agent"]||"").slice(0,250)]]}
  });
}

function validatePublicGuards(payload){
  if(String(payload.website||"").trim()) throw httpError("SPAM_REJECTED",400);
  const started=Number(payload.startedAt||0);
  const elapsed=Date.now()-started;
  if(!started||elapsed<2500||elapsed>6*60*60*1000) throw httpError("INVALID_FORM_TIMING",400);
}

function validatePhotos(list,form){
  const photos=Array.isArray(list)?list:[];
  if(photos.length>form.maxPhotos) throw httpError("PHOTO_LIMIT",400);
  if(!form.allowsPhotos&&photos.length) throw httpError("PHOTOS_NOT_ALLOWED",400);
  let total=0;
  for(const photo of photos){
    const m=String(photo?.data||"").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
    if(!m) throw httpError("INVALID_PHOTO",400);
    const bytes=Math.floor(m[2].length*3/4);
    if(bytes>form.maxPhotoMb*1024*1024) throw httpError("PHOTO_TOO_LARGE",400);
    total+=bytes;
  }
  if(total>4*1024*1024) throw httpError("PHOTOS_TOO_LARGE",400);
}

function validateSubmission(formId,payload){
  const d=payload.data||{};
  const text=(v,max=500)=>String(v??"").trim().slice(0,max);
  const digits=(v,max=12)=>/^\d+$/.test(String(v??""))&&String(v).length<=max;
  const one=(v,allowed,code)=>{if(v!==""&&v!=null&&!allowed.includes(v))throw httpError(code,400);};
  const short=(v,max,code)=>{if(String(v??"").length>max)throw httpError(code,400);};

  if(formId==="CHURN"){
    const motivos=["Inconformidad con el servicio","Precio","Se pasó a otro operador","TV","Mudanza","No usa / no necesita el servicio","Problemas de recarga / pago","Otro"];
    const configuredCities=["Sincelejo","Montería"];
    const lat=Number(payload.location?.lat),lng=Number(payload.location?.lng),acc=Number(payload.location?.accuracy);
    const citySource=text(payload.location?.citySource,20);
    const cityDetected=text(payload.location?.cityDetected,100);
    const city=text(d.ciudad,100);
    const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) throw httpError("GPS_REQUIRED",400);
    if(Number.isFinite(acc)&&acc<0) throw httpError("INVALID_GPS",400);
    if(!city) throw httpError("INVALID_CITY",400);
    if(citySource&&!["gps","manual"].includes(citySource)) throw httpError("INVALID_CITY_SOURCE",400);
    if(citySource==="manual"&&!configuredCities.includes(city)) throw httpError("INVALID_CITY",400);
    if(citySource==="gps"&&cityDetected&&norm(city)!==norm(cityDetected)) throw httpError("INVALID_GPS_CITY",400);
    if(!citySource&&!configuredCities.includes(city)) throw httpError("INVALID_CITY",400);
    if(!digits(d.cliente_id,20)) throw httpError("INVALID_CLIENT_ID",400);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text(d.fecha_visita,10))) throw httpError("INVALID_DATE",400);
    if(!motivos.includes(d.motivo_principal)) throw httpError("INVALID_REASON",400);
    if(!["Sí","No"].includes(d.tiene_servicio_actual)) throw httpError("INVALID_CURRENT_SERVICE",400);
    one(d.incluye_tv,["Sí","No"],"INVALID_TV");
    one(d.tecnologia_tv,["Coaxial","Digital / App","TV Box","Otro"],"INVALID_TV_TECH");
    one(d.tiene_disney,["Sí","No","No sabe"],"INVALID_DISNEY");
    one(d.tiene_deportes,["Sí","No","No sabe"],"INVALID_SPORTS");
    one(d.volveria,["Sí","No","Tal vez"],"INVALID_RETURN");
    for(const key of ["precio_actual","velocidad_actual","tv_coaxial","tv_box"]){
      if(d[key]!==""&&d[key]!=null&&!digits(d[key],12)) throw httpError("INVALID_NUMBER_"+key.toUpperCase(),400);
    }
    const incAllowed=["Mantenimiento no realizado","Demora en mantenimiento","Lentitud","Intermitencia","Demora en mudanza","Atención al cliente","Otro"];
    if(Array.isArray(d.inconformidad_tipo)&&d.inconformidad_tipo.some(v=>!incAllowed.includes(v))) throw httpError("INVALID_DISSATISFACTION",400);
    short(d.operador_actual,100,"TEXT_TOO_LONG");short(d.canales_destacados,1000,"TEXT_TOO_LONG");short(d.cambio_para_volver,1500,"TEXT_TOO_LONG");short(d.comentario,2000,"TEXT_TOO_LONG");
  }else if(formId==="EXPLORACION"){
    if(!text(d.ciudad,100)) throw httpError("MISSING_CITY",400);
    if(!digits(d.anio,4)) throw httpError("INVALID_YEAR",400);
    const lat=Number(payload.location?.lat),lng=Number(payload.location?.lng),acc=Number(payload.location?.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) throw httpError("GPS_REQUIRED",400);
    if(Number.isFinite(acc)&&acc<0) throw httpError("INVALID_GPS",400);
    for(const key of ["e_postes","s_postes"]){
      if(d[key]!==""&&d[key]!=null&&!digits(d[key],8)) throw httpError("INVALID_NUMBER_"+key.toUpperCase(),400);
    }
    const network=["Sí","No","No validado"];
    for(const key of ["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar"]) one(d[key],network,"INVALID_NETWORK_VALUE");
    for(const key of ["ciudad","sector_barrio","isp_1","isp_2","isp_3","isp_4"]) short(d[key],120,"TEXT_TOO_LONG");
    short(d.nota,2000,"TEXT_TOO_LONG");
  }else{
    throw httpError("INVALID_FORM",400);
  }
}

function httpError(message,status){const e=new Error(message);e.status=status;return e;}
function splitEmails(value){return String(value||"").split(/[;,\n]+/).map(v=>v.trim().toLowerCase()).filter(Boolean);}
function splitDomains(value){
  const raw=Array.isArray(value)?value:String(value||"").split(/[;,\n]+/);
  return [...new Set(raw.map(v=>{
    let d=String(v||"").trim().toLowerCase();
    if(!d)return"";
    if(!d.startsWith("@"))d="@"+d;
    return d;
  }).filter(Boolean))];
}
function toBool(v){return v===true||String(v).toUpperCase()==="TRUE";}
function clampInt(v,min,max,fallback){const n=parseInt(v,10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function clampNum(v,min,max,fallback){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}

module.exports={PROJECT,SHEET_ID,DEFAULT_DOMAIN,EXCEPTION,gauth,verifyUser,loadForms,loadUsers,isAdmin,canUseDashboard,canAccess,sanitizeForm,hashIp,checkPublicRate,logSecurity,validatePublicGuards,validatePhotos,validateSubmission,httpError,splitEmails,splitDomains,clampInt,clampNum};
