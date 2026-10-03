const {gauth,verifyUser,loadForms,userCapabilities,permissionFor,canUseDashboard,canAccess,runtimePolicy,httpError}=require("./_core");

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
    const auth=gauth();
    const user=await verifyUser(req);
    const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
    if(!canUseDashboard(user,caps.adminActive,forms)) throw httpError("DASHBOARD_ACCESS_DENIED",403);
    return res.status(200).json({
      admin:caps.adminActive,
      baseAdmin:caps.base,
      canCreateForms:caps.canCreateForms,
      canManageUsers:caps.canManageUsers,
      forms:forms.map(form=>{
        const permission=permissionFor(caps.permissions,user.email,form.id,caps.base);
        const canViewDatabase=permission.canViewDatabase||permission.canManagePermissions;
        return {
          ...runtimePolicy(form),
          canAccess:canAccess(form,user,caps.base,permission),
          canViewAdmin:permission.canView,
          canEditForm:permission.canEditForm,
          canManagePermissions:permission.canManagePermissions,
          canViewDatabase,
          databaseUrl:canViewDatabase?(form.databaseUrl||""):""
        };
      })
    });
  }catch(error){
    const status=error.status||500;
    return res.status(status).json({error:status===500?"No se pudieron cargar los permisos.":error.message});
  }
};