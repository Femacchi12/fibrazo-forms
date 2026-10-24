// FO-CHG-107: read-only, deterministic analytics. No personal data enters the model.
const {sourceRecords,fold}=require('./_competition-plan');
const reference=require('./_operational-reference');
const clean=v=>String(v??'').trim();
const canonical=v=>({networ:'Networks',wirlet:'Wirtel',nov:'NovaNet',nob:'NovaNet'}[fold(v)]||clean(v));
const number=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;let s=clean(v).replace(/[$\s]/g,'');if(!s)return null;if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(,\d{3})+$/.test(s))s=s.replace(/,/g,'');else s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null;};
const key=v=>fold(v)==='cartagena de indias'?'cartagena':fold(v);
const link=(id,gid,row)=>`https://docs.google.com/spreadsheets/d/${id}/edit#gid=${gid}&range=A${row}`;
const COP=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
function points(expl,intel,refs,sourceId,access){
 const a=reference.attach(expl,refs,163);
 return sourceRecords(a,intel,sourceId).filter(r=>{
  if(r.isIntel)return false;
  if(r.virtual&&!access.virtual||!r.virtual&&!access.presential)return false;
  return access.all||r.email.toLowerCase()===access.email;
 }).map(r=>({...r,operators:[...new Set(r.operators.map(o=>canonical(o.name==='Claro'?`Claro ${o.tech}`:o.name==='Tigo'?`Tigo ${o.tech}`:o.name)))],stratum:/^[1-6]$/.test(r.manualStratum)?r.manualStratum:r.operational?.estrato.value||r.canonicalStratum||'',method:/^[1-6]$/.test(r.manualStratum)?'OBSERVADO':r.operational?.estrato.method||r.stratumState}));
}
function catalog(snapshot,access){
 const cities=[...new Set(snapshot.points.map(p=>p.city).concat(access.competition?[...snapshot.plans.slice(1).map(r=>clean(r[5])),...(snapshot.coverage||[]).slice(1).map(r=>clean(r[3]))]:[]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 const operators=[...new Set(snapshot.points.flatMap(p=>p.operators).concat(access.competition?(snapshot.operators||[]).slice(1).map(r=>canonical(r[1])).filter(Boolean):[]))].sort((a,b)=>a.localeCompare(b,'es'));
 return {cities,operators};
}
function validateQuery(q,cities,operators){
 if(!q||!['summary','strata','operators','prices','unsupported'].includes(q.intent))throw Error('INVALID_QUERY');
 if(!Array.isArray(q.cities)||q.cities.length>3)throw Error('INVALID_QUERY');
 const matched=q.cities.map(c=>cities.find(x=>key(x)===key(c)));if(matched.some(x=>!x))throw Error('UNKNOWN_CITY');
 const stratum=clean(q.stratum);if(stratum&&!/^[1-6]$/.test(stratum))throw Error('INVALID_QUERY');
 const operator=clean(q.operator);const op=operator?operators.find(o=>fold(o)===fold(canonical(operator))):'';
 if(operator&&!op)throw Error('UNKNOWN_OPERATOR');
 if(q.period&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(q.period))throw Error('INVALID_QUERY');
 if(!['regular','promotion'].includes(q.priceKind)||!['internet','bundle','any'].includes(q.service))throw Error('INVALID_QUERY');
 return {...q,cities:[...new Set(matched)],operator:op||'',stratum,period:clean(q.period)};
}
function guided(question,context,cities,operators){
 const f=fold(question);let intent='unsupported';
 if(/precio|barat|economico|tarifa|oferta/.test(f))intent='prices';
 else if(/estrato/.test(f))intent='strata';
 else if(/operador|competencia|resumen|presencia|servicio|compara/.test(f))intent='summary';
 const named=cities.filter(c=>(' '+f+' ').includes(' '+fold(c)+' '));
 const op=operators.filter(o=>(' '+f+' ').includes(' '+fold(o)+' ')).sort((a,b)=>b.length-a.length)[0]||'';
 return {intent,cities:named.length?named:context.cities||[],operator:op,stratum:f.match(/estrato\s+([1-6])\b/)?.[1]||'',period:question.match(/20\d{2}-\d{2}/)?.[0]||context.period||'',priceKind:/promocion|promocional/.test(f)?'promotion':'regular',service:/internet.*tv|tv.*internet|paquete|combo/.test(f)?'bundle':'internet'};
}
function analyze(q,snapshot,access){
 const sources=[],notes=[],tables=[],parts=[];
 const shown=id=>{const op=(snapshot.operators||[]).slice(1).find(r=>r[0]===id);const idx=(snapshot.operators?.[0]||[]).indexOf('Mostrar_Dashboard');return !op||fold(op[idx>=0?idx:29])!=='no';};
 const scope=q.cities.length?q.cities:[];
 if(q.intent==='unsupported')return {title:'Consultas disponibles',text:'Puedo resumir operadores por ciudad, comparar presencia por estrato y consultar precios registrados. Prueba: «Competencia de Neiva» o «Menor precio de Internet en Villavicencio».',tables,notes,sources};
 if(!scope.length)return {title:'Selecciona una ciudad',text:'Indica una ciudad en la pregunta o selecciona una en el chat. Puedo comparar hasta tres ciudades.',tables,notes,sources};
 if(q.intent==='prices'){
  if(!access.competition)return {title:'Precios de competencia',text:'Abre este chat desde el dashboard de competencia para consultar las ofertas registradas.',tables,notes,sources};
  if(q.stratum||q.operator) return {title:'Filtro de precios',text:'La primera versión compara ofertas por ciudad, corte y tipo de servicio. No atribuye las ofertas a estratos ni filtra precios por operador todavía.',tables,notes,sources};
  for(const city of scope){
   const raw=snapshot.plans.slice(1).map((r,i)=>({r,row:i+2})).filter(x=>key(x.r[5])===key(city));
   const periods=raw.map(x=>clean(x.r[29])).filter(p=>/^20\d{2}-\d{2}$/.test(p)).sort();const period=q.period||periods.at(-1)||'';
   const candidates=raw.filter(x=>period&&clean(x.r[29])===period).filter(x=>{
    const r=x.r,service=fold(r[11]),monthly=fold(r[28]);
    const isBundle=service.includes('tv')||fold(r[21])==='si';
    const validService=q.service==='any'||q.service==='bundle'&&isBundle||q.service==='internet'&&!isBundle&&service.includes('internet');
    const end=clean(r[3]),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(new Date()),expired=/^\d{4}-\d{2}-\d{2}$/.test(end)&&end<today;
    return shown(r[8])&&validService&&monthly==='mensual'&&!expired&&!/vencid|inactiv|descartad/.test(fold(r[26]))&&!/no presta servicio|sin presencia/.test(fold(r[31]));
   }).map(x=>({...x,price:number(x.r[q.priceKind==='promotion'?17:16])})).filter(x=>x.price>0).sort((a,b)=>a.price-b.price);
   if(!candidates.length){parts.push(`${city}: no hay precios ${q.priceKind==='promotion'?'promocionales':'regulares'} mensuales comparables con esos filtros${period?' en el corte '+period:''}.`);continue;}
   const min=candidates[0].price,winners=candidates.filter(x=>x.price===min);
   parts.push(`${city}: el menor precio ${q.priceKind==='promotion'?'promocional':'regular'} mensual registrado es ${COP(min)}. Lo ofrecen ${[...new Set(winners.map(x=>canonical(x.r[9])))].join(', ')}. Corte ${period}; ${candidates.length} ofertas comparables.`);
   tables.push({title:`${city} · ${period} · ${q.service==='bundle'?'Internet + TV':q.service==='any'?'Servicios mixtos':'Internet sin TV'}`,columns:['Operador','Precio/mes','Bajada Mbps','Tecnología','Servicio','Estado registrado'],rows:candidates.slice(0,10).map(x=>[canonical(x.r[9]),COP(x.price),clean(x.r[14])||'No informado',clean(x.r[13]),clean(x.r[11]),clean(x.r[26])||'Por validar'])});
   for(const x of winners.slice(0,3))sources.push({label:`${city} · ${canonical(x.r[9])} · ${clean(x.r[1])||'Sin fecha de relevamiento'}`,url:link(snapshot.competitionId,1372196091,x.row)});
  }
  notes.push('Es el menor precio registrado entre ofertas comparables, no una garantía de la tarifa más barata o vigente de toda la ciudad. Se muestran el corte y el estado de validación; confirma condiciones con el operador.','Se excluyen ofertas sin precio, vencidas y modalidades distintas de Mensual. Instalación y otros cargos no se suman a la mensualidad.');
 }else{
  for(const city of scope){
   if(access.competition&&q.intent!=='strata'&&!q.stratum){
    let c=(snapshot.coverage||[]).slice(1).map((r,i)=>({r,row:i+2})).filter(x=>key(x.r[3])===key(city)&&shown(x.r[8])&&!/no presta servicio|sin presencia|inactivo/.test(fold(x.r[12]))&&(!q.operator||canonical(x.r[9])===q.operator));
    const periods=c.map(x=>clean(x.r[18])).filter(x=>/^20\d{2}-\d{2}$/.test(x)).sort();const period=q.period||periods.at(-1)||'';
    c=c.filter(x=>period&&x.r[18]===period);
    const ops=[...new Set(c.map(x=>canonical(x.r[9])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    parts.push(`${city}: ${ops.length} operadores con presencia registrada${period?' en el corte '+period:''}. Son registros territoriales consolidados; su cantidad no equivale a abonados ni cuota de mercado.`);
    tables.push({title:`${city} · competencia registrada · ${period||'Sin corte'}`,columns:['Operador','Registros territoriales','Tecnologías registradas'],rows:ops.map(o=>{const a=c.filter(x=>canonical(x.r[9])===o);return[o,a.length,[...new Set(a.map(x=>clean(x.r[10])).filter(Boolean))].join(', ')];}).slice(0,40)});
    if(c.length)sources.push({label:`${city} · presencia registrada`,url:link(snapshot.competitionId,718563813,c[0].row)});
    continue;
   }
   let p=snapshot.points.filter(p=>key(p.city)===key(city)&&(!q.period||p.period===q.period)&&(!q.stratum||p.stratum===q.stratum)&&(!q.operator||p.operators.includes(q.operator)));
   const count=p.length;if(!count){parts.push(`${city}: no hay puntos de exploración recibidos y accesibles con esos filtros. Esto no significa ausencia de operadores.`);continue;}
   const national=x=>x.operators.some(o=>o.startsWith('Claro ')||o.startsWith('Tigo ')||o==='Movistar');
   const ranks=[...new Set(p.flatMap(x=>x.operators))].map(o=>[o,p.filter(x=>x.operators.includes(o)).length]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
   const manual=p.filter(x=>x.method==='OBSERVADO').length,near=p.filter(x=>x.method==='CERCANO').length,unknown=p.filter(x=>!x.stratum).length;
   const leader=ranks.length?`${ranks[0][0]} tiene la mayor presencia en esta muestra (${ranks[0][1]} puntos).`:'No hay operadores identificados en estos puntos.';
   parts.push(`${city}: ${count} puntos únicos recibidos${q.stratum?' de estrato '+q.stratum:''}${q.operator?' donde se observó '+q.operator:''}. ${manual} tienen estrato observado en campo; ${near} usan estrato cercano y ${unknown} no tienen estrato disponible. ${p.filter(x=>!national(x)).length} puntos no registran Claro, Tigo ni Movistar. ${leader}`);
   const strata=['1','2','3','4','5','6'].filter(s=>p.some(x=>x.stratum===s));
   tables.push({title:`${city} · presencia observada`,columns:['Operador','Puntos','% de puntos',...strata.map(s=>'Estrato '+s)],rows:ranks.slice(0,25).map(([o,n])=>[o,n,`${Math.round(n/count*100)}%`,...strata.map(s=>p.filter(x=>x.stratum===s&&x.operators.includes(o)).length)])});
   if(q.intent==='strata')tables.push({title:`${city} · composición por estrato`,columns:['Estrato','Puntos','Con Claro','Con Movistar','Sin nacionales'],rows:strata.map(s=>{const a=p.filter(x=>x.stratum===s);return[s,a.length,a.filter(x=>x.operators.some(o=>o.startsWith('Claro '))).length,a.filter(x=>x.operators.includes('Movistar')).length,a.filter(x=>!national(x)).length];})});
   sources.push({label:`${city} · exploraciones originales`,url:link(snapshot.sourceId,1004,p[0].row)});
   const dates=p.map(x=>x.fecha).sort();notes.push(`${city}: registros recibidos del ${dates[0]} al ${dates.at(-1)}; ${p.filter(x=>!x.virtual).length} presenciales y ${p.filter(x=>x.virtual).length} virtuales. Solo se incluyen datos que ya llegaron al servidor.`);
  }
  notes.push('Cada punto representa una observación y puede orientar una zona de continuidad. Los porcentajes no equivalen a superficie cubierta, abonados ni cuota de mercado. Se excluyen pruebas y se conserva una sola revisión por ID.','El estrato observado tiene prioridad. Un estrato cercano es una referencia; no confirma que el punto esté dentro del polígono.');
  if(!access.all)notes.push('El análisis de exploración incluye únicamente tus registros y los formularios a los que tienes acceso.');
 }
 return {title:q.intent==='prices'?'Precios registrados':'Lectura del relevamiento',text:parts.join('\n\n'),tables,notes,sources};
}
module.exports={points,catalog,validateQuery,guided,analyze,number,canonical};
