const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,userCapabilities,canUseDashboard,SHEET_ID}=require("./_core");
const clean=value=>String(value||"").trim().replace(/\s+/g," ");
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    const user=await verifyUser(req);
    const auth=gauth();
    const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
    if(!canUseDashboard(user,caps.adminActive,forms))return res.status(403).json({error:"Access denied"});
    const sheets=google.sheets({version:"v4",auth});
    const ranges=["RESP_EXPLORACION!M2:P","RESP_INTELIGENCIA_OPERADOR!C2:C","LISTAS!A2:B"];
    const response=await sheets.spreadsheets.values.batchGet({spreadsheetId:SHEET_ID,ranges});
    const [exploration=[],intelligence=[],lists=[]]=(response.data.valueRanges||[]).map(x=>x.values||[]);
    const names=[];
    for(const row of exploration)for(const v of row)names.push(v);
    for(const row of intelligence)names.push(row[0]);
    for(const row of lists)if(["isp","operador","isp_global"].includes(clean(row[0]).toLowerCase()))names.push(row[1]);
    const byKey=new Map();
    for(const raw of names){
      const name=clean(raw);
      if(!name||["sin isp","sin identificar","isp sin identificar"].includes(name.toLowerCase()))continue;
      const key=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      if(!byKey.has(key))byKey.set(key,name);
    }
    return res.status(200).json({isps:[...byKey.values()].sort((a,b)=>a.localeCompare(b,"es")),source:"shared-submissions"});
  }catch(err){console.error("ISP_CATALOG_ERROR",err.message);return res.status(500).json({error:"ISP_CATALOG_UNAVAILABLE"});}
};
