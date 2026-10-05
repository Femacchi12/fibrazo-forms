const {gauth,verifyUser}=require("./_core");
const {searchTerritorial}=require("./_territorial");

function num(value){
  const n=Number(String(value??"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}
function parseCoordinates(q){
  const match=String(q||"").trim().match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if(!match)return null;
  const lat=num(match[1]),lng=num(match[2]);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?{lat,lng}:null;
}
function externalBounds(item){
  const bb=item?.boundingbox;
  if(!Array.isArray(bb)||bb.length<4)return null;
  const south=num(bb[0]),north=num(bb[1]),west=num(bb[2]),east=num(bb[3]);
  if(![south,north,west,east].every(Number.isFinite))return null;
  return [[south,west],[north,east]];
}
async function nominatimSearch(query){
  const params=new URLSearchParams({
    q:query,
    format:"jsonv2",
    countrycodes:"co",
    addressdetails:"1",
    limit:"5"
  });
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch("https://nominatim.openstreetmap.org/search?"+params.toString(),{
      signal:controller.signal,
      headers:{
        "Accept":"application/json",
        "User-Agent":"FIBRAZO-Forms/0.8.23 (territorial map search)"
      }
    });
    if(!response.ok)return[];
    const rows=await response.json();
    return (Array.isArray(rows)?rows:[]).map(row=>({
      type:"mapa",
      id:String(row.place_id||""),
      name:String(row.display_name||"").split(",").slice(0,3).join(","),
      city:String(row.address?.city||row.address?.town||row.address?.municipality||row.address?.county||""),
      source:"OpenStreetMap",
      lat:num(row.lat),
      lng:num(row.lon),
      bounds:externalBounds(row)
    })).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  }catch(_){
    return[];
  }finally{
    clearTimeout(timer);
  }
}

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","private, max-age=120");
  try{
    if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
    await verifyUser(req);
    const query=String(req.query.q||"").trim();
    if(query.length<2)return res.status(200).json({ok:true,results:[]});

    const coordinate=parseCoordinates(query);
    if(coordinate){
      return res.status(200).json({
        ok:true,
        results:[{
          type:"coordenada",
          id:"coordinate",
          name:coordinate.lat.toFixed(6)+", "+coordinate.lng.toFixed(6),
          city:"",
          source:"Coordenada",
          ...coordinate,
          bounds:null
        }]
      });
    }

    const auth=gauth();
    const territorial=await searchTerritorial(auth,query,{limit:18});
    const external=await nominatimSearch(query);

    const results=[...territorial];
    for(const item of external){
      const duplicate=results.some(existing=>
        Math.abs(Number(existing.lat)-item.lat)<0.003&&
        Math.abs(Number(existing.lng)-item.lng)<0.003
      );
      if(!duplicate)results.push(item);
      if(results.length>=22)break;
    }

    return res.status(200).json({ok:true,results});
  }catch(error){
    const status=error.status||500;
    console.error("MAP_SEARCH_ERROR",error?.message||error);
    return res.status(status).json({error:status===500?"No se pudo realizar la búsqueda.":error.message});
  }
};
