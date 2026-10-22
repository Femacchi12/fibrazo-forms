// FO-CHG-081: pure per-record enrichment; never reads or writes an open form.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.FIBRAZO_BACKGROUND_TERRITORY=api;
})(typeof window!=='undefined'?window:typeof self!=='undefined'?self:null,function(){
 const FORMS=['EXPLORACION','EXPLORACION_PRESENCIAL','INTELIGENCIA_OPERADOR'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
 function validPoint(point){return !!point&&finite(point.lat)&&finite(point.lng)&&Math.abs(Number(point.lat))<=90&&Math.abs(Number(point.lng))<=180&&!(Number(point.lat)===0&&Number(point.lng)===0);}
 function snapshot(payload,{pending=true,manualFields={},cityHint=''}={}){
  const p=clone(payload);
  if(!FORMS.includes(p.formId))return p;
  if(!validPoint(p.location))throw new Error('GPS_REQUIRED');
  p.backgroundTerritory={version:1,status:pending?'pending':'complete',point:{lat:Number(p.location.lat),lng:Number(p.location.lng)},manualFields:clone(manualFields),cityHint:String(cityHint||'')};
  return p;
 }
 function needsLookup(p){return FORMS.includes(p?.formId)&&p.backgroundTerritory?.version===1&&p.backgroundTerritory.status!=='complete';}
 function applyResult(input,result,qaPolicy){
  const p=clone(input),job=p.backgroundTerritory;
  if(!job||!validPoint(p.location)||Number(p.location.lat)!==job.point.lat||Number(p.location.lng)!==job.point.lng)throw new Error('TERRITORIAL_COORDINATE_MISMATCH');
  if(!result?.ok||!result.territorial||!result.cityStatus)throw new Error('TERRITORIAL_INCOMPLETE_RESPONSE');
  const manual=job.manualFields||{},d=p.data||(p.data={}),l=p.location;
  const set=(key,value)=>{if(!manual[key])d[key]=String(value||'');};
  const exact=(key)=>result[key+'Status']==='DENTRO'?String(result[key]||''):'';
  const city=exact('city');
  set('municipio',city||d.municipio||job.cityHint||l.cityDetected||'');
  set('sector_barrio',exact('barrio'));
  set('estrato',exact('estrato')||'Sin información');
  l.cityDetected=manual.municipio?String(d.municipio||''):(city||String(d.municipio||''));
  l.citySource=manual.municipio?'manual':city?'territorial':'aproximado';
  l.territorialVersion=result.territorialVersion||'';l.territorialCatalogId=result.catalogId||'';l.territorialFileId=result.territorialFileId||'';
  for(const kind of ['city','barrio','estrato','troncal'])for(const suffix of ['Status','Source','Nearby','DistanceM','Match']){
   const key=kind+suffix;if(result[key]!==undefined)l[key]=result[key];
  }
  // Only an explicitly classified QA record may retain a provisional stratum.
  const suggestion=p.isTest===true&&qaPolicy?.suggest(result.qaStratum);
  if(suggestion&&!manual.estrato){d.estrato=suggestion.value;l.estratoStatus='QA_SUGERIDO';l.estratoSource=result.qaStratum.source||'QA referencial, no canónico';l.estratoMatch=suggestion.match;l.estratoQaSuggested=suggestion.value;l.estratoQaCandidates=suggestion.candidates;l.estratoQaSelected=suggestion.value;}
  if(p.isTest!==true)for(const key of ['estratoQaSuggested','estratoQaCandidates','estratoQaSelected'])delete l[key];
  if(['EXPLORACION_PRESENCIAL','INTELIGENCIA_OPERADOR'].includes(p.formId)&&!String(d.municipio||'').trim()){
   const e=new Error('Completa el municipio del registro antes de sincronizar.');e.httpStatus=400;throw e;
  }
  job.status='complete';job.completedAt=new Date().toISOString();
  return p;
 }
 return {FORMS,validPoint,snapshot,needsLookup,applyResult};
});
