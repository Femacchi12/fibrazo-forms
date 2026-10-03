const {google}=require("googleapis");
const {
  gauth,verifyUser,loadForms,loadUsers,loadFormPermissions,userCapabilities,permissionFor,isBaseAdmin,
  sanitizeForm,httpError,splitEmails,splitDomains,clampInt,clampNum,SHEET_ID
}=require("./_core");

const toBool=(value,fallback=false)=>{
  if(typeof value==="boolean")return value;
  if(value===undefined||value===null||value==="")return fallback;
  return String(value).toUpperCase()==="TRUE"||String(value)==="1";
};
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||"").trim());

async function listAdminUsers(auth,forms){
  const [users,permissions]=await Promise.all([loadUsers(auth),loadFormPermissions(auth)]);
  const map=new Map(users.filter(u=>u.status==="ACTIVO"&&["ADMIN","COLABORADOR"].includes(u.role)).map(u=>[u.email,u]));
  for(const email of ["eduardo@fibrazo.com","fernandoemacchi@gmail.com"]){
    if(!map.has(email))map.set(email,{email,role:"ADMIN",status:"ACTIVO",notes:"Administrador base",canCreateForms:true,canManageUsers:true});
  }
  return [...map.values()].map(u=>({
    email:u.email,
    base:isBaseAdmin(u.email),
    notes:u.notes||"",
    canCreateForms:isBaseAdmin(u.email)||!!u.canCreateForms,
    canManageUsers:isBaseAdmin(u.email)||!!u.canManageUsers,
    permissions:(forms||[]).map(form=>({
      formId:form.id,
      ...permissionFor(permissions,u.email,form.id,isBaseAdmin(u.email))
    }))
  })).sort((a,b)=>Number(b.base)-Number(a.base)||a.email.localeCompare(b.email));
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
  const now=new Date().toISOString();

  if(action==="add"){
    const note="Administrador agregado por "+actor;
    if(existing){
      await sheets.spreadsheets.values.update({
        spreadsheetId:SHEET_ID,range:`USUARIOS!A${existing.row}:H${existing.row}`,
        valueInputOption:"RAW",requestBody:{values:[[
          email,"ADMIN","ACTIVO",note,!!existing.canCreateForms,!!existing.canManageUsers,actor,now
        ]]}
      });
    }else{
      await sheets.spreadsheets.values.append({
        spreadsheetId:SHEET_ID,range:"USUARIOS!A:H",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",
        requestBody:{values:[[email,"ADMIN","ACTIVO",note,false,false,actor,now]]}
      });
    }
  }else if(existing){
    await sheets.spreadsheets.values.update({
      spreadsheetId:SHEET_ID,range:`USUARIOS!C${existing.row}:H${existing.row}`,
      valueInputOption:"RAW",requestBody:{values:[[
        "INACTIVO","Administrador desactivado por "+actor,false,false,actor,now
      ]]}
    });
  }
}

async function setUserSettings(auth,actor,body){
  const email=String(body.email||"").trim().toLowerCase();
  if(!validEmail(email))throw httpError("INVALID_EMAIL",400);
  if(isBaseAdmin(email))return;
  const users=await loadUsers(auth);
  const existing=users.find(u=>u.email===email);
  if(!existing)throw httpError("ADMIN_NOT_FOUND",404);
  const sheets=google.sheets({version:"v4",auth});
  await sheets.spreadsheets.values.update({
    spreadsheetId:SHEET_ID,range:`USUARIOS!E${existing.row}:H${existing.row}`,
    valueInputOption:"RAW",requestBody:{values:[[
      toBool(body.canCreateForms,false),toBool(body.canManageUsers,false),actor,new Date().toISOString()
    ]]}
  });
}

