const {google}=require("googleapis");
const {Readable}=require("stream");
const {
  gauth,verifyUser,loadForms,userCapabilities,permissionFor,canUseDashboard,canAccess,checkPublicRate,logSecurity,
  validatePublicGuards,validatePhotos,validateSubmission,httpError,SHEET_ID,DEFAULT_DOMAIN,EXCEPTION
}=require("./_core");
const {resolveTerritorial,TERRITORIAL_VERSION}=require("./_territorial");

const LEGACY_PHOTO_FOLDER_ENV={
  CHURN:"DRIVE_CHURN_FOLDER_ID",
  EXPLORACION:"DRIVE_EXPLORACION_FOLDER_ID",
  EXPLORACION_PRESENCIAL:"DRIVE_EXPLORACION_FOLDER_ID",
  INTELIGENCIA_OPERADOR:"DRIVE_EXPLORACION_FOLDER_ID"
};
const DEDICATED_PHOTO_FOLDERS={
  INTELIGENCIA_OPERADOR:"1HZHJCX2djj8_eodofN6__NOaljWPaz80",
  EXPLORACION:"1kgW2ErhwsDQs229kD2CvYX5bm2C_oIDR",
  EXPLORACION_PRESENCIAL:"1PxGBSzmC-pP4iYDxKzmQKMCibAdVt_7L"
};
const MASTER_SHEET_ID=process.env.BUCARAMANGA_EXPLORACION_SHEET_ID||"1LKNNf7a1VlUGpr9SlRqJGAkZq4NprW-wvdjNIlmB4E4";
let masterPolygonCache=null;
let masterBarrioCache=null;
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
  if(DEDICATED_PHOTO_FOLDERS[form.id])return DEDICATED_PHOTO_FOLDERS[form.id];

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
function usesTerritorialEngine(formId){
  return isExploration(formId)||formId==="INTELIGENCIA_OPERADOR";
}

function photoStatus(links){return Array.isArray(links)&&links.some(link=>Boolean(String(link||"").trim()))?"Con Fotos":"Sin Fotos";}

function buildRow(form,p,id,links,email){
  const d=p.data||{},l=p.location||{},now=new Date().toISOString();
  if(form.id==="INTELIGENCIA_OPERADOR"){
    return [now,id,d.operador||"",d.modelo_caja||"",d.nomenclatura_caja||"",d.marquilla||"",d.tipo_tensor||"",d.calidad_tendido||"",d.observaciones||"",l.lat||"",l.lng||"",l.accuracy||"",links[0]||"",links[1]||"",links[2]||"",links[3]||"",d.municipio||l.cityDetected||"",d.sector_barrio||"",d.estrato||"",email||"ANONIMO",d.calidad_servicio_percibida||"",d.precio_solo_internet||"",d.precio_internet_tv||"",d.incluye_tv||"",d.grilla_tv||"",d.marquilla_drop||"",links[4]||"",d.tensor_acometida||"",links[5]||"",d.estrato_observado||"",photoStatus(links)];
  }
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
  const rawIsp=value=>{
    const name=String(value||"").trim();
    return name==="Sin ISP"?"":name;
  };
  return [
    now,id,d.municipio||l.cityDetected||"",d.sector_barrio||"",d.anio_imagen||"",
    d.condicion_fisica_posteria||"",d.condicion_ocupacion_tendido||"",
    d.tigo_hfc||"",d.tigo_ftth||"",d.claro_hfc||"",d.claro_ftth||"",d.movistar||"",
    rawIsp(d.isp_1),rawIsp(d.isp_2),rawIsp(d.isp_3),rawIsp(d.isp_4),d.nota||"",
    l.lat||"",l.lng||"",l.accuracy||"",maps,links[0]||"",links[1]||"",links[2]||"",
    email||"ANONIMO","0.8.15",tipo,d.link_evidencia||""
  ];
}

