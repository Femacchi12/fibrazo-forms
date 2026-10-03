const {google}=require("googleapis");
const {Readable}=require("stream");
const {
  gauth,verifyUser,loadForms,isAdmin,canUseDashboard,canAccess,checkPublicRate,logSecurity,
  validatePublicGuards,validatePhotos,validateSubmission,httpError,SHEET_ID,DEFAULT_DOMAIN,EXCEPTION
}=require("./_core");

const LEGACY_PHOTO_FOLDER_ENV={
  CHURN:"DRIVE_CHURN_FOLDER_ID",
  EXPLORACION:"DRIVE_EXPLORACION_FOLDER_ID",
  EXPLORACION_PRESENCIAL:"DRIVE_EXPLORACION_FOLDER_ID"
};
const MASTER_SHEET_ID=process.env.BUCARAMANGA_EXPLORACION_SHEET_ID||"1LKNNf7a1VlUGpr9SlRqJGAkZq4NprW-wvdjNIlmB4E4";
let masterPolygonCache=null;
const PHOTO_ROOT_FOLDER_ID=process.env.DRIVE_FORMS_ROOT_FOLDER_ID||"0AF3Q3h3jUqsoUk9PVA";
const photoFolderCache=new Map();

const idFor=form=>`${form}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

function driveQueryValue(value){return String(value||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
function photoFolderName(form){
  const source=String(form.slug||form.id||"Formulario").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return source
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part=>part.charAt(0).toUpperCase()+part.slice(1).toLowerCase())
    .join(" ")||String(form.id||"Formulario");
}

async function resolvePhotoFolder(auth,form){
  if(photoFolderCache.has(form.id)) return photoFolderCache.get(form.id);

  const legacyEnv=LEGACY_PHOTO_FOLDER_ENV[form.id];
  const legacyFolder=legacyEnv?String(process.env[legacyEnv]||"").trim():"";
  if(legacyFolder){
    photoFolderCache.set(form.id,legacyFolder);
    return legacyFolder;
  }

  if(!PHOTO_ROOT_FOLDER_ID) throw httpError("PHOTO_ROOT_FOLDER_NOT_CONFIGURED",500);
  const drive=google.drive({version:"v3",auth});
  const name=photoFolderName(form);
  const escapedName=driveQueryValue(name);
  const escapedRoot=driveQueryValue(PHOTO_ROOT_FOLDER_ID);

  const existing=await drive.files.list({
    q:`'${escapedRoot}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields:"files(id,name)",
    pageSize:10,
    corpora:"drive",
    driveId:PHOTO_ROOT_FOLDER_ID,
    includeItemsFromAllDrives:true,
    supportsAllDrives:true
  });
  if(existing.data.files?.length){
    const folderId=existing.data.files[0].id;
    photoFolderCache.set(form.id,folderId);
    return folderId;
  }

  const created=await drive.files.create({
    requestBody:{
      name,
      mimeType:"application/vnd.google-apps.folder",
      parents:[PHOTO_ROOT_FOLDER_ID],
      appProperties:{fibrazoFormId:String(form.id||""),managedBy:"fibrazo-forms"}
    },
    fields:"id,name",
    supportsAllDrives:true
  });
  const folderId=created.data.id;
  if(!folderId) throw httpError("PHOTO_FOLDER_CREATE_FAILED",500);
  photoFolderCache.set(form.id,folderId);
  return folderId;
}

