const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,isAdmin,sanitizeForm,httpError,splitEmails,splitDomains,clampInt,clampNum,SHEET_ID}=require("./_core");

const toBool=(value,fallback=false)=>{
  if(typeof value==="boolean")return value;
  if(value===undefined||value===null||value==="")return fallback;
  return String(value).toUpperCase()==="TRUE"||String(value)==="1";
};

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    const auth=gauth();
    const user=await verifyUser(req);
    if(!(await isAdmin(auth,user.email))) throw httpError("ADMIN_REQUIRED",403);

    if(req.method==="GET"){
      const forms=await loadForms(auth);
      return res.status(200).json({admin:true,forms:forms.map(sanitizeForm)});
    }
    if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

    const body=req.body||{};
    const formId=String(body.formId||"").toUpperCase();
    const forms=await loadForms(auth);
    const form=forms.find(item=>item.id===formId);
    if(!form) throw httpError("FORM_NOT_FOUND",404);

    const publicEnabled=toBool(body.publicEnabled,form.publicEnabled);
    const domainsEnabled=toBool(body.domainsEnabled,form.domainsEnabled);
    const emailsEnabled=toBool(body.emailsEnabled,form.emailsEnabled);
    const allowedEmails=splitEmails(body.allowedEmails||"");
    const domains=splitDomains(body.domains||"");

    if(emailsEnabled&&!allowedEmails.length) throw httpError("EMAILS_REQUIRED",400);
    if(domainsEnabled&&!domains.length) throw httpError("DOMAINS_REQUIRED",400);
    if(allowedEmails.length>100) throw httpError("TOO_MANY_EMAILS",400);
    if(domains.length>20) throw httpError("TOO_MANY_DOMAINS",400);
    if(domains.some(d=>!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d))) throw httpError("INVALID_DOMAIN",400);

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
    await sheets.spreadsheets.values.update({
      spreadsheetId:SHEET_ID,
      range:`FORMULARIOS!I${form.row}:Y${form.row}`,
      valueInputOption:"RAW",
      requestBody:{values:[[
        legacyAccess,allowedEmails.join(", "),domains.join(", "),rateLimit,maxPhotos,maxPhotoMb,user.email,now,
        publicEnabled,domainsEnabled,emailsEnabled,introMessage,completionMessage,collectEmail,shuffleQuestions,showProgress,allowMultipleResponses
      ]]}
    });

    const updated=(await loadForms(auth)).find(item=>item.id===formId);
    return res.status(200).json({ok:true,form:sanitizeForm(updated)});
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo actualizar la configuración.":error.message});
  }
};