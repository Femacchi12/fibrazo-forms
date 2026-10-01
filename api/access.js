const {gauth,verifyUser,loadForms,isAdmin,canUseDashboard,canAccess,httpError}=require("./_core");

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
    const auth=gauth();
    const user=await verifyUser(req);
    const adminFlag=await isAdmin(auth,user.email);
    const forms=await loadForms(auth);
    if(!canUseDashboard(user,adminFlag,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
    return res.status(200).json({
      admin:adminFlag,
      forms:forms.map(form=>({
        id:form.id,
        access:form.access,
        canAccess:canAccess(form,user,adminFlag)
      }))
    });
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudieron cargar los permisos.":error.message});
  }
};