async function uploadPhotos(auth,form,id,list){
  const photos=Array.isArray(list)?list:[];
  if(!photos.length) return [];
  const folderId=await resolvePhotoFolder(auth,form);
  const drive=google.drive({version:"v3",auth});
  const links=[];
  for(let i=0;i<photos.length;i++){
    const match=String(photos[i].data||"").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    if(!match) throw httpError("INVALID_PHOTO",400);
    const ext=match[1].toLowerCase().includes("png")?"png":match[1].toLowerCase().includes("webp")?"webp":"jpg";
    const name=`${id}_foto_${i+1}.${ext}`;
    const escaped=name.replace(/'/g,"\\'");
    const existing=await drive.files.list({
      q:`'${folderId}' in parents and name = '${escaped}' and trashed = false`,
      fields:"files(id,webViewLink)",
      pageSize:1,
      supportsAllDrives:true,
      includeItemsFromAllDrives:true
    });
    if(existing.data.files?.length){
      const file=existing.data.files[0];
      links.push(file.webViewLink||`https://drive.google.com/file/d/${file.id}/view`);
      continue;
    }
    const created=await drive.files.create({
      requestBody:{name,parents:[folderId]},
      media:{mimeType:match[1],body:Readable.from(Buffer.from(match[2],"base64"))},
      fields:"id,webViewLink",
      supportsAllDrives:true
    });
    links.push(created.data.webViewLink||`https://drive.google.com/file/d/${created.data.id}/view`);
  }
  return links;
}

function isExploration(formId){
  return formId==="EXPLORACION"||formId==="EXPLORACION_PRESENCIAL";
}

function buildRow(form,p,id,links,email){
  const d=p.data||{},l=p.location||{},now=new Date().toISOString();
  if(form.id==="CHURN"){
    return [
      now,id,d.ciudad||"",d.cliente_id||"",d.fecha_visita||"",d.motivo_principal||"",
      Array.isArray(d.inconformidad_tipo)?d.inconformidad_tipo.join(" | "):d.inconformidad_tipo||"",
      d.tiene_servicio_actual||"",d.operador_actual||"",d.precio_actual||"",d.velocidad_actual||"",
      d.incluye_tv||"",d.tecnologia_tv||"",d.tv_coaxial||"",d.tv_box||"",d.tiene_disney||"",
      d.tiene_deportes||"",d.canales_destacados||"",d.volveria||"",d.cambio_para_volver||"",
      d.comentario||"",l.lat||"",l.lng||"",l.accuracy||"",links.join(" | "),email||"ANONIMO",l.cityDetected||"",l.citySource||""
    ];
  }
  const maps=Number.isFinite(Number(l.lat))&&Number.isFinite(Number(l.lng))
    ?`https://www.google.com/maps?q=${l.lat},${l.lng}`:"";
  const tipo=form.id==="EXPLORACION"?"Virtual":"Presencial";
  return [
    now,id,d.municipio||l.cityDetected||"",d.sector_barrio||"",d.anio_imagen||"",
    d.condicion_fisica_posteria||"",d.condicion_ocupacion_tendido||"",
    d.tigo_hfc||"",d.tigo_ftth||"",d.claro_hfc||"",d.claro_ftth||"",d.movistar||"",
    d.isp_1||"",d.isp_2||"",d.isp_3||"",d.isp_4||"",d.nota||"",
    l.lat||"",l.lng||"",l.accuracy||"",maps,links[0]||"",links[1]||"",links[2]||"",
    email||"ANONIMO","0.8",tipo,d.link_evidencia||""
  ];
}

function num(v){
  const n=Number(String(v??"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}

function parsePolygonWkt(wkt){
  const s=String(wkt||"").trim(),m=s.match(/^POLYGON\s*\(\((.*)\)\)$/i);
  if(!m)return[];
  return m[1].split(/\)\s*,\s*\(/).map(txt=>
    txt.split(",").map(pair=>{
      const p=pair.trim().split(/\s+/);return[Number(p[0]),Number(p[1])];
    }).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]))
  ).filter(r=>r.length>=3);
}

function pointOnSegment(px,py,x1,y1,x2,y2){
  const eps=1e-10,cross=(px-x1)*(y2-y1)-(py-y1)*(x2-x1);
  return Math.abs(cross)<=eps&&px>=Math.min(x1,x2)-eps&&px<=Math.max(x1,x2)+eps&&py>=Math.min(y1,y2)-eps&&py<=Math.max(y1,y2)+eps;
}
function pointInRing(x,y,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if(pointOnSegment(x,y,xj,yj,xi,yi))return true;
    const crosses=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-30)+xi);
    if(crosses)inside=!inside;
  }
  return inside;
}
function pointInPolygon(x,y,rings){
  if(!rings.length||!pointInRing(x,y,rings[0]))return false;
  for(let i=1;i<rings.length;i++)if(pointInRing(x,y,rings[i]))return false;
  return true;
}
function localDistance(lon1,lat1,lon2,lat2,latRef){
  const R=6371000,rad=Math.PI/180;
  return Math.hypot((lon2-lon1)*R*Math.cos(latRef*rad)*rad,(lat2-lat1)*R*rad);
}
function bboxDistance(lon,lat,p){
  return localDistance(lon,lat,Math.max(p.minLon,Math.min(p.maxLon,lon)),Math.max(p.minLat,Math.min(p.maxLat,lat)),lat);
}
function segmentDistance(px,py,x1,y1,x2,y2){
  const R=6371000,rad=Math.PI/180,xScale=R*Math.cos(py*rad)*rad,yScale=R*rad;
  const ax=(x1-px)*xScale,ay=(y1-py)*yScale,bx=(x2-px)*xScale,by=(y2-py)*yScale;
  const vx=bx-ax,vy=by-ay,vv=vx*vx+vy*vy;
  let t=vv?-(ax*vx+ay*vy)/vv:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+t*vx,ay+t*vy);
}
function polygonDistance(lon,lat,rings){
  let best=Infinity;
  for(const ring of rings)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],d=segmentDistance(lon,lat,a[0],a[1],b[0],b[1]);
    if(d<best)best=d;
  }
  return best;
}

