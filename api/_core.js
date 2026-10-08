const {google}=require("googleapis");
const admin=require("firebase-admin");
const crypto=require("crypto");

const PROJECT=process.env.FIREBASE_PROJECT_ID||"dashboards-fibrazo";
const SHEET_ID=process.env.GOOGLE_SHEET_ID;
const DEFAULT_DOMAIN=(process.env.ALLOWED_EMAIL_DOMAIN||"@fibrazo.com").toLowerCase();
const EXCEPTION=(process.env.ALLOWED_EMAIL_EXCEPTION||"fernandoemacchi@gmail.com").toLowerCase();
const BASE_ADMINS=[...new Set(["eduardo@fibrazo.com",EXCEPTION].map(v=>String(v).trim().toLowerCase()))];

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
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"FORMULARIOS!A2:AB"});
  return (r.data.values||[]).filter(row=>row[0]).map((row,index)=>{
    const legacyAccess=String(row[8]||"PRIVADO").toUpperCase();
    const domains=splitDomains(row[10]||"");
    const boolAt=(idx,fallback)=>row[idx]===undefined||row[idx]===""?fallback:toBool(row[idx]);
    return {
      row:index+2,id:String(row[0]||"").toUpperCase(),name:String(row[1]||""),description:String(row[2]||""),
      status:String(row[3]||"Activo"),slug:String(row[4]||""),sheet:String(row[5]||""),
      allowsGps:toBool(row[6]),allowsPhotos:toBool(row[7]),access:legacyAccess,
      allowedEmails:splitEmails(row[9]),domains,domain:domains[0]||"",
      rateLimit:clampInt(row[11],1,100,5),maxPhotos:clampInt(row[12],0,6,3),maxPhotoMb:clampNum(row[13],0.25,2,1.5),
      updatedBy:String(row[14]||""),updatedAt:String(row[15]||""),
      publicEnabled:boolAt(16,false),domainsEnabled:boolAt(17,legacyAccess==="DOMINIO"),emailsEnabled:boolAt(18,legacyAccess==="CORREOS"),
      introMessage:String(row[19]||"").slice(0,2000),completionMessage:String(row[20]||"").slice(0,2000),
      collectEmail:boolAt(21,true),shuffleQuestions:boolAt(22,false),showProgress:boolAt(23,true),allowMultipleResponses:boolAt(24,true),
      databaseUrl:String(row[25]||""),createdBy:String(row[26]||""),createdAt:String(row[27]||"")
    };
  });
}

async function loadUsers(auth){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"USUARIOS!A2:H"});
  return (r.data.values||[]).filter(row=>row[0]).map((row,index)=>({
    row:index+2,
    email:String(row[0]||"").trim().toLowerCase(),
    role:String(row[1]||"").toUpperCase(),
    status:String(row[2]||"").toUpperCase(),
    notes:String(row[3]||""),
    canCreateForms:toBool(row[4]),
    canManageUsers:toBool(row[5]),
    updatedBy:String(row[6]||""),
    updatedAt:String(row[7]||"")
  }));
}

async function loadFormPermissions(auth){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"PERMISOS_FORMULARIO!A2:H"});
  return (r.data.values||[]).filter(row=>row[0]&&row[1]).map((row,index)=>({
    row:index+2,
    email:String(row[0]||"").trim().toLowerCase(),
    formId:String(row[1]||"").trim().toUpperCase(),
    canView:toBool(row[2]),
    canEditForm:toBool(row[3]),
    canManagePermissions:toBool(row[4]),
    canViewDatabase:toBool(row[5]),
    updatedBy:String(row[6]||""),
    updatedAt:String(row[7]||"")
  }));
}

function isBaseAdmin(email){
  return BASE_ADMINS.includes(String(email||"").trim().toLowerCase());
}

