const {google}=require('googleapis');
const core=require('./_core');
const ORIGINS=new Set(['https://femacchi12.github.io','https://fibrazo-forms.vercel.app','https://fibrazo-competencia-qa-git-feat-vis-4f6fa2-fernandoemacchi-9206.vercel.app']);
const REPORTS=Object.freeze({villavicencio:{id:'1XDJCVQtxBvyWfqKU4Z5IhtQDLJwKQNqwE4vhIHMAo5M',title:'Exploración y relevamiento de operadores · Villavicencio'}});
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const origin=req.headers.origin;
  if(origin&&!ORIGINS.has(origin))return res.status(403).json({error:'ORIGIN_DENIED'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try{
    const user=await core.verifyUser(req),auth=core.gauth();
    const [forms,caps]=await Promise.all([core.loadForms(auth),core.userCapabilities(auth,user.email)]);
    if(!core.canUseDashboard(user,caps.adminActive,forms))return res.status(403).json({error:'ACCESS_DENIED'});
    const report=REPORTS[String(req.query.report||'')];
    if(!report)return res.status(404).json({error:'REPORT_NOT_FOUND'});
    console.info('TERRITORIAL_REPORT_ACCOUNT',process.env.GOOGLE_CLIENT_EMAIL);
    const drive=google.drive({version:'v3',auth});
    const [metadata,content]=await Promise.all([
      drive.files.get({fileId:report.id,fields:'id,name,modifiedTime',supportsAllDrives:true}),
      drive.files.export({fileId:report.id,mimeType:'text/plain'})
    ]);
    return res.status(200).json({title:report.title,sourceName:metadata.data.name,modifiedTime:metadata.data.modifiedTime,sourceUrl:'https://docs.google.com/document/d/'+report.id+'/edit',content:String(content.data||'')});
  }catch(error){console.error('TERRITORIAL_REPORT_ERROR',error.code||error.status||error.message);return res.status(error.status===401?401:503).json({error:'REPORT_UNAVAILABLE'});}
};