async function loadMasterPolygons(sheets){
  if(masterPolygonCache)return masterPolygonCache;
  const r=await sheets.spreadsheets.values.get({spreadsheetId:MASTER_SHEET_ID,range:"03_POLIGONOS_ESTRATOS!A2:I"});
  masterPolygonCache=(r.data.values||[]).map(row=>({
    id:String(row[0]||""),municipio:String(row[1]||""),estrato:String(row[2]||""),
    minLon:num(row[4]),minLat:num(row[5]),maxLon:num(row[6]),maxLat:num(row[7]),rings:parsePolygonWkt(row[8])
  })).filter(p=>p.id&&/^[1-6]$/.test(p.estrato)&&p.rings.length&&[p.minLon,p.minLat,p.maxLon,p.maxLat].every(Number.isFinite));
  return masterPolygonCache;
}

function matchMasterPolygon(lon,lat,polygons){
  for(const p of polygons){
    if(lon<p.minLon||lon>p.maxLon||lat<p.minLat||lat>p.maxLat)continue;
    if(pointInPolygon(lon,lat,p.rings))return{polygon:p,distance:0,method:"Dentro del polígono"};
  }
  const candidates=polygons.map(p=>({p,min:bboxDistance(lon,lat,p)})).sort((a,b)=>a.min-b.min);
  let best=null,bestDistance=Infinity;
  for(const item of candidates){
    if(item.min>bestDistance)break;
    const d=polygonDistance(lon,lat,item.p.rings);
    if(d<bestDistance){best=item.p;bestDistance=d;}
  }
  return best?{polygon:best,distance:Math.round(bestDistance*10)/10,method:"Más cercano"}:null;
}

function nextSequence(values,re){
  let max=0;
  for(const row of values||[]){
    const m=String(row[0]||"").match(re);if(m)max=Math.max(max,Number(m[1]));
  }
  return max+1;
}

