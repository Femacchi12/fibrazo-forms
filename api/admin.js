const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,isAdmin,sanitizeForm,httpError,splitEmails,clampInt,clampNum,SHEET_ID}=require("./_core");

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

    const access=String(body.access||form.access).toUpperCase();
    if(!["PRIVADO","CORREOS","DOMINIO","PUBLICO"].includes(access)) throw httpError("INVALID_ACCESS",400);

    const allowedEmails=splitEmails(body.allowedEmails||"");
    if(access==="CORREOS"&&!allowedEmails.length) throw httpError("EMAILS_REQUIRED",400);

    let domain=String(body.domain||form.domain||"@fibrazo.com").trim().toLowerCase();
    if(domain&&!domain.startsWith("@")) domain="@"+domain;

    const rateLimit=clampInt(body.rateLimit,1,100,form.rateLimit||5);
    const maxPhotos=clampInt(body.maxPhotos,0,3,form.maxPhotos||0);
    const maxPhotoMb=clampNum(body.maxPhotoMb,0.25,2,form.maxPhotoMb||1.5);
    const now=new Date().toISOString();

    const sheets=google.sheets({version:"v4",auth});
    await sheets.spreadsheets.values.update({
      spreadsheetId:SHEET_ID,
      range:`FORMULARIOS!I${form.row}:P${form.row}`,
      valueInputOption:"RAW",
      requestBody:{values:[[
        access,
        allowedEmails.join(", "),
        domain,
        rateLimit,
        maxPhotos,
        maxPhotoMb,
        user.email,
        now
      ]]}
    });

    const updated=(await loadForms(auth)).find(item=>item.id===formId);
    return res.status(200).json({ok:true,form:sanitizeForm(updated)});
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo actualizar la configuración.":error.message});
  }
};