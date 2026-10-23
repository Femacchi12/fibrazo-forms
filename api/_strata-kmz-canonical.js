// FO-CHG-094: user-approved operational source, distinct from municipal certification.
const manifest=require('./strata-kmz-approved.json');
const cities={NVA:['NEIVA','Neiva'],VVC:['VILLAVICENCIO','Villavicencio'],IBG:['IBAGUE','Ibague']};
async function lookup(auth,lat,lon,catalogId){
  const city=cities[catalogId];if(!city)return null;
  const rows=await require('./_estratos-precalc').load(auth,city);
  const result=require('./_estratos-precalc')._internals.referenceResult(rows,lat,lon);
  const original=manifest.sources.find(s=>s.city===city[1]);
  const named=value=>({id:catalogId+'_KMZ_E'+value,name:String(value)});
  return {status:result.status,assigned:result.status==='DENTRO'?named(result.value):null,
    nearby:result.closest?named(result.closest.estrato):null,distanceM:result.distanceM,
    source:'KMZ FIBRAZO aprobado · '+city[1]+' · '+manifest.version+' · '+original.id,
    sourceUrl:'https://drive.google.com/file/d/'+original.id+'/view',
    canonical:true,sourceVersion:manifest.version,approvalScope:manifest.scope,
    municipalCertification:false};
}
module.exports={lookup,manifest};