async function setFormPermission(auth,actor,body){
  const email=String(body.email||"").trim().toLowerCase();
  const formId=String(body.formId||"").trim().toUpperCase();
  if(!validEmail(email))throw httpError("INVALID_EMAIL",400);
  const forms=await loadForms(auth);
  if(!forms.some(f=>f.id===formId))throw httpError("FORM_NOT_FOUND",404);
  if(isBaseAdmin(email))return;
  const users=await loadUsers(auth);
  if(!users.some(u=>u.email===email&&u.status==="ACTIVO"))throw httpError("ADMIN_NOT_FOUND",404);

  let canView=toBool(body.canView,false);
  const canEditForm=toBool(body.canEditForm,false);
  const canManagePermissions=toBool(body.canManagePermissions,false);
  let canViewDatabase=toBool(body.canViewDatabase,false);
  if(canEditForm||canManagePermissions||canViewDatabase)canView=true;
  if(canManagePermissions)canViewDatabase=true;

  const permissions=await loadFormPermissions(auth);
  const existing=permissions.find(p=>p.email===email&&p.formId===formId);
  const row=[email,formId,canView,canEditForm,canManagePermissions,canViewDatabase,actor,new Date().toISOString()];
  const sheets=google.sheets({version:"v4",auth});
  if(existing){
    await sheets.spreadsheets.values.update({
      spreadsheetId:SHEET_ID,range:`PERMISOS_FORMULARIO!A${existing.row}:H${existing.row}`,
      valueInputOption:"RAW",requestBody:{values:[row]}
    });
  }else{
    await sheets.spreadsheets.values.append({
      spreadsheetId:SHEET_ID,range:"PERMISOS_FORMULARIO!A:H",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",
      requestBody:{values:[row]}
    });
  }
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    const auth=gauth();
    const user=await verifyUser(req);
    const caps=await userCapabilities(auth,user.email);
    if(!caps.adminActive)throw httpError("ADMIN_REQUIRED",403);

    if(req.method==="GET"){
      const forms=await loadForms(auth);
      const visible=forms.filter(form=>{
        const p=permissionFor(caps.permissions,user.email,form.id,caps.base);
        return caps.base||p.canView||p.canEditForm||p.canManagePermissions||p.canViewDatabase;
      }).map(form=>{
        const p=permissionFor(caps.permissions,user.email,form.id,caps.base);
        return {...sanitizeForm(form),...p,databaseUrl:p.canViewDatabase||p.canManagePermissions?(form.databaseUrl||""):""};
      });
      const admins=caps.canManageUsers?await listAdminUsers(auth,forms):[];
      return res.status(200).json({
        admin:true,baseAdmin:caps.base,canCreateForms:caps.canCreateForms,canManageUsers:caps.canManageUsers,
        admins,forms:visible
      });
    }
    if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

    const body=req.body||{};
    if(body.adminAction){
      if(!caps.canManageUsers)throw httpError("USER_ADMIN_REQUIRED",403);
      await mutateAdmin(auth,user.email,body);
      const forms=await loadForms(auth);
      return res.status(200).json({ok:true,admins:await listAdminUsers(auth,forms)});
    }
    if(body.userSettingsAction){
      if(!caps.canManageUsers)throw httpError("USER_ADMIN_REQUIRED",403);
      await setUserSettings(auth,user.email,body);
      const forms=await loadForms(auth);
      return res.status(200).json({ok:true,admins:await listAdminUsers(auth,forms)});
    }
    if(body.permissionAction){
      if(!caps.canManageUsers)throw httpError("USER_ADMIN_REQUIRED",403);
      await setFormPermission(auth,user.email,body);
      const forms=await loadForms(auth);
      return res.status(200).json({ok:true,admins:await listAdminUsers(auth,forms)});
    }

    const formId=String(body.formId||"").toUpperCase();
    const forms=await loadForms(auth);
    const form=forms.find(item=>item.id===formId);
    if(!form)throw httpError("FORM_NOT_FOUND",404);
    const permission=permissionFor(caps.permissions,user.email,formId,caps.base);
    const mayEdit=caps.base||permission.canEditForm;
    const mayManage=caps.base||permission.canManagePermissions;
    if(!mayEdit&&!mayManage)throw httpError("FORM_ADMIN_REQUIRED",403);

    const data=[];
    const now=new Date().toISOString();

    if(mayEdit){
      const requestedStatus=String(body.status??form.status??"Activo").trim().toUpperCase();
      if(!["ACTIVO","INACTIVO"].includes(requestedStatus))throw httpError("INVALID_FORM_STATUS",400);
      const status=requestedStatus==="ACTIVO"?"Activo":"Inactivo";
      const introMessage=String(body.introMessage??form.introMessage??"").trim().slice(0,2000);
      const completionMessage=String(body.completionMessage??form.completionMessage??"").trim().slice(0,2000);
      const collectEmail=toBool(body.collectEmail,form.collectEmail);
      const shuffleQuestions=toBool(body.shuffleQuestions,form.shuffleQuestions);
      const showProgress=toBool(body.showProgress,form.showProgress);
      const allowMultipleResponses=toBool(body.allowMultipleResponses,form.allowMultipleResponses);
      const rateLimit=clampInt(body.rateLimit,1,100,form.rateLimit||5);
      const maxPhotos=clampInt(body.maxPhotos,0,3,Number.isFinite(form.maxPhotos)?form.maxPhotos:3);
      const maxPhotoMb=clampNum(body.maxPhotoMb,0.25,2,form.maxPhotoMb||1.5);
      data.push(
        {range:`FORMULARIOS!D${form.row}`,values:[[status]]},
        {range:`FORMULARIOS!L${form.row}:P${form.row}`,values:[[rateLimit,maxPhotos,maxPhotoMb,user.email,now]]},
        {range:`FORMULARIOS!T${form.row}:Y${form.row}`,values:[[
          introMessage,completionMessage,collectEmail,shuffleQuestions,showProgress,allowMultipleResponses
        ]]}
      );
    }

    if(mayManage){
      const publicEnabled=toBool(body.publicEnabled,form.publicEnabled);
      const allowedEmails=splitEmails(body.allowedEmails||"");
      const domains=splitDomains(body.domains||"");
      const emailsEnabled=allowedEmails.length>0;
      const domainsEnabled=domains.length>0;
      if(allowedEmails.length>100)throw httpError("TOO_MANY_EMAILS",400);
      if(domains.length>20)throw httpError("TOO_MANY_DOMAINS",400);
      if(domains.some(d=>!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)))throw httpError("INVALID_DOMAIN",400);
      const legacyAccess=publicEnabled?"PUBLICO":domainsEnabled?"DOMINIO":emailsEnabled?"CORREOS":"PRIVADO";
      data.push(
        {range:`FORMULARIOS!I${form.row}:K${form.row}`,values:[[legacyAccess,allowedEmails.join(", "),domains.join(", ")]]},
        {range:`FORMULARIOS!O${form.row}:P${form.row}`,values:[[user.email,now]]},
        {range:`FORMULARIOS!Q${form.row}:S${form.row}`,values:[[publicEnabled,domainsEnabled,emailsEnabled]]}
      );
    }

    const sheets=google.sheets({version:"v4",auth});
    if(data.length)await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId:SHEET_ID,requestBody:{valueInputOption:"RAW",data}
    });

    const updated=(await loadForms(auth)).find(item=>item.id===formId);
    const updatedCaps=permissionFor((await loadFormPermissions(auth)),user.email,formId,caps.base);
    return res.status(200).json({ok:true,form:{...sanitizeForm(updated),...updatedCaps,databaseUrl:updatedCaps.canViewDatabase||updatedCaps.canManagePermissions?(updated.databaseUrl||""):""}});
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo actualizar la configuración.":error.message});
  }
};