async function syncExplorationMaster(auth,form,payload,links){
  if(!isExploration(form.id)||!MASTER_SHEET_ID)return{ok:false,reason:"NOT_APPLICABLE"};
  const sheets=google.sheets({version:"v4",auth}),d=payload.data||{},l=payload.location||{};
  const lat=num(l.lat),lon=num(l.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return{ok:false,reason:"NO_COORDINATES"};

  const polygons=await loadMasterPolygons(sheets),geo=matchMasterPolygon(lon,lat,polygons);
  if(!geo)return{ok:false,reason:"NO_POLYGON_DATA"};
  if(geo.method==="Más cercano"&&Number(geo.distance)>5000){
    return{ok:false,reason:"OUTSIDE_STUDY_AREA",distance:geo.distance};
  }

  const [pointIds,compIds]=await Promise.all([
    sheets.spreadsheets.values.get({spreadsheetId:MASTER_SHEET_ID,range:"01_PUNTOS_RELEVAMIENTO!A2:A"}),
    sheets.spreadsheets.values.get({spreadsheetId:MASTER_SHEET_ID,range:"02_COMPETENCIA_PUNTO!A2:A"})
  ]);
  const pointNo=nextSequence(pointIds.data.values,/^BGF_P(\d+)$/i),pointId="BGF_P"+String(pointNo).padStart(4,"0");
  const nextRow=(pointIds.data.values||[]).length+2;
  const today=new Date().toISOString().slice(0,10);
  const fuente=form.id==="EXPLORACION"?"Street View":"Presencial";
  const estado=form.id==="EXPLORACION"?"Virtual":"Validado en campo";
  const evidence=form.id==="EXPLORACION"?(d.link_evidencia||""):(links.join(" | ")||"");
  const municipioObservado=d.municipio||l.cityDetected||geo.polygon.municipio||"";

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId:MASTER_SHEET_ID,
    requestBody:{valueInputOption:"USER_ENTERED",data:[
      {range:`01_PUNTOS_RELEVAMIENTO!A${nextRow}:G${nextRow}`,values:[[
        pointId,today,fuente,d.anio_imagen||"",municipioObservado,d.sector_barrio||"",`${lat}, ${lon}`
      ]]},
      {range:`01_PUNTOS_RELEVAMIENTO!K${nextRow}:U${nextRow}`,values:[[
        geo.polygon.id,geo.polygon.municipio,Number(geo.polygon.estrato),geo.distance,geo.method,
        Number(d.condicion_fisica_posteria),Number(d.condicion_ocupacion_tendido),d.nota||"",evidence,estado,new Date().toISOString()
      ]]},
      {range:`01_PUNTOS_RELEVAMIENTO!V${nextRow}`,values:[[
        Number.isFinite(Number(l.accuracy))?Math.round(Number(l.accuracy)*10)/10:""
      ]]}
    ]}
  });

  let compNo=nextSequence(compIds.data.values,/^BGF_C(\d+)$/i);
  const operators=[];
  const addTraditional=(name,tech,value)=>{
    if(value==="Sí")operators.push({name,category:"Operador tradicional / incumbente",tech});
  };
  addTraditional("Tigo","HFC",d.tigo_hfc);addTraditional("Tigo","FTTH",d.tigo_ftth);
  addTraditional("Claro","HFC",d.claro_hfc);addTraditional("Claro","FTTH",d.claro_ftth);
  addTraditional("Movistar","No identificada",d.movistar);
  for(const key of ["isp_1","isp_2","isp_3","isp_4"]){
    const name=String(d[key]||"").trim();
    if(name)operators.push({name,category:"ISP local / regional",tech:"No identificada"});
  }
  if(operators.length){
    const confidence=form.id==="EXPLORACION"?"Media":"Alta";
    const rows=operators.map(op=>[
      "BGF_C"+String(compNo++).padStart(4,"0"),pointId,op.name,op.category,op.tech,
      "Cable identificado",confidence,d.nota||"",new Date().toISOString(),
      geo.polygon.municipio,Number(geo.polygon.estrato),d.sector_barrio||"",fuente,evidence
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId:MASTER_SHEET_ID,range:"02_COMPETENCIA_PUNTO!A:I",
      valueInputOption:"USER_ENTERED",insertDataOption:"INSERT_ROWS",
      requestBody:{values:rows.map(row=>row.slice(0,9))}
    });
  }
  return{ok:true,pointId,municipio:geo.polygon.municipio,estrato:geo.polygon.estrato,method:geo.method,distance:geo.distance};
}

