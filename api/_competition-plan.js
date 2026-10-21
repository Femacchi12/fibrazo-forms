// FO-CHG-082: deterministic, reversible materialization; raw Forms rows remain owned by Forms.
const crypto=require('crypto');
const clean=v=>String(v??'').trim();
const fold=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const num=v=>clean(v)===''?null:Number(clean(v).replace(',','.'));
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,20).toUpperCase();
const key=(...x)=>x.map(fold).join('|');
const yes=v=>['si','true','1'].includes(fold(v));
function validPoint(lat,lng){return lat!==null&&lng!==null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);}
function date(v){if(typeof v==='number')return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);const d=new Date(v);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(d):'';}
function sourceRecords(expl,intel,sourceId){
 const out=[];
 for(const [sheet,rows] of [['RESP_EXPLORACION',expl],['RESP_INTELIGENCIA_OPERADOR',intel]])for(let i=1;i<rows.length;i++){
  const r=rows[i]||[],isIntel=sheet==='RESP_INTELIGENCIA_OPERADOR';
  if(!clean(r[1])||yes(r[isIntel?31:82]))continue;
  const lat=num(r[isIntel?9:17]),lng=num(r[isIntel?10:18]),gps=validPoint(lat,lng),city=clean(r[isIntel?16:2]);
  const cityValid=!!city&&!/oceano|atlantic|sin informacion|desconocid/.test(fold(city));
  const barrio=isIntel?clean(r[17]):r[45]==='DENTRO'?clean(r[47]||r[3]):'';
  const photos=(isIntel?[12,13,14,15,26,28]:[21,22,23]).map(c=>clean(r[c])).filter(Boolean);
  const operators=[];
  if(isIntel){const name=clean(r[2]);if(name&&!['sin isp','sin identificar'].includes(fold(name)))operators.push({name,tech:'Sin validar'});}
  else{
   for(const [c,name,tech] of [[7,'Tigo','HFC'],[8,'Tigo','FTTH'],[9,'Claro','HFC'],[10,'Claro','FTTH'],[11,'Movistar','Sin validar']])if(yes(r[c]))operators.push({name,tech});
   const seen=new Set();for(const c of [12,13,14,15]){const name=clean(r[c]);if(!name||['sin isp','sin identificar'].includes(fold(name))||seen.has(fold(name)))continue;seen.add(fold(name));operators.push({name,tech:'Sin validar'});}
  }
  const fecha=date(r[0]);if(!fecha)continue;
  out.push({id:clean(r[1]),row:i+1,sheet,fecha,period:fecha.slice(0,7),city,cityValid,barrio,observedBarrio:clean(r[isIntel?17:3]),gps,lat,lng,photos,operators,isIntel,virtual:!isIntel&&clean(r[26])==='Virtual',email:clean(r[isIntel?19:24]),manualStratum:clean(r[isIntel?29:64]),canonicalStratum:!isIntel&&r[51]==='DENTRO'?clean(r[53]):'',stratumState:isIntel?'NO_CONFIRMADO':clean(r[51]||'SIN_CAPA'),url:`https://docs.google.com/spreadsheets/d/${sourceId}/edit#gid=${isIntel?2038295009:1004}&range=A${i+1}`,notes:clean(r[isIntel?8:16]),infra:isIntel?'Ficha técnica de operador':`Postería ${clean(r[5])}; ocupación ${clean(r[6])}; terreno ${clean(r[72])}`,security:isIntel?'Sin evaluar':clean(r[65]),point:clean(r[28])});
 }
 // Duplicate IDs never count as two observations; retain last stored revision deterministically.
 return [...new Map(out.map(r=>[r.id,r])).values()];
}
function buildPlan({expl,intel,base,sourceId,now=new Date().toISOString()}){
 const records=sourceRecords(expl,intel,sourceId),operators=(base['01_OPERADORES']||[]).slice(1).filter(r=>clean(r[0]));
 const changes=new Map(),generated=new Map(),allOps=[...operators],quality=[],presence=new Map(),operatorQC=new Set();
 const add=(sheet,row)=>{if(!generated.has(sheet))generated.set(sheet,new Map());generated.get(sheet).set(row[0],row);};
 const department=city=>({villavicencio:'Meta',neiva:'Huila',ibague:'Tolima',bucaramanga:'Santander',floridablanca:'Santander',giron:'Santander',piedecuesta:'Santander'})[fold(city)]||'';
 function resolve(op,record){
  const national=['tigo','claro','movistar'].includes(fold(op.name));
  const amb=['bucaramanga','floridablanca','giron','piedecuesta'].includes(fold(record.city));
  const aliasFold=v=>fold(v).replace(/\s+/g,'');
  const approved=amb?(base['26_BUC_EQUIVALENCIAS']||[]).slice(1).filter(r=>/^confirmado/i.test(clean(r[3]))&&aliasFold(r[0])===aliasFold(op.name)).map(r=>fold(r[1])):[];
  let matches=allOps.filter(r=>[r[1],r[2],r[26]].some(v=>fold(v)===fold(op.name)||approved.includes(fold(v))));
  const local=matches.filter(r=>fold(r[11])===fold(record.city));if(local.length)matches=local;
  if(national){const exact=matches.filter(r=>fold(r[1])===fold(op.name));if(exact.length)matches=exact;}
  // Exact master name/brand or explicitly approved alias only; no fuzzy identity inference.
  if(matches.length===1)return {id:matches[0][0],name:matches[0][1],provisional:clean(matches[0][14])==='Observado · identidad por validar'};
  if(national&&matches.length){const r=matches.find(r=>fold(r[1])===fold(op.name))||matches.find(r=>fold(r[5])===fold(op.tech))||matches[0];return{id:r[0],name:r[1],provisional:false};}
  const id='OPF_'+hash(key(op.name,record.city)),row=Array(32).fill('');
  row[0]=id;row[1]=op.name;row[2]=op.name;row[4]=national?'Operador tradicional / incumbente':'ISP local / regional';row[5]='Sin validar';row[6]='Hogar';row[10]=department(record.city);row[11]=record.city;row[14]='Observado · identidad por validar';row[15]=record.fecha;row[16]='FZF_'+hash(record.id);row[17]='Alta automática desde Forms. Nombre observado, sin inferir razón social, precio ni cobertura general. Identidad pendiente de validación.';row[26]=op.name;row[27]='No identificada';row[28]='Relevado en campo · sin oferta';row[29]='Sí';
  if(!allOps.some(r=>r[0]===id)){allOps.push(row);add('01_OPERADORES',row);}return{id,name:op.name,provisional:true};
 }
 for(const r of records){
  const source='FZF_'+hash(r.id),explId='EXF_'+hash(r.id),periodId='PER_'+r.period.replace('-','_');
  const qc=(suffix,type,field,value,fix)=>quality.push(['QCF_'+hash(r.id+suffix),r.fecha,r.sheet,r.id,type,field,value,fix,'Alta','Pendiente','Edu', '',r.url,r.period,periodId]);
  if(!r.gps)qc('gps','Coordenada ausente o inválida','Latitud / Longitud',`${r.lat??''}, ${r.lng??''}`,'Recuperar coordenada original; no copiar la de otro punto.');
  if(!r.cityValid)qc('city','Municipio inválido','Municipio',r.city,'Recuperar municipio desde coordenada original verificada.');
  const found=[];
  for(const op of r.operators){
   if(!r.cityValid)continue;
   const mapped=resolve(op,r);found.push(mapped.name);
   const obsId='FZO_'+hash(key(r.id,op.name,op.tech));
   add('20_CARGA_PROYECTOS_CIUDAD',[obsId,'FIBRAZO_FORMS',r.id,r.fecha,r.city,r.barrio,r.canonicalStratum,op.name,op.tech,mapped.id,mapped.name,mapped.provisional?'Identidad provisional':'Mapeo exacto',r.virtual?'Media':'Alta',r.virtual?'Street View':'Visita de campo',r.photos[0]||r.url,r.gps?'Validado':'Pendiente','03_PRESENCIA',`Evidencia original: ${r.url}. ${r.gps?'Punto georreferenciado.':'Sin coordenadas: no pasa a presencia geográfica.'} ${mapped.provisional?'Validada la observación del nombre, no la identidad legal.':''}`]);
   if(mapped.provisional&&!operatorQC.has(mapped.id)){
    operatorQC.add(mapped.id);quality.push(['QCF_'+hash(mapped.id+'identity'),r.fecha,'01_OPERADORES',mapped.id,'Identidad de operador por validar','Operador',op.name,'Validar marca/alias sin fusionar automáticamente nombres parecidos.','Media','Pendiente','Edu','',r.url,r.period,periodId]);
   }
   if(!r.gps)continue;
   const pkey=key(r.period,r.city,r.barrio||'ambito municipal',mapped.id,op.tech),id='CVF_'+hash(pkey);
   if(!presence.has(id))presence.set(id,{r,op,mapped,ids:[],sources:[],last:r.fecha});
   const p=presence.get(id);p.ids.push(r.id);p.sources.push(source);if(r.fecha>p.last)p.last=r.fecha;
  }
  add('04_RELEVAMIENTOS',[explId,r.fecha,department(r.city),r.cityValid?r.city:'Por validar',r.barrio||'Ámbito municipal / por precisar',r.barrio||r.observedBarrio,r.email,'Observación de campo desde Forms',[...new Set(found)].join(' · '),[...new Set(r.operators.map(o=>o.tech))].join(' · '),r.infra,'Sin evaluar','Sin evaluar','Sin evaluar',source,r.notes||`${r.operators.length} operador(es) observado(s). Sin cotización de precios.`,!r.gps?'Completar GPS original':'Validar identidad de operadores y oferta cuando exista evidencia.',r.period,periodId]);
  add('05_EVIDENCIAS',[source,r.fecha,r.virtual?'Documento interno':'Visita de campo',`${r.isIntel?'Ficha de operador':'Relevamiento'} · ${r.id}`,r.url,department(r.city),r.cityValid?r.city:'Por validar',[...new Set(found)].join(' · '),explId,r.gps?'Alto':'Por validar','Vigente / observación de campo',r.email,`Fotos: ${r.photos.join(' | ')||'Sin fotos (opcionales)'}. Estrato automático confirmado: ${r.canonicalStratum||'Sin información'}; manual observado: ${r.manualStratum||'No informado'}. ${r.gps?'GPS disponible.':'GPS pendiente.'}`,r.period,periodId]);
 }
 for(const [id,p] of presence){const r=p.r;add('03_PRESENCIA',[id,p.last,department(r.city),r.city,'',r.barrio,'','',p.mapped.id,p.mapped.name,p.op.tech,'Punto observado; no implica cobertura total',r.virtual?'Por validar':'Observado en campo',r.virtual?'Street View':'Visita de campo',p.sources[0],p.ids.length===1?r.lat:'',p.ids.length===1?r.lng:'',`${new Set(p.ids).size} observación(es) Forms: ${[...new Set(p.ids)].join(' | ')}. Precio no informado.`,r.period,'PER_'+r.period.replace('-','_'),'Presencia observada','Observación consolidada',p.sources.join(' | '),p.op.name,r.barrio?'Barrio DENTRO. Sin inferencia de troncal ni cobertura FIBRAZO.':'Ámbito municipal; barrio no confirmado por geometría. Coordenadas originales en Forms.',p.op.tech]);}
 for(const r of quality)add('08_CONTROL_CALIDAD',r);
 // Withdraw only integration-owned derived rows after a source is removed/reclassified/edited.
 const prefixes={'01_OPERADORES':'OPF_','03_PRESENCIA':'CVF_','04_RELEVAMIENTOS':'EXF_','05_EVIDENCIAS':'FZF_','20_CARGA_PROYECTOS_CIUDAD':'FZO_','08_CONTROL_CALIDAD':'QCF_'};
 for(const [sheet,prefix] of Object.entries(prefixes)){
  const old=base[sheet]||[],wanted=generated.get(sheet)||new Map(),index=new Map(old.slice(1).map((r,i)=>[clean(r[0]),i+2]));
  let next=Math.max(2,old.length+1);const rows=[];
  const same=(a,b)=>{const trim=r=>{r=r.map(clean);while(r.at(-1)==='')r.pop();return r;};return JSON.stringify(trim(a))===JSON.stringify(trim(b));};
  for(const [id,row] of wanted){const at=index.get(id)||next++;if(!same(old[at-1]||[],row))rows.push({row:at,values:row});}
  if(sheet!=='01_OPERADORES')for(const [id,at] of index)if(id.startsWith(prefix)&&!wanted.has(id)){
   if(sheet==='08_CONTROL_CALIDAD'){const row=[...old[at-1]];if(row[9]!=='Resuelto'){row[9]='Resuelto';row[11]=now.slice(0,10);rows.push({row:at,values:row});}}
   else rows.push({row:at,values:Array(Math.max(old[at-1]?.length||0,1)).fill('')});
  }
  changes.set(sheet,rows);
 }
 return {changes:Object.fromEntries(changes),stats:{records:records.length,operatorsNew:(generated.get('01_OPERADORES')||new Map()).size,presence:presence.size,observations:(generated.get('20_CARGA_PROYECTOS_CIUDAD')||new Map()).size,quality:quality.length,noGps:records.filter(r=>!r.gps).map(r=>r.id),ids:records.map(r=>r.id)}};
}
module.exports={buildPlan,sourceRecords,validPoint,fold,hash,coordinateNumber:num};
