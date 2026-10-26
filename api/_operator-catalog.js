const {google}=require('googleapis');
const core=require('./_core');
const COMPETITION=process.env.COMPETITION_SHEET_ID||'1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU';
let cache=null,flight=null;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const user=await core.verifyUser(req),auth=core.gauth();
  const [forms,caps]=await Promise.all([core.loadForms(auth),core.userCapabilities(auth,user.email)]);
  if(!core.canUseDashboard(user,caps.adminActive,forms)||!forms.some(f=>['EXPLORACION','EXPLORACION_PRESENCIAL','INTELIGENCIA_OPERADOR'].includes(f.id)&&core.canAccess(f,user,caps.base,core.permissionFor(caps.permissions,user.email,f.id,caps.base))))return res.status(403).json({error:'Access denied'});
  if(!cache||cache.expires<Date.now()){
   if(!flight)flight=(async()=>{
    const sheets=google.sheets({version:'v4',auth});
    const r=await sheets.spreadsheets.values.batchGet({spreadsheetId:COMPETITION,ranges:['01_OPERADORES!A1:AF','03_PRESENCIA!A1:Z','02_PLANES_HISTORICO!A1:AJ','26_BUC_EQUIVALENCIAS!A1:F']});
    const [operators=[],presence=[],plans=[],aliases=[]]=(r.data.valueRanges||[]).map(v=>v.values||[]);
    const result=operators.slice(1).filter(o=>o[0]).map(o=>({id:String(o[0]),name:String(o[1]||''),brand:String(o[2]||''),group:String(o[26]||''),city:String(o[11]||''),tech:String(o[5]||''),visible:String(o[29]||'').toLowerCase()!=='no',cities:[...new Set([...presence.slice(1).filter(p=>p[8]===o[0]&&!/no presta servicio|sin presencia|inactivo/i.test(p[20]||'')).map(p=>p[3]),...plans.slice(1).filter(p=>p[8]===o[0]&&!/inactivo|descartado/i.test(p[26]||'')).map(p=>p[5])].filter(Boolean))]}));
    cache={operators:result,aliases:aliases.slice(1).filter(r=>/^confirmado/i.test(r[3]||'')).map(r=>({alias:String(r[0]||''),name:String(r[1]||''),cities:['Bucaramanga','Floridablanca','Girón','Piedecuesta']})),expires:Date.now()+120000};
   })().finally(()=>{flight=null;});await flight;
  }
  return res.status(200).json({operators:cache.operators,aliases:cache.aliases});
 }catch(e){return res.status(e.status||503).json({error:e.status?e.message:'COMPETITION_CATALOG_UNAVAILABLE'});}
};
