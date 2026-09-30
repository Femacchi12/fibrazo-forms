const {google}=require("googleapis");
const {Readable}=require("stream");
const {
  gauth,verifyUser,loadForms,isAdmin,canAccess,checkPublicRate,logSecurity,
  validatePublicGuards,validatePhotos,validateSubmission,httpError,SHEET_ID
}=require("./_core");

const runtime={
  CHURN:{folder:"DRIVE_CHURN_FOLDER_ID"},
  EXPLORACION:{folder:"DRIVE_EXPLORACION_FOLDER_ID"}
};

const idFor=form=>`${form}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

async function uploadPhotos(auth,form,id,list){
  const photos=Array.isArray(list)?list:[];
  if(!photos.length) return [];
  const folderId=process.env[runtime[form.id]?.folder];
  if(!folderId) throw httpError("PHOTO_FOLDER_NOT_CONFIGURED",500);
  const drive=google.drive({version:"v3",auth});
  const links=[];
  for(let i=0;i<photos.length;i++){
    const match=String(photos[i].data||"").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    if(!match) throw httpError("INVALID_PHOTO",400);
    const ext=match[1].toLowerCase().includes("png")?"png":match[1].toLowerCase().includes("webp")?"webp":"jpg";
    const created=await drive.files.create({
      requestBody:{name:`${id}_foto_${i+1}.${ext}`,parents:[folderId]},
      media:{mimeType:match[1],body:Readable.from(Buffer.from(match[2],"base64"))},
      fields:"id,webViewLink"
    });
    links.push(created.data.webViewLink||`https://drive.google.com/file/d/${created.data.id}/view`);
  }
  return links;
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
      d.comentario||"",l.lat||"",l.lng||"",l.accuracy||"",links.join(" | "),email||"PUBLICO"
    ];
  }
  const maps=l.lat&&l.lng?`https://www.google.com/maps?q=${l.lat},${l.lng}`:"";
  return [
    now,id,d.ciudad||"",d.sector_barrio||"",d.anio||"",d.e_postes||"",d.s_postes||"",
    d.tigo_hfc||"",d.tigo_ftth||"",d.claro_hfc||"",d.claro_ftth||"",d.movistar||"",
    d.isp_1||"",d.isp_2||"",d.isp_3||"",d.isp_4||"",d.nota||"",
    l.lat||"",l.lng||"",l.accuracy||"",maps,links[0]||"",links[1]||"",links[2]||"",
    email||"PUBLICO","0.3"
  ];
}

async function readRows(auth,requested,limit,user,adminFlag){
  const forms=await loadForms(auth);
  const selected=requested==="all"?forms:forms.filter(form=>form.id===requested);
  const allowed=selected.filter(form=>canAccess(form,user,adminFlag));
  const sheets=google.sheets({version:"v4",auth});
  const out=[];
  for(const form of allowed){
    const r=await sheets.spreadsheets.values.get({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!A2:Z`
    });
    for(const row of (r.data.values||[]).slice(-limit).reverse()){
      if(form.id==="CHURN"){
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{ciudad:row[2],cliente_id:row[3],motivo_principal:row[5]},
          user:row[25]||""
        });
      }else if(form.id==="EXPLORACION"){
        out.push({
          formId:form.id,timestamp:row[0],id:row[1],
          data:{ciudad:row[2],sector_barrio:row[3],tigo_hfc:row[7],claro_hfc:row[9],movistar:row[11]},
          user:row[24]||""
        });
      }
    }
  }
  return out.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,limit);
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
      const requested=String(req.query.form||"all").toUpperCase();
      const limit=Math.min(Number(req.query.limit)||100,250);
      return res.status(200).json({
        rows:await readRows(auth,requested==="ALL"?"all":requested,limit,user,adminFlag)
      });
    }

    if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

    const payload=req.body||{};
    const formId=String(payload.formId||"").toUpperCase();
    const forms=await loadForms(auth);
    const form=forms.find(item=>item.id===formId);
    if(!form||!runtime[formId]) throw httpError("INVALID_FORM",400);

    let user=null;
    let adminFlag=false;

    if(form.access==="PUBLICO"){
      user=await verifyUser(req,{required:false});
      validatePublicGuards(payload);
      publicContext={ipHash:await checkPublicRate(auth,form,req)};
    }else{
      user=await verifyUser(req);
      adminFlag=await isAdmin(auth,user.email);
      if(!canAccess(form,user,adminFlag)) throw httpError("FORM_ACCESS_DENIED",403);
    }

    validateSubmission(formId,payload);
    validatePhotos(payload.photos||[],form);

    const id=idFor(formId);
    const links=await uploadPhotos(auth,form,id,payload.photos||[]);
    const sheets=google.sheets({version:"v4",auth});
    await sheets.spreadsheets.values.append({
      spreadsheetId:SHEET_ID,
      range:`${form.sheet}!A:Z`,
      valueInputOption:"RAW",
      insertDataOption:"INSERT_ROWS",
      requestBody:{values:[buildRow(form,payload,id,links,user?.email||"PUBLICO")]}
    });

    if(publicContext){
      await logSecurity(auth,{
        formId,ipHash:publicContext.ipHash,event:"PUBLIC_SUBMIT",result:"ACEPTADO",detail:id,req
      });
    }

    return res.status(200).json({ok:true,id,photos:links});
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
    const status=error.status||500;
    return res.status(status).json({
      error:status===500?"No se pudo guardar la respuesta.":error.message
    });
  }
};