function permissionFor(permissions,email,formId,baseAdmin=false){
  const normalizedEmail=String(email||"").trim().toLowerCase();
  const normalizedForm=String(formId||"").trim().toUpperCase();
  if(baseAdmin||isBaseAdmin(normalizedEmail)){
    return {canView:true,canEditForm:true,canManagePermissions:true,canViewDatabase:true};
  }
  const p=(permissions||[]).find(item=>item.email===normalizedEmail&&item.formId===normalizedForm);
  if(!p)return {canView:false,canEditForm:false,canManagePermissions:false,canViewDatabase:false};
  return {
    canView:!!p.canView||!!p.canEditForm||!!p.canManagePermissions||!!p.canViewDatabase,
    canEditForm:!!p.canEditForm,
    canManagePermissions:!!p.canManagePermissions,
    canViewDatabase:!!p.canViewDatabase||!!p.canManagePermissions
  };
}

async function userCapabilities(auth,email){
  const normalized=String(email||"").trim().toLowerCase();
  const base=isBaseAdmin(normalized);
  const [users,permissions]=await Promise.all([loadUsers(auth),loadFormPermissions(auth)]);
  const user=users.find(u=>u.email===normalized);
  const adminActive=base||!!(user&&user.status==="ACTIVO"&&["ADMIN","COLABORADOR"].includes(user.role));
  return {
    email:normalized,
    base,
    adminActive,
    canCreateForms:base||!!(adminActive&&user?.canCreateForms),
    canManageUsers:base||!!(adminActive&&user?.canManageUsers),
    user:user||null,
    permissions
  };
}

async function isAdmin(auth,email){
  return (await userCapabilities(auth,email)).adminActive;
}

function canUseDashboard(user,adminFlag=false,forms=[]){
  if(adminFlag)return true;
  const email=String(user?.email||"").trim().toLowerCase();
  if(!email)return false;
  return (forms||[]).some(form=>{
    if(String(form.status).toLowerCase()!=="activo")return false;
    if(form.emailsEnabled&&form.allowedEmails.includes(email))return true;
    if(form.domainsEnabled&&form.domains.some(domain=>email.endsWith(domain)))return true;
    return false;
  });
}

function canAccess(form,user,baseAdmin=false,adminPermission=null){
  if(!form||String(form.status).toLowerCase()!=="activo")return false;
  if(baseAdmin)return true;
  const email=String(user?.email||"").trim().toLowerCase();
  if(!email)return false;
  if(adminPermission?.canView)return true;
  if(form.emailsEnabled&&form.allowedEmails.includes(email))return true;
  if(form.domainsEnabled&&form.domains.some(domain=>email.endsWith(domain)))return true;
  return false;
}

function runtimePolicy(form){
  return {
    id:form.id,name:form.name,description:form.description,status:form.status,slug:form.slug,
    publicEnabled:!!form.publicEnabled,introMessage:form.introMessage||"",completionMessage:form.completionMessage||"",
    collectEmail:!!form.collectEmail,shuffleQuestions:!!form.shuffleQuestions,showProgress:!!form.showProgress,
    allowMultipleResponses:!!form.allowMultipleResponses,rateLimit:form.rateLimit,maxPhotos:form.maxPhotos,maxPhotoMb:form.maxPhotoMb,
    allowsGps:form.allowsGps,allowsPhotos:form.allowsPhotos
  };
}

