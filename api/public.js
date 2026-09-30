const {gauth,loadForms,sanitizeForm,httpError}=require("./_core");

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
    const slug=String(req.query.slug||"").trim().toLowerCase();
    if(!slug) throw httpError("SLUG_REQUIRED",400);
    const auth=gauth();
    const form=(await loadForms(auth)).find(item=>item.slug.toLowerCase()===slug);
    if(!form||String(form.status).toLowerCase()!=="activo"||form.access!=="PUBLICO") throw httpError("FORM_NOT_PUBLIC",404);
    return res.status(200).json({form:sanitizeForm(form)});
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudo cargar el formulario.":error.message});
  }
};