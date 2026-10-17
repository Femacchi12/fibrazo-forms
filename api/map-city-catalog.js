const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,userCapabilities,canUseDashboard}=require("./_core");
const SHEET_ID="1cVAEv60ZdDTcQoPmmiSbJV_gfhAXKwywbzf0F0WDp_0";
let cache=null,expires=0;
const unique=items=>[...new Set(items.map(s=>String(s||"").trim()).filter(Boolean))];
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    const user=await verifyUser(req),auth=gauth();
    const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
    if(!canUseDashboard(user,caps.adminActive,forms))return res.status(403).json({error:"FORBIDDEN"});
    if(cache&&Date.now()<expires)return res.status(200).json({ok:true,cities:cache});
    const result=await google.sheets({version:"v4",auth}).spreadsheets.values.get({spreadsheetId:SHEET_ID,range:"01_CIUDADES!A1:E250"});
    const rows=result.data.values||[];
    if(rows[0]?.[0]!=="ID_Ciudad")throw new Error("INVALID_CITY_CATALOG");
    cache=unique(rows.slice(1).filter(row=>["ACTIVO","QA_ESTRATOS"].includes(String(row[4]||"").trim().toUpperCase())).flatMap(row=>String(row[2]||row[1]||"").split(";"))).sort((a,b)=>a.localeCompare(b,"es"));
    expires=Date.now()+5*60*1000;
    return res.status(200).json({ok:true,cities:cache});
  }catch(error){console.error("MAP_CITY_CATALOG_FAILED",error?.message||error);return res.status(503).json({error:"CITY_CATALOG_UNAVAILABLE"});}
};
