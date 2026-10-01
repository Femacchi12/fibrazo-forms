const {google}=require("googleapis");
const {
  gauth,verifyUser,loadForms,loadUsers,isAdmin,isBaseAdmin,sanitizeForm,httpError,
  splitEmails,splitDomains,clampInt,clampNum,SHEET_ID
}=require("./_core");

const toBool=(value,fallback=false)=>{
  if(typeof value==="boolean")return value;
  if(value===undefined||value===null||value==="")return fallback;
  return String(value).toUpperCase()==="TRUE"||String(value)==="1";
};
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||"").trim());

async function adminList(auth){
  const users=await loadUsers(auth);
  const active=new Map(
    users.filter(u=>u.role==="ADMIN"&&u.status==="ACTIVO").map(u=>[u.email,u])
  );
  for(const email of ["eduardo@fibrazo.com","fernandoemacchi@gmail.com"]){
    if(!active.has(email))active.set(email,{email,role:"ADMIN",status:"ACTIVO",notes:"Administrador base"});
  }
  return [...active.values()]
    .map(u=>({email:u.email,base:isBaseAdmin(u.email),notes:u.notes||""}))
    .sort((a,b)=>Number(b.base)-Number(a.base)||a.email.localeCompare(b.email));
}

async function mutateAdmin(auth,actor,body){
  const action=String(body.adminAction||"").toLowerCase();
  const email=String(body.email||"").trim().toLowerCase();
  if(!["add","remove"].includes(action))throw httpError("INVALID_ADMIN_ACTION",400);
  if(!validEmail(email))throw httpError("INVALID_EMAIL",400);
  if(action==="remove"&&isBaseAdmin(email))throw httpError("BASE_ADMIN_PROTECTED",400);
  if(action==="remove"&&email===String(actor||"").toLowerCase())throw httpError("CANNOT_REMOVE_SELF",400);

  const sheets=google.sheets({version:"v4",auth});
  const users=await loadUsers(auth);
  const existing=users.find(u=>u.email===email);

  if(action==="add"){
    const note="Administrador agregado por "+actor;
    if(existing){
      await sheets.spreadsheets.values.update({
        spreadsheetId:SHEET_ID,range:`USUARIOS!A${existing.row}:D${existing.row}`,
        valueInputOption:"RAW",requestBody:{values:[[email,"ADMIN","ACTIVO",note]]}
      });
    }else{
      await sheets.spreadsheets.values.append({
        spreadsheetId:SHEET_ID,range:"USUARIOS!A:D",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",
        requestBody:{values:[[email,"ADMIN","ACTIVO",note]]}
      });
    }
  }else if(existing){
    await sheets.spreadsheets.values.update({
      spreadsheetId:SHEET_ID,range:`USUARIOS!C${existing.row}:D${existing.row}`,
      valueInputOption:"RAW",requestBody:{values:[["INACTIVO","Administrador desactivado por "+actor]]}
    });
  }
  return adminList(auth);
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    const auth=gauth();
    const user=await verifyUser(req);
    if(!(await isAdmin(auth,user.email)))throw httpError("ADMIN_REQUIRED",403);

    if(req.method==="GET"){
      const [forms,admins]=await Promise.all([loadForms(auth),adminList(auth)]);
      return res.status(200).json({admin:true,admins,forms:forms.map(sanitizeForm)});
    }
    if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

    const body=req.body||{};
    if(body.adminAction){
      const admins=await mutateAdmin(auth,user.email,body);
      return res.status(200).json({ok:true,admins});
    }

    const formId=String(body.formId||"").toUpperCase();
    const forms=await loadForms(auth);
    const form=forms.find(item=>item.id===formId);
    if(!form)throw httpError("FORM_NOT_FOUND",404);

    const requestedStatus=String(body.status??form.status??"Activo").trim().toUpperCase();
    if(!["ACTIVO","INACTIVO"].includes(requestedStatus))throw httpError("INVALID_FORM_STATUS",400);
    const status=requestedStatus==="ACTIVO"?"Activo":"Inactivo";
    const publicEnabled=toBool(body.publicEnabled,form.publicEnabled);
    const allowedEmails=splitEmails(body.allowedEmails||"");
    const domains=splitDomains(body.domains||"");
    const emailsEnabled=allowedEmails.length>0;
    const domainsEnabled=domains.length>0;

    if(allowedEmails.length>100)throw httpError("TOO_MANY_EMAILS",400);
    if(domains.length>20)throw httpError("TOO_MANY_DOMAINS",400);
    if(domains.some(d=>!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)))throw httpError("INVALID_DOMAIN",400);

    const introMessage=String(body.introMessage??form.introMessage??"").trim().slice(0,2000);
    const completionMessage=String(body.completionMessage??form.completionMessage??"").trim().slice(0,2000);
    const collectEmail=toBool(body.collectEmail,form.collectEmail);
    const shuffleQuestions=toBool(body.shuffleQuestions,form.shuffleQuestions);
    const showProgress=toBool(body.showProgress,form.showProgress);
    const allowMultipleResponses=toBool(body.allowMultipleResponses,form.allowMultipleResponses);
    const rateLimit=clampInt(body.rateLimit,1,100,form.rateLimit||5);
    const maxPhotos=clampInt(body.maxPhotos,0,3,Number.isFinite(form.maxPhotos)?form.maxPhotos:3);
    const maxPhotoMb=clampNum(body.maxPhotoMb,0.25,2,form.maxPhotoMb||1.5);
    const legacyAccess=publicEnabled?"PUBLICO":domainsEnabled?"DOMINIO":emailsEnabled?"CORREOS":"PRIVADO";
    const now=new Date().toISOString();

    const sheets=google.sheets({version:"v4",auth});
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId:SHEET_ID,
      requestBody:{
        valueInputOption:"RAW",
        data:[
          {range:`FORMULARIOS!D${form.row}`,values:[[status]]},
          {range:`FORMULARIOS!I${form.row}:Y${form.row}`,values:[[
            legacyAccess,allowedEmails.join(", "),domains.join(", "),rateLimit,maxPhotos,maxPhotoMb,user.email,now,
            publicEnabled,domainsEnabled,emailsEnabled,introMessage,completionMessage,collectEmail,shuffleQuestions,showProgress,allowMultipleResponses
          ]]}
        ]
      }
    });

    const updated=(await loadForms(auth)).find(item=>item.id===formId);
    return res.status(200).json({ok:true,form:sanitizeForm(updated)});
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo actualizar la configuración.":error.message});
  }
};