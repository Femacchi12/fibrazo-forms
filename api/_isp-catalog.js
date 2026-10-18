const clean=value=>String(value||"").trim().replace(/\s+/g," ");
const norm=value=>clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const key=value=>norm(value).replace(/[^a-z0-9]+/g,"");

function isBlockedOperator(name){
  const value=norm(name);
  return !value||value.includes("claro")||value.includes("tigo")||value.includes("movistar")||["sin isp","sin identificar","isp sin identificar"].includes(value);
}

function competitionOperatorNames(rows){
  const names=[];
  for(const row of rows||[]){
    const name=clean(row[1]);
    const type=norm(row[4]);
    const visible=norm(row[29]);
    if(type!=="local / regional"||visible==="no"||isBlockedOperator(name))continue;
    names.push(name);
  }
  return names;
}

function uniqueNames(values){
  const byKey=new Map();
  for(const raw of values||[]){
    const name=clean(raw);
    const normalizedKey=key(name);
    if(!normalizedKey||["sinisp","sinidentificar","ispsinidentificar"].includes(normalizedKey))continue;
    if(!byKey.has(normalizedKey))byKey.set(normalizedKey,name);
  }
  return [...byKey.values()].sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
}

module.exports={competitionOperatorNames,uniqueNames};