function num(v){
  const n=Number(String(v??"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}

function nextSequence(values,re){
  let max=0;
  for(const row of values||[]){
    const m=String(row[0]||"").match(re);
    if(m)max=Math.max(max,Number(m[1]));
  }
  return max+1;
}

function exactName(layer,fallback=""){
  return layer?.status==="DENTRO"?String(layer.assigned?.name||fallback||""):String(fallback||"");
}
function exactId(layer){
  return layer?.status==="DENTRO"?String(layer.assigned?.id||""):"";
}
function layerDistance(layer){
  const value=layer?.distanceM;
  return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))
    ?Math.round(Number(value)*10)/10
    :"";
}
function layerMethod(layer){
  const state=String(layer?.status||"");
  if(state==="DENTRO")return"Dentro del polígono";
  if(state==="FUERA"){
    const nearby=String(layer?.nearby?.name||layer?.nearby?.id||"").trim();
    return"Fuera del polígono"+(nearby?" · cercano: "+nearby:"");
  }
  return state||"Sin información";
}

async function syncExplorationMaster(auth,form,payload,links,territorial){
  if(!isExploration(form.id))return{ok:false,reason:"NOT_APPLICABLE"};
  const d=payload.data||{},l=payload.location||{};
  const lat=num(l.lat),lon=num(l.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return{ok:false,reason:"NO_COORDINATES"};

  const observedMunicipality=String(d.municipio||l.cityDetected||"").trim();
  const resolvedMunicipality=exactName(territorial?.city,observedMunicipality);

  if(!territorial||territorial.catalogId!=="BUC_AMB"||territorial.city?.status!=="DENTRO"){
    return{
      ok:true,scope:"GLOBAL_ONLY",project:"GENERAL",reason:"GLOBAL_ONLY",
      municipio:resolvedMunicipality||observedMunicipality,
      barrio:exactName(territorial?.barrio),
      estrato:exactName(territorial?.estrato,"Sin información"),
      territorialVersion:territorial?.version||TERRITORIAL_VERSION
    };
  }

  if(!MASTER_SHEET_ID){
    return{
      ok:true,scope:"GLOBAL_ONLY",project:"GENERAL",reason:"GLOBAL_ONLY",
      municipio:resolvedMunicipality||observedMunicipality,
      territorialVersion:territorial?.version||TERRITORIAL_VERSION
    };
  }

  const sheets=google.sheets({version:"v4",auth});
  const [pointIds,compIds]=await Promise.all([
    sheets.spreadsheets.values.get({spreadsheetId:MASTER_SHEET_ID,range:"01_PUNTOS_RELEVAMIENTO!A2:A"}),
    sheets.spreadsheets.values.get({spreadsheetId:MASTER_SHEET_ID,range:"02_COMPETENCIA_PUNTO!A2:A"})
  ]);

  const pointNo=nextSequence(pointIds.data.values,/^BGF_P(\d+)$/i);
  const pointId="BGF_P"+String(pointNo).padStart(4,"0");
  const nextRow=(pointIds.data.values||[]).length+2;
  const today=new Date().toISOString().slice(0,10);
  const now=new Date().toISOString();
  const fuente=form.id==="EXPLORACION"?"Street View":"Presencial";
  const estado=form.id==="EXPLORACION"?"Virtual":"Validado en campo";
  const evidence=form.id==="EXPLORACION"?(d.link_evidencia||""):(links.join(" | ")||"");
  const imageLink=form.id==="EXPLORACION"?(d.link_evidencia||""):(links[0]||"");
  const accuracy=Number.isFinite(Number(l.accuracy))?Math.round(Number(l.accuracy)*10)/10:"";
  const municipio=exactName(territorial.city,observedMunicipality);
  const barrio=exactName(territorial.barrio);
  const estrato=exactName(territorial.estrato,"Sin información");

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId:MASTER_SHEET_ID,
    requestBody:{valueInputOption:"USER_ENTERED",data:[
      {range:`01_PUNTOS_RELEVAMIENTO!A${nextRow}:G${nextRow}`,values:[[
        pointId,today,fuente,d.anio_imagen||"",municipio,d.sector_barrio||barrio||"",`${lat}, ${lon}`
      ]]},
      {range:`01_PUNTOS_RELEVAMIENTO!K${nextRow}:Y${nextRow}`,values:[[
        accuracy,
        exactId(territorial.estrato),
        municipio,
        estrato,
        layerDistance(territorial.estrato),
        layerMethod(territorial.estrato),
        Number(d.condicion_fisica_posteria),Number(d.condicion_ocupacion_tendido),d.nota||"",
        evidence,estado,now,
        exactId(territorial.barrio),barrio,imageLink
      ]]}
    ]}
  });

  let compNo=nextSequence(compIds.data.values,/^BGF_C(\d+)$/i);
  const operators=[];
  const addTraditional=(name,tech,value)=>{
    if(value==="Sí")operators.push({name,category:"Operador tradicional / incumbente",tech});
  };
  addTraditional("Tigo","HFC",d.tigo_hfc);
  addTraditional("Tigo","FTTH",d.tigo_ftth);
  addTraditional("Claro","HFC",d.claro_hfc);
  addTraditional("Claro","FTTH",d.claro_ftth);
  addTraditional("Movistar","No identificada",d.movistar);

  const seenIsps=new Set();
  for(const key of ["isp_1","isp_2","isp_3","isp_4"]){
    let name=String(d[key]||"").trim();
    if(!name||name==="Sin ISP")continue;
    if(name==="Sin Identificar")name="ISP sin identificar"+(municipio?" ("+municipio+")":"");
    const normalized=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(seenIsps.has(normalized))continue;
    seenIsps.add(normalized);
    operators.push({name,category:"ISP local / regional",tech:"No identificada"});
  }

  if(operators.length){
    const confidence=form.id==="EXPLORACION"?"Media":"Alta";
    const rows=operators.map(op=>[
      "BGF_C"+String(compNo++).padStart(4,"0"),pointId,op.name,op.category,op.tech,
      "Cable identificado",confidence,d.nota||"",now
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId:MASTER_SHEET_ID,
      range:"02_COMPETENCIA_PUNTO!A:I",
      valueInputOption:"USER_ENTERED",
      insertDataOption:"INSERT_ROWS",
      requestBody:{values:rows}
    });
  }

  return{
    ok:true,scope:"PROJECT",project:"BUCARAMANGA_AMB",pointId,
    municipio,estrato,barrio,
    method:layerMethod(territorial.estrato),
    distance:layerDistance(territorial.estrato),
    imageLink,
    territorialVersion:territorial.version||TERRITORIAL_VERSION
  };
}

