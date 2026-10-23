// FO-CHG-095: use the approved, full-resolution map geometry for Cartagena lookup.
async function lookupCartagena(auth,lat,lon){
 const geo=await require('./_estratos-ctg-historic').source(auth);
 const result=require('./_estratos-precalc')._internals.referenceResult(geo.map(f=>({estrato:String(f.properties.estrato),polygons:f.geometry.coordinates})),lat,lon);
 const named=value=>({id:'CTG_APROBADO_E'+value,name:String(value)});
 return {status:result.status,assigned:result.status==='DENTRO'?named(result.value):null,nearby:result.closest?named(result.closest.estrato):null,distanceM:result.distanceM,source:'Estratos Cartagena 2022 aprobados por Edu · FO-CHG-095',sourceUrl:'https://docs.google.com/spreadsheets/d/1yULedNPZU_SY1NRnQnzu-qJDU1kwIhJ3iJ7aoF0Tkzk/edit',canonical:true,sourceVersion:'FO-CHG-095',sourceYear:2022,approvalScope:'CANONICA_OPERATIVA_FIBRAZO',municipalCertification:false};
}
module.exports={lookupCartagena};