function sanitizeForm(form){
  return {...runtimePolicy(form),access:form.access,allowedEmails:form.allowedEmails,domains:form.domains,
    emailsEnabled:!!form.emailsEnabled,domainsEnabled:!!form.domainsEnabled,updatedBy:form.updatedBy,updatedAt:form.updatedAt,
    databaseUrl:form.databaseUrl||"",createdBy:form.createdBy||"",createdAt:form.createdAt||""};
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
  }else if(formId==="EXPLORACION"||formId==="EXPLORACION_PRESENCIAL"){
    const lat=Number(payload.location?.lat),lng=Number(payload.location?.lng),acc=Number(payload.location?.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) throw httpError("GPS_REQUIRED",400);
    if(Number.isFinite(acc)&&acc<0) throw httpError("INVALID_GPS",400);

    if(formId==="EXPLORACION"){
      const currentYear=new Date().getFullYear();
      if(!digits(d.anio_imagen,4)||Number(d.anio_imagen)>currentYear) throw httpError("INVALID_STREETVIEW_YEAR",400);
    }
    one(d.estrato,["1","2","3","4","5","6","Sin información"],"INVALID_STRATUM");
    if(!["1","2","3","4","5"].includes(String(d.tipo_terreno||""))) throw httpError("INVALID_TERRAIN_TRANSITABILITY",400);
    if(formId==="EXPLORACION_PRESENCIAL"){
      if(!String(d.municipio||"").trim()) throw httpError("INVALID_MUNICIPALITY",400);
      short(d.municipio,120,"TEXT_TOO_LONG");
    }

    for(const key of ["condicion_fisica_posteria","condicion_ocupacion_tendido"]){
      if(!["1","2","3","4","5"].includes(String(d[key]||""))) throw httpError("INVALID_INFRASTRUCTURE_VALUE_"+key.toUpperCase(),400);
    }

    const network=["Sí","No"];
    for(const key of ["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar"]) one(d[key],network,"INVALID_NETWORK_VALUE");

    const incumbentSelected=["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar"].some(key=>String(d[key]||"")==="Sí");
    const ispSelected=["isp_1","isp_2","isp_3","isp_4"].some(key=>{
      const value=String(d[key]||"").trim();
      return value&&value!=="Sin ISP";
    });
    if(!incumbentSelected&&!ispSelected) throw httpError("OPERATOR_REQUIRED",400);

    for(const key of ["sector_barrio","isp_1","isp_2","isp_3","isp_4"]) short(d[key],120,"TEXT_TOO_LONG");
    short(d.link_evidencia,1000,"TEXT_TOO_LONG");
    short(d.nota,2000,"TEXT_TOO_LONG");
  }else if(formId==="INTELIGENCIA_OPERADOR"){
    const lat=Number(payload.location?.lat),lng=Number(payload.location?.lng),acc=Number(payload.location?.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) throw httpError("GPS_REQUIRED",400);
    if(Number.isFinite(acc)&&acc<0) throw httpError("INVALID_GPS",400);
    if(!String(d.operador||"").trim()) throw httpError("OPERATOR_REQUIRED",400);
    if(!String(d.municipio||payload.location?.cityDetected||"").trim()) throw httpError("INVALID_MUNICIPALITY",400);
    if(!["1","2","3","4","5"].includes(String(d.calidad_tendido||""))) throw httpError("INVALID_NETWORK_QUALITY",400);
    if(d.calidad_servicio_percibida&&!["1","2","3","4","5"].includes(String(d.calidad_servicio_percibida))) throw httpError("INVALID_SERVICE_QUALITY",400);
    if(d.incluye_tv&&!["Sí","No","No sabe"].includes(String(d.incluye_tv))) throw httpError("INVALID_TV_OPTION",400);
    if(d.grilla_tv&&!["Amplia","Reducida","No sabe"].includes(String(d.grilla_tv))) throw httpError("INVALID_TV_GRID",400);
    one(d.estrato,["1","2","3","4","5","6","Sin información"],"INVALID_STRATUM");
    for(const key of ["operador","modelo_caja","nomenclatura_caja","marquilla","marquilla_drop","tipo_tensor","tensor_acometida","municipio","sector_barrio"]) short(d[key],120,"TEXT_TOO_LONG");
    short(d.observaciones,2000,"TEXT_TOO_LONG");
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

module.exports={PROJECT,SHEET_ID,DEFAULT_DOMAIN,EXCEPTION,BASE_ADMINS,gauth,verifyUser,loadForms,loadUsers,loadFormPermissions,isBaseAdmin,permissionFor,userCapabilities,isAdmin,canUseDashboard,canAccess,runtimePolicy,sanitizeForm,hashIp,checkPublicRate,logSecurity,validatePublicGuards,validatePhotos,validateSubmission,httpError,splitEmails,splitDomains,clampInt,clampNum};
