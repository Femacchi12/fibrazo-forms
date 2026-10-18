const {google}=require("googleapis");
const {gauth,verifyUser,loadForms,userCapabilities,canUseDashboard,SHEET_ID}=require("./_core");
const {competitionOperatorNames,uniqueNames}=require("./_isp-catalog");
const clean=value=>String(value||"").trim().replace(/\s+/g," ");
const COMPETENCIA_SHEET_ID=
  process.env.COMPETENCIA_SHEET_ID||
  "1v2sBVe_w-bTl438b8qWFmvw0gT66bj8TskcXbnY-gbU";
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    const user=await verifyUser(req);
    const auth=gauth();
    const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
    if(!canUseDashboard(user,caps.adminActive,forms))return res.status(403).json({error:"Access denied"});
    const sheets=google.sheets({version:"v4",auth});
    const ranges=["RESP_EXPLORACION!M2:P","RESP_INTELIGENCIA_OPERADOR!C2:C","LISTAS!A2:B","RESP_EXPLORACION!CE2:CE","RESP_INTELIGENCIA_OPERADOR!AF2:AF"];
    const [response,competitionResponse]=await Promise.all([
      sheets.spreadsheets.values.batchGet({spreadsheetId:SHEET_ID,ranges}),
      sheets.spreadsheets.values.get({
        spreadsheetId:COMPETENCIA_SHEET_ID,
        range:"01_OPERADORES!A2:AD1000"
      }).catch(error=>{
        console.warn("ISP_COMPETITION_CATALOG_UNAVAILABLE",error.message);
        return {data:{values:[]}};
      })
    ]);
    const [exploration=[],intelligence=[],lists=[],explorationQa=[],intelligenceQa=[]]=(response.data.valueRanges||[]).map(x=>x.values||[]);
    const names=[];
    // Las pruebas jamás incorporan nombres ficticios al catálogo operativo.
    for(const [index,row] of exploration.entries()){
      if(String(explorationQa[index]?.[0]||"").trim().toLowerCase()==="sí")continue;
      for(const value of row)names.push(value);
    }
    for(const [index,row] of intelligence.entries()){
      if(String(intelligenceQa[index]?.[0]||"").trim().toLowerCase()==="sí")continue;
      names.push(row[0]);
    }
    for(const row of lists)if(["isp","operador","isp_global"].includes(clean(row[0]).toLowerCase()))names.push(row[1]);
    const competitionNames=competitionOperatorNames(competitionResponse.data.values||[]);
    return res.status(200).json({isps:uniqueNames([...competitionNames,...names]),source:"shared-submissions+dash-competencia"});
  }catch(err){console.error("ISP_CATALOG_ERROR",err.message);return res.status(500).json({error:"ISP_CATALOG_UNAVAILABLE"});}
};
