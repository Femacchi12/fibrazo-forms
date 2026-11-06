const {google}=require('googleapis');
const core=require('./_core');
const ORIGINS=new Set(['https://femacchi12.github.io','https://fibrazo-forms.vercel.app','https://fibrazo-competencia-bm3wg21kr-fernandoemacchi-9206.vercel.app']);
const RANGES=Object.freeze({
 '1372196091:A1:AJ1600':"'02_PLANES_HISTORICO'!A1:AJ1600",
 '30011601:A1:BM80':"'30_CONSOL_FICHAS'!A1:BM80",
 '1091103584:A1:AF2000':"'01_OPERADORES'!A1:AF2000",
 '718563813:A1:Z10000':"'03_PRESENCIA'!A1:Z10000",
 '1320750580:X2:AJ300':"'07_CONFIG'!X2:AJ300",
 '1320750580:AS2:BC300':"'07_CONFIG'!AS2:BC300",
 '1344959609:A1:X400':"'10_FIBRAZO_METRICAS'!A1:X400",
 '1227923955:A1:S400':"'12_COMPETENCIA_MOVIL'!A1:S400",
 '677090106:A1:P300':"'19_PENDIENTES_IMPORTANTES'!A1:P300",
 '21101301:A1:T400':"'21_BUC_CONTACTOS'!A1:T400",
 '22101302:A1:U400':"'22_BUC_OFERTAS'!A1:U400"
});
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 const origin=req.headers.origin;
 if(origin&&!ORIGINS.has(origin))return res.status(403).json({error:'ORIGIN_DENIED'});
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Authorization');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{
  const user=await core.verifyUser(req),auth=core.gauth();
  const [forms,caps]=await Promise.all([core.loadForms(auth),core.userCapabilities(auth,user.email)]);
  if(!core.canUseDashboard(user,caps.adminActive,forms))return res.status(403).json({error:'ACCESS_DENIED'});
  const range=Object.hasOwn(RANGES,String(req.query.dataset||''))?RANGES[String(req.query.dataset)]:null;
  if(!range)return res.status(400).json({error:'INVALID_DATASET'});
  const sheets=google.sheets({version:'v4',auth});
  const result=await sheets.spreadsheets.values.get({spreadsheetId:process.env.COMPETITION_SHEET_ID||'1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU',range,valueRenderOption:'FORMATTED_VALUE'});
  return res.status(200).json({values:result.data.values||[]});
 }catch(error){console.error('COMPETITION_DATA_ERROR',error.status||error.code||error.message);return res.status(error.status===401?401:503).json({error:error.status===401?'AUTH_REQUIRED':'DATA_UNAVAILABLE'});}
};