function territorialAuditRow(t){
  const layer=l=>[
    String(l?.status||""),
    String(l?.assigned?.id||""),
    String(l?.assigned?.name||""),
    String(l?.nearby?.id||""),
    String(l?.nearby?.name||""),
    l?.distanceM!==null&&l?.distanceM!==undefined&&l?.distanceM!==""&&Number.isFinite(Number(l.distanceM))
      ?Math.round(Number(l.distanceM)*10)/10
      :""
  ];
  if(!t){
    return[
      TERRITORIAL_VERSION,"","",
      "ERROR_RESOLUCION","","","","","",
      "ERROR_RESOLUCION","","","","","",
      "ERROR_RESOLUCION","","","","","",
      "ERROR_RESOLUCION","","","","",""
    ];
  }
  return[
    t.version||TERRITORIAL_VERSION,t.catalogId||"",t.territorialFileId||"",
    ...layer(t.city),...layer(t.barrio),...layer(t.estrato),...layer(t.troncal)
  ];
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

async function readRows(auth,forms,requested,limit,user,caps){
  const selected=requested==="all"?forms:forms.filter(form=>form.id===requested);
  const email=String(user?.email||"").toLowerCase();
  const internal=email===EXCEPTION||email.endsWith(DEFAULT_DOMAIN);
  const allowed=selected.filter(form=>{
    const p=permissionFor(caps.permissions,email,form.id,caps.base);
    if(canAccess(form,user,caps.base,p))return true;
    return form.access==="PUBLICO"&&internal;
  });
  const sheets=google.sheets({version:"v4",auth});
  const out=[];
  for(const form of allowed){
    const r=await sheets.spreadsheets.values.get({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!A2:BX`
    });
    for(const row of (r.data.values||[]).slice(-limit).reverse()){
      const emailIndex=form.id==="CHURN"?25:form.id==="INTELIGENCIA_OPERADOR"?19:24;
      const rowEmail=String(row[emailIndex]||"").trim().toLowerCase();
      if(!caps.adminActive&&rowEmail!==email)continue;
      if(form.id==="CHURN"){
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{ciudad:row[2],cliente_id:row[3],motivo_principal:row[5]},
          user:row[25]||""
        });
      }else if(isExploration(form.id)){
        const tipo=String(row[26]||"").trim();
        const belongs=form.id==="EXPLORACION"?(!tipo||tipo==="Virtual"):tipo==="Presencial";
        if(!belongs)continue;
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{
            ciudad:row[2],municipio:row[2],sector_barrio:row[3],
            tigo_hfc:row[7],tigo_ftth:row[8],claro_hfc:row[9],claro_ftth:row[10],movistar:row[11],
            isp_1:row[12],isp_2:row[13],isp_3:row[14],isp_4:row[15],tipo,
            barrio:row[47]||row[3],estrato:row[53]||row[55]||row[71]||"",troncal:row[59]||row[61]||"",
            zona_empresarial:row[63]||"",estrato_observado:row[64]||"",nivel_seguridad:row[65]||"",tipo_terreno:row[72]||"",barrio_asentamiento_informal:row[73]||""
          },
          location:{lat:row[17],lng:row[18],accuracy:row[19]},
          photos:[row[21],row[22],row[23]].filter(Boolean),
          photoStatus:row[75]||photoStatus(form.id==="EXPLORACION"?[row[27],row[21],row[22],row[23]]:[row[21],row[22],row[23]]),
          user:row[24]||""
        });
      }else if(form.id==="INTELIGENCIA_OPERADOR"){
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{operador:row[2],modelo_caja:row[3],nomenclatura_caja:row[4],marquilla:row[5],tipo_tensor:row[6],calidad_tendido:row[7],observaciones:row[8],municipio:row[16]||"",sector_barrio:row[17]||"",estrato:row[18]||"",calidad_servicio_percibida:row[20]||"",precio_solo_internet:row[21]||"",precio_internet_tv:row[22]||"",incluye_tv:row[23]||"",grilla_tv:row[24]||"",marquilla_drop:row[25]||"",tensor_acometida:row[27]||"",estrato_observado:row[29]||"",estado_fotos:row[30]||photoStatus([row[12],row[13],row[14],row[15],row[26],row[28]])},
          location:{lat:row[9],lng:row[10],accuracy:row[11]},
          photos:[row[12],row[13],row[14],row[15],row[26],row[28]].filter(Boolean),photoFields:{foto_modelo_caja:row[12]||"",foto_nomenclatura_caja:row[13]||"",foto_marquilla:row[14]||"",foto_tipo_tensor:row[15]||"",foto_marquilla_drop:row[26]||"",foto_tensor_acometida:row[28]||""},
          user:row[19]||""
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
      const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
      if(!canUseDashboard(user,caps.adminActive,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
      const requested=String(req.query.form||"all").toUpperCase();
      const limit=Math.min(Number(req.query.limit)||100,250);
      return res.status(200).json({
        rows:await readRows(auth,forms,requested==="ALL"?"all":requested,limit,user,caps)
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

    const isPublicRequest=payload.publicMode===true||(!req.headers.authorization&&form.publicEnabled);
    if(isPublicRequest){
      if(!form.publicEnabled) throw httpError("FORM_NOT_PUBLIC",403);
      user=form.collectEmail?await verifyUser(req):await verifyUser(req,{required:false});
      validatePublicGuards(payload);
      publicContext={ipHash:await checkPublicRate(auth,form,req)};
    }else{
      user=await verifyUser(req);
      const caps=await userCapabilities(auth,user.email);
      const permission=permissionFor(caps.permissions,user.email,form.id,caps.base);
      if(!canUseDashboard(user,caps.adminActive,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
      if(!canAccess(form,user,caps.base,permission)) throw httpError("FORM_ACCESS_DENIED",403);
    }

    validateSubmission(formId,payload);
    validatePhotos(payload.photos||[],form);

    if(formId==="INTELIGENCIA_OPERADOR"&&payload.editId){
      const editId=String(payload.editId||"").trim();
      const caps=await userCapabilities(auth,user.email);
      const permission=permissionFor(caps.permissions,String(user.email||"").toLowerCase(),form.id,caps.base);
      if(!canAccess(form,user,caps.base,permission)) throw httpError("FORM_ACCESS_DENIED",403);
      const sheets=google.sheets({version:"v4",auth});
      const existing=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:`${form.sheet}!A2:AD`});
      const rows=existing.data.values||[];
      const idx=rows.findIndex(row=>String(row[1]||"")===editId);
      if(idx<0) throw httpError("SUBMISSION_NOT_FOUND",404);
      const old=rows[idx];
      const email=String(user?.email||"").trim().toLowerCase();
      const owner=String(old[19]||"").trim().toLowerCase();
      if(!caps.adminActive&&owner!==email) throw httpError("FORM_ACCESS_DENIED",403);
      const uploaded=await uploadPhotos(auth,form,editId,payload.photos||[]);
      const byKey=Object.fromEntries((payload.photos||[]).map((p,i)=>[String(p.fieldKey||""),uploaded[i]||""]));
      const links=[
        byKey.foto_modelo_caja||String(payload.existingPhotoFields?.foto_modelo_caja||old[12]||""),
        byKey.foto_nomenclatura_caja||String(payload.existingPhotoFields?.foto_nomenclatura_caja||old[13]||""),
        byKey.foto_marquilla||String(payload.existingPhotoFields?.foto_marquilla||old[14]||""),
        byKey.foto_tipo_tensor||String(payload.existingPhotoFields?.foto_tipo_tensor||old[15]||""),
        byKey.foto_marquilla_drop||String(payload.existingPhotoFields?.foto_marquilla_drop||old[26]||""),
        byKey.foto_tensor_acometida||String(payload.existingPhotoFields?.foto_tensor_acometida||old[28]||"")
      ];
      const row=buildRow(form,payload,editId,links,owner||email);
      row[0]=old[0]||row[0];
      await sheets.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:`${form.sheet}!A${idx+2}:AE${idx+2}`,valueInputOption:"RAW",requestBody:{values:[row]}});
      return res.status(200).json({ok:true,id:editId,updated:true,photos:links});
    }

    const id=resolveSubmissionId(payload,formId);
    if(await submissionExists(auth,form,id)){
      return res.status(200).json({ok:true,id,duplicate:true,photos:[]});
    }

    const recordedEmail=form.collectEmail?String(user?.email||"").trim().toLowerCase():"ANONIMO";
    if(form.collectEmail&&!recordedEmail) throw httpError("EMAIL_REQUIRED",401);
    if(await hasExistingResponseForEmail(auth,form,recordedEmail)) throw httpError("ALREADY_RESPONDED",409);

    const links=await uploadPhotos(auth,form,id,payload.photos||[]);
    if(formId==="INTELIGENCIA_OPERADOR"){
      const keyed=Object.fromEntries((payload.photos||[]).map((p,i)=>[String(p.fieldKey||""),links[i]||""]));
      links.splice(0,links.length,...["foto_modelo_caja","foto_nomenclatura_caja","foto_marquilla","foto_tipo_tensor","foto_marquilla_drop","foto_tensor_acometida"].map(key=>keyed[key]||""));
    }
    const sheets=google.sheets({version:"v4",auth});
    const appended=await sheets.spreadsheets.values.append({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!${isExploration(form.id)?"A:AD":form.id==="INTELIGENCIA_OPERADOR"?"A:AE":"A:AB"}`,
      valueInputOption:"RAW",
      insertDataOption:"INSERT_ROWS",
      requestBody:{values:[buildRow(form,payload,id,links,recordedEmail)]}
    });
    const rawUpdatedRange=String(appended.data.updates?.updatedRange||"");
    const rawRowMatch=rawUpdatedRange.match(/!A(\d+):/i);
    const rawRow=rawRowMatch?Number(rawRowMatch[1]):null;
    if(isExploration(form.id)&&rawRow){
      const evidenceLinks=form.id==="EXPLORACION"?[payload.data?.link_evidencia,...links]:links;
      try{await sheets.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:`${form.sheet}!BX${rawRow}`,valueInputOption:"RAW",requestBody:{values:[[photoStatus(evidenceLinks)]]}});}
      catch(error){console.error("EXPLORATION_PHOTO_STATUS_FAILED",error.message);}
    }

    let masterSync=null;
    let territorial=null;
    let territorialError="";
    if(usesTerritorialEngine(form.id)){
      try{
        territorial=await resolveTerritorial(auth,payload.location?.lat,payload.location?.lng);
      }catch(geoError){
        territorialError=String(geoError?.message||"TERRITORIAL_ERROR");
        console.error("TERRITORIAL_RESOLUTION_FAILED",territorialError);
      }

      try{
        masterSync=isExploration(form.id)
          ?await syncExplorationMaster(auth,form,payload,links,territorial)
          :{ok:true,scope:"INTELLIGENCE_ONLY",project:territorial?.catalogId||"GENERAL"};
      }catch(syncError){
        const reason=classifyMasterSyncError(syncError);
        console.error("MASTER_SYNC_FAILED",reason,syncError?.message||syncError);
        masterSync={ok:false,reason};
      }

      if(rawRow&&form.id==="INTELIGENCIA_OPERADOR"){
        const exactCity=territorial?.city?.status==="DENTRO"?String(territorial.city.assigned?.name||""):"";
        const exactBarrio=territorial?.barrio?.status==="DENTRO"?String(territorial.barrio.assigned?.name||""):"";
        const exactEstrato=territorial?.estrato?.status==="DENTRO"?String(territorial.estrato.assigned?.name||""):"";
        const observedCity=String(payload.data?.municipio||payload.location?.cityDetected||"").trim();
        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!Q${rawRow}:S${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[[
            observedCity||exactCity,
            String(payload.data?.sector_barrio||exactBarrio||""),
            String(payload.data?.estrato||exactEstrato||"Sin información")
          ]]}
        });
      }

      if(rawRow&&isExploration(form.id)){
        const exactBarrio=territorial?.barrio?.status==="DENTRO"?String(territorial.barrio.assigned?.name||""):"";
        if(!String(payload.data?.sector_barrio||"").trim()&&exactBarrio){
          await sheets.spreadsheets.values.update({
            spreadsheetId:SHEET_ID,
            range:`${form.sheet}!D${rawRow}`,
            valueInputOption:"RAW",
            requestBody:{values:[[exactBarrio]]}
          });
        }

        const project=masterSync?.project||territorial?.catalogId||"GENERAL";
        const processState=masterSync?.ok
          ?(masterSync?.scope==="GLOBAL_ONLY"?"REGISTRADO_GLOBAL":"PROCESADO_PROYECTO")
          :"PENDIENTE";
        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!AC${rawRow}:AF${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[[
            masterSync?.pointId||"",
            masterSync?.ok?(masterSync?.scope==="GLOBAL_ONLY"?"GLOBAL_ONLY":"OK"):String(masterSync?.reason||"PENDIENTE"),
            project,
            processState
          ]]}
        });

        const exactEstrato=territorial?.estrato?.status==="DENTRO"?String(territorial.estrato.assigned?.name||""):"";
        const estratoValue=String(payload.data?.estrato||exactEstrato||"");
        const estratoStatus=String(territorial?.estrato?.status||"");
        const estratoDistance=Number.isFinite(Number(territorial?.estrato?.distanceM))
          ?Math.round(Number(territorial.estrato.distanceM))
          :"";
        const estratoSource=String(territorial?.estrato?.source||"");
        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!AG${rawRow}:AJ${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[[estratoValue,estratoStatus,estratoDistance,estratoSource]]}
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!AK${rawRow}:BK${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[territorialAuditRow(territorial)]}
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId:SHEET_ID,
          range:`${form.sheet}!BL${rawRow}:BV${rawRow}`,
          valueInputOption:"RAW",
          requestBody:{values:[[
            String(payload.data?.zona_empresarial||""),
            String(payload.data?.estrato_observado||""),
            String(payload.data?.nivel_seguridad||""),
            String(payload.data?.tipo_despliegue||""),
            String(payload.data?.isp_1_calidad||""),
            String(payload.data?.isp_2_calidad||""),
            String(payload.data?.isp_3_calidad||""),
            String(payload.data?.isp_4_calidad||""),
            String(payload.data?.estrato||""),
            String(payload.data?.tipo_terreno||""),
            String(payload.data?.barrio_asentamiento_informal||"")
          ]]}
        });
      }
    }

    if(publicContext){
      await logSecurity(auth,{
        formId,ipHash:publicContext.ipHash,event:"PUBLIC_SUBMIT",result:"ACEPTADO",detail:id,req
      });
    }

    return res.status(200).json({ok:true,id,photos:links,masterSync,territorial,territorialError});
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