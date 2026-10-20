const {gauth,verifyUser,userCapabilities,SHEET_ID}=require('./_core');
const {trySyncCompetition}=require('./_competition-sync');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const auth=gauth(),user=await verifyUser(req),caps=await userCapabilities(auth,user.email);
  if(!caps.adminActive)return res.status(403).json({error:'ADMIN_REQUIRED'});
  const result=await trySyncCompetition(auth,{sourceId:SHEET_ID,dryRun:req.body?.dryRun===true});
  return res.status(result.ok?200:503).json(result);
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'COMPETITION_SYNC_ERROR'});}
};
