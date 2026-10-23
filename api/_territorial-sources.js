// FO-CHG-098: one operational source registry for Forms, map and consolidation.
const registry=require('./territorial-sources.json');
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,'');
const sourceFor=id=>registry.entries.find(e=>e.enabled&&e.catalogId===id)||null;
const sourceForCity=city=>registry.entries.find(e=>e.enabled&&[e.city,...e.municipalities].some(c=>norm(c)===norm(city)))||null;
const isOperationalCatalog=id=>!!sourceFor(id),isOperationalCity=city=>!!sourceForCity(city);
const indexes=new WeakMap();
function indexFeatures(features){if(indexes.has(features))return indexes.get(features);const items=[];for(const f of features){const estrato=String(f.properties.estrato);if(!/^[1-6]$/.test(estrato))throw Error('OPERATIONAL_STRATUM_INVALID');for(const polygon of f.geometry.coordinates){let minLon=180,minLat=90,maxLon=-180,maxLat=-90;for(const ring of polygon)for(const[x,y]of ring){minLon=Math.min(minLon,x);minLat=Math.min(minLat,y);maxLon=Math.max(maxLon,x);maxLat=Math.max(maxLat,y);}items.push({estrato,polygon,minLon,minLat,maxLon,maxLat});}}indexes.set(features,items);return items;}
async function lookup(auth,lat,lon,catalogId){const entry=sourceFor(catalogId);if(!entry||entry.provider==='sheets')return null;
 if(entry.provider==='kmz')return require('./_strata-kmz-canonical').lookup(auth,lat,lon,catalogId);
 if(entry.provider==='cartagena')return require('./_strata-loaded-canonical').lookupCartagena(auth,lat,lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('INVALID_COORDINATES');
 const provider=entry.provider==='caribe'?require('./_estratos-caribe-097'):require('./_estratos-census-2018');
 const city=provider.target({cities:entry.city});if(!city)throw Error('OPERATIONAL_SOURCE_MISSING');
 const features=await provider.load(auth,city),{inGeometry}=require('./_territorial')._internals,matches=new Set();
 for(const item of indexFeatures(features))if(lon>=item.minLon&&lon<=item.maxLon&&lat>=item.minLat&&lat<=item.maxLat&&inGeometry(lon,lat,[item.polygon]))matches.add(item.estrato);
 const values=[...matches],status=values.length===1?'DENTRO':values.length?'AMBIGUO':'FUERA',value=values[0];
 const name=entry.kind==='REFERENCIA_CENSAL_2018'?'Referencia CNPV DANE 2018 / Esri Colombia':'Estratificación municipal (vigencia no declarada)';
 return {status,assigned:status==='DENTRO'?{id:catalogId+'_OPERATIVO_E'+value,name:value}:null,nearby:null,distanceM:status==='FUERA'?null:0,source:name+' · '+entry.city+' · aprobada para uso operativo FIBRAZO · '+entry.approvalVersion,sourceUrl:features[0]?.properties.sourceUrl||features[0]?.properties.source||'',sourceYear:entry.sourceYear,sourceKind:entry.kind,sourceVersion:entry.approvalVersion,originVersion:entry.provider==='caribe'?'FO-CHG-097':'FO-CHG-096',canonical:true,operationalApproved:true,approvalScope:entry.approvalScope,municipalCertification:false};
}
function mapApproval(city){const e=sourceForCity(city);return e?{operationalApproved:true,operationalCatalogId:e.catalogId,approvalVersion:e.approvalVersion,approvalScope:e.approvalScope,municipalCertification:false}:{operationalApproved:false};}
function intelAudit(t){return [t?.version||'',t?.estrato?.status||'',t?.estrato?.source||'',t?.estrato?.sourceVersion||''];}
module.exports={registry,sourceFor,sourceForCity,isOperationalCatalog,isOperationalCity,lookup,mapApproval,intelAudit,_internals:{indexFeatures}};