function resolveSubmissionId(payload,formId){
  const supplied=String(payload.clientSubmissionId||"").trim();
  if(!supplied) return idFor(formId);
  if(!/^LOCAL-[A-Z0-9_-]+-\d{10,}-[A-Z0-9]{4,20}$/.test(supplied)) throw httpError("INVALID_CLIENT_SUBMISSION_ID",400);
  if(!supplied.startsWith("LOCAL-"+formId+"-")) throw httpError("INVALID_CLIENT_SUBMISSION_ID",400);
  return supplied;
}

async function submissionExists(auth,form,id){
  const sheets=google.sheets({version:"v4",auth});
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:`${form.sheet}!B2:B`});
  return (r.data.values||[]).some(row=>String(row[0]||"")===id);
}

async function hasExistingResponseForEmail(auth,form,email){
  if(!form.collectEmail||form.allowMultipleResponses||!email)return false;
  const sheets=google.sheets({version:"v4",auth});
  const column=form.id==="CHURN"?"Z":"Y";
  const r=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:`${form.sheet}!${column}2:${column}`});
  const target=String(email).trim().toLowerCase();
  return (r.data.values||[]).some(row=>String(row[0]||"").trim().toLowerCase()===target);
}

async function readRows(auth,forms,requested,limit,user,adminFlag){
  const selected=requested==="all"?forms:forms.filter(form=>form.id===requested);
  const email=String(user?.email||"").toLowerCase();
  const internal=email===EXCEPTION||email.endsWith(DEFAULT_DOMAIN);
  const allowed=selected.filter(form=>adminFlag||(form.access==="PUBLICO"?internal:canAccess(form,user,false)));
  const sheets=google.sheets({version:"v4",auth});
  const out=[];
  for(const form of allowed){
    const r=await sheets.spreadsheets.values.get({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!A2:AB`
    });
    for(const row of (r.data.values||[]).slice(-limit).reverse()){
      if(form.id==="CHURN"){
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{ciudad:row[2],cliente_id:row[3],motivo_principal:row[5]},
          user:row[25]||""
        });
      }else if(isExploration(form.id)){
        const tipo=String(row[26]||"").trim();
        const belongs=form.id==="EXPLORACION"
          ?(!tipo||tipo==="Virtual")
          :tipo==="Presencial";
        if(!belongs)continue;
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{ciudad:row[2],sector_barrio:row[3],tigo_hfc:row[7],claro_hfc:row[9],movistar:row[11],tipo},
          user:row[24]||""
        });
      }
    }
  }
  return out.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,limit);
}

function classifyMasterSyncError(error){
  const status=Number(error?.code||error?.response?.status||error?.response?.statusCode||0);
  const message=String(error?.message||error?.response?.data?.error?.message||"").toLowerCase();
  if(status===403||/permission|forbidden|insufficient permission|does not have permission/.test(message))return"MASTER_ACCESS_DENIED";
  if(status===404||/not found|requested entity was not found/.test(message))return"MASTER_NOT_FOUND";
  if(status===429||/rate limit|quota exceeded|too many requests/.test(message))return"MASTER_RATE_LIMIT";
  if(/timeout|timed out|deadline/.test(message))return"MASTER_TIMEOUT";
  return"SYNC_ERROR";
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  let auth;
  let publicContext=null;
  try{
    auth=gauth();

    if(req.method==="GET"){
      const user=await verifyUser(req);
      const adminFlag=await isAdmin(auth,user.email);
      const forms=await loadForms(auth);
      if(!canUseDashboard(user,adminFlag,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
      const requested=String(req.query.form||"all").toUpperCase();
      const limit=Math.min(Number(req.query.limit)||100,250);
      return res.status(200).json({
        rows:await readRows(auth,forms,requested==="ALL"?"all":requested,limit,user,adminFlag)
      });
    }

    if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

    const payload=req.body||{};
    const formId=String(payload.formId||"").toUpperCase();
    const forms=await loadForms(auth);
    const form=forms.find(item=>item.id===formId);
    if(!form) throw httpError("INVALID_FORM",400);
    if(String(form.status).toLowerCase()!=="activo") throw httpError("FORM_INACTIVE",403);

    let user=null;
    let adminFlag=false;

    const isPublicRequest=payload.publicMode===true||(!req.headers.authorization&&form.publicEnabled);
    if(isPublicRequest){
      if(!form.publicEnabled) throw httpError("FORM_NOT_PUBLIC",403);
      user=form.collectEmail?await verifyUser(req):await verifyUser(req,{required:false});
      validatePublicGuards(payload);
      publicContext={ipHash:await checkPublicRate(auth,form,req)};
    }else{
      user=await verifyUser(req);
      adminFlag=await isAdmin(auth,user.email);
      if(!canUseDashboard(user,adminFlag,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
      if(!canAccess(form,user,adminFlag)) throw httpError("FORM_ACCESS_DENIED",403);
    }

    validateSubmission(formId,payload);
    validatePhotos(payload.photos||[],form);

    const id=resolveSubmissionId(payload,formId);
    if(await submissionExists(auth,form,id)){
      return res.status(200).json({ok:true,id,duplicate:true,photos:[]});
    }

    const recordedEmail=form.collectEmail?String(user?.email||"").trim().toLowerCase():"ANONIMO";
    if(form.collectEmail&&!recordedEmail) throw httpError("EMAIL_REQUIRED",401);
    if(await hasExistingResponseForEmail(auth,form,recordedEmail)) throw httpError("ALREADY_RESPONDED",409);

    const links=await uploadPhotos(auth,form,id,payload.photos||[]);
    const sheets=google.sheets({version:"v4",auth});
    const appended=await sheets.spreadsheets.values.append({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!${isExploration(form.id)?"A:AD":"A:AB"}`,
      valueInputOption:"RAW",
      insertDataOption:"INSERT_ROWS",
      requestBody:{values:[buildRow(form,payload,id,links,recordedEmail)]}
    });
    const rawUpdatedRange=String(appended.data.updates?.updatedRange||"");
    const rawRowMatch=rawUpdatedRange.match(/!A(\d+):/i);
    const rawRow=rawRowMatch?Number(rawRowMatch[1]):null;

    let masterSync=null;
    if(isExploration(form.id)){
      try{masterSync=await syncExplorationMaster(auth,form,payload,links);}
      catch(syncError){
        const reason=classifyMasterSyncError(syncError);
        console.error("MASTER_SYNC_FAILED",reason,syncError?.message||syncError);
        masterSync={ok:false,reason};
      }
      if(rawRow){
        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!AC${rawRow}:AD${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[[
            masterSync?.pointId||"",
            masterSync?.ok?"OK":String(masterSync?.reason||"PENDIENTE")
          ]]}
        });
      }
    }

    if(publicContext){
      await logSecurity(auth,{
        formId,ipHash:publicContext.ipHash,event:"PUBLIC_SUBMIT",result:"ACEPTADO",detail:id,req
      });
    }

    return res.status(200).json({ok:true,id,photos:links,masterSync});
  }catch(error){
    if(publicContext?.ipHash&&auth){
      try{
        await logSecurity(auth,{
          formId:String(req.body?.formId||"").toUpperCase(),
          ipHash:publicContext.ipHash,event:"PUBLIC_SUBMIT",result:"RECHAZADO",
          detail:error.message,req
        });
      }catch(_){}
    }
    const rawMessage=String(error?.message||"");
    const driveQuota=/Service Accounts do not have storage quota|storage quota|shared drives|OAuth delegation/i.test(rawMessage);
    const status=driveQuota?503:(error.status||500);
    return res.status(status).json({
      error:driveQuota
        ?"PHOTO_STORAGE_TEMPORARILY_UNAVAILABLE"
        :(status===500?"No se pudo guardar la respuesta.":error.message)
    });
  }
};