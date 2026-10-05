const {google}=require("googleapis");
const {
  SHEET_ID,gauth,verifyUser,loadForms,userCapabilities,canUseDashboard,
  permissionFor,canAccess,httpError
}=require("./_core");

const MAX_POINTS=2000;

function norm(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
}
function num(v){
  const n=Number(String(v??"").replace(",","."));
  return Number.isFinite(n)?n:null;
}
function safeLink(v){
  const s=String(v||"").trim();
  return /^https:\/\//i.test(s)?s:"";
}
function rowType(row){
  const tipo=String(row[26]||"").trim();
  return tipo||"Virtual";
}
function isVirtual(row){
  return norm(rowType(row))==="virtual";
}
function isPresential(row){
  return norm(rowType(row))==="presencial";
}
function formAccess(forms,caps,user){
  const email=String(user?.email||"").trim().toLowerCase();
  const out={virtual:false,presential:false};
  for(const form of forms){
    if(!["EXPLORACION","EXPLORACION_PRESENCIAL"].includes(form.id))continue;
    const permission=permissionFor(caps.permissions,email,form.id,caps.base);
    const allowed=canAccess(form,user,caps.base,permission);
    if(form.id==="EXPLORACION"&&allowed)out.virtual=true;
    if(form.id==="EXPLORACION_PRESENCIAL"&&allowed)out.presential=true;
  }
  return out;
}
function operators(row){
  const out=[];
  const add=(name,value)=>{if(String(value||"").trim()==="Sí"&&!out.includes(name))out.push(name);};
  add("Tigo HFC",row[7]);add("Tigo FTTH",row[8]);
  add("Claro HFC",row[9]);add("Claro FTTH",row[10]);
  add("Movistar",row[11]);
  for(let i=12;i<=15;i++){
    const value=String(row[i]||"").trim();
    if(value&&value!=="Sin ISP"&&!out.includes(value))out.push(value);
  }
  return out;
}
function distance(v){
  const n=num(v);
  return n===null?null:Math.round(n*10)/10;
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=10");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    const user=await verifyUser(req);
    const auth=gauth();
    const [forms,caps]=await Promise.all([loadForms(auth),userCapabilities(auth,user.email)]);
    if(!canUseDashboard(user,caps.adminActive,forms))throw httpError("DASHBOARD_ACCESS_DENIED",403);

    const access=formAccess(forms,caps,user);
    if(!access.virtual&&!access.presential)throw httpError("MAP_ACCESS_DENIED",403);

    const sheets=google.sheets({version:"v4",auth});
    const response=await sheets.spreadsheets.values.get({
      spreadsheetId:SHEET_ID,
      range:"RESP_EXPLORACION!A2:BK"
    });
    const email=String(user.email||"").trim().toLowerCase();
    const admin=!!(caps.base||String(caps.user?.role||"").toUpperCase()==="ADMIN");
    const all=response.data.values||[];
    const points=[];

    for(const row of all.slice(-MAX_POINTS)){
      const type=rowType(row);
      if(isVirtual(row)&&!access.virtual)continue;
      if(isPresential(row)&&!access.presential)continue;
      const rowEmail=String(row[24]||"").trim().toLowerCase();
      if(!admin&&rowEmail!==email)continue;

      const lat=num(row[17]),lng=num(row[18]);
      if(lat===null||lng===null||lat<-90||lat>90||lng<-180||lng>180)continue;

      const cityStatus=String(row[39]||"").trim();
      const cityAssigned=String(row[41]||"").trim();
      const cityNearby=String(row[43]||"").trim();
      const observedCity=String(row[2]||"").trim();
      const barrioStatus=String(row[45]||"").trim();
      const barrioAssigned=String(row[47]||"").trim();
      const barrioNearby=String(row[49]||"").trim();
      const estratoStatus=String(row[51]||"").trim();
      const estratoAssigned=String(row[53]||"").trim();
      const estratoNearby=String(row[55]||"").trim();
      const troncalStatus=String(row[57]||"").trim();
      const troncalAssigned=String(row[59]||"").trim();
      const troncalNearby=String(row[61]||"").trim();

      points.push({
        id:String(row[1]||""),
        timestamp:String(row[0]||""),
        type,
        user:String(row[24]||""),
        lat,lng,
        accuracy:num(row[19]),
        observedCity,
        sector:String(row[3]||""),
        note:String(row[16]||""),
        operators:operators(row),
        maps:safeLink(row[20]),
        evidence:safeLink(row[27]),
        photos:[row[21],row[22],row[23]].map(safeLink).filter(Boolean),
        territorialVersion:String(row[36]||""),
        city:{
          status:cityStatus,
          assigned:cityAssigned,
          nearby:cityNearby,
          distanceM:distance(row[44])
        },
        barrio:{
          status:barrioStatus,
          assigned:barrioAssigned,
          nearby:barrioNearby,
          distanceM:distance(row[50])
        },
        estrato:{
          status:estratoStatus,
          assigned:estratoAssigned,
          nearby:estratoNearby,
          distanceM:distance(row[56])
        },
        troncal:{
          status:troncalStatus,
          assigned:troncalAssigned,
          nearby:troncalNearby,
          distanceM:distance(row[62])
        }
      });
    }

    points.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    return res.status(200).json({
      ok:true,
      generatedAt:new Date().toISOString(),
      visibility:admin?"team":"own",
      access,
      points
    });
  }catch(error){
    const status=error.status||500;
    console.error("MAP_DATA_ERROR",error?.message||error);
    return res.status(status).json({error:status===500?"No se pudo cargar el mapa.":error.message});
  }
};
