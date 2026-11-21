// FO-CHG-149 — Private Focus Group dashboard (Firebase bearer token required).
(()=>{
"use strict";
const API="/api/estudio-opinion?summary=1", SHARE=location.origin+"/?resumen=focus-group";
const OPTIONS=[["2026-11-28@09:00","Sáb 28 · 9:00"],["2026-11-28@14:00","Sáb 28 · 14:00"],["2026-11-29@09:00","Dom 29 · 9:00"],["2026-11-29@14:00","Dom 29 · 14:00"]];
const STATUSES=["Preinscrito","Contactado a confirmar","Confirmado","No asistirá"];
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=id=>OPTIONS.find(o=>o[0]===id)?.[1]||"Sin asignar";
const hint=s=>'<span class="fq-tip" tabindex="0" role="note" data-tip="'+E(s)+'" aria-label="'+E(s)+'">?</span>';
const level=n=>n>=15?"strong-red":n>=13?"red":n>=12?"orange":n>=8?"yellow":n>=3?"green":"white";
let node=null,info=null,waiting=false;
const filters={campaign:"ESTUDIO_OPINION_2026",date:"",day:"",hour:"",status:"",q:""};
const EXTRA_STATUS="No elegible";
const DEFAULT_COLUMNS=["participant","phone","barrio","stratum","operator","availability","assigned","status","coordinates","actions"];
const COLUMNS=[
 ["participant","Participante"],["cedula","Cédula"],["phone","Celular"],["barrio","Barrio"],
 ["stratum","Estrato vivienda"],["operator","Operadores"],["availability","Disponibilidad"],["assigned","Sesión asignada"],
 ["status","Estado"],["coordinates","Coordenadas"],["actions","Acciones"],
 ["email","Correo"],["address","Dirección"],["age","Edad"],["decision","Decisión del hogar"],
 ["stratumBill","Estrato factura"],["internet","Internet fijo"],["otherOperator","Otro operador"],
 ["income","Tipo de ingresos"],["source","Cómo se enteró"],["geoStatus","Estado GPS"],
 ["geoAccuracy","Precisión GPS"],["geoAt","Fecha GPS"],["registered","Fecha inscripción"],
 ["updated","Última actualización"],["updatedBy","Actualizado por"],["campaign","Encuesta"]
];
const RESTRICTED=new Set(["cedula","email","address","coordinates","geoAccuracy","geoAt","income","updatedBy"]);
let tableQuery="",rowLimit=20,selectedColumns=new Set(DEFAULT_COLUMNS);
const eligible=r=>r.eligible!==false;
const styles=[
"#fq-root{position:fixed;inset:0;z-index:99999;background:#0b0b0f;color:#faf9fd;overflow-y:auto;padding:22px 2vw;font:13px Arial,sans-serif}#fq-root *{box-sizing:border-box}#fq-root [hidden]{display:none!important}.fq-wrap{max-width:1550px;margin:auto}",
"#fq-root button,#fq-root select,#fq-root input{font:inherit}#fq-root button{cursor:pointer}.fq-top,.fq-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.fq-top{padding-bottom:15px;border-bottom:1px solid #393640}.fq-top h1{font-size:25px;margin:6px 0}.fq-muted{color:#aaa9ba;font-size:11px}.fq-btn{border:1px solid #676075;background:#282431;color:#fff;padding:9px 12px;border-radius:8px}.fq-btn.green{background:#49eb91;border-color:#49eb91;color:#06150c;font-weight:bold}.fq-btn:disabled{opacity:.5;cursor:default}",
".fq-filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1.5fr;gap:10px;background:#19171e;border:1px solid #35313d;border-radius:13px;padding:14px;margin:16px 0}.fq-filters label{font-size:11px;color:#bbb4cc}.fq-filters select,.fq-filters input,.fq-list select{display:block;background:#101016;color:#fff;border:1px solid #61596d;padding:8px;border-radius:7px;width:100%;min-height:35px;margin-top:5px}",
".fq-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:15px 0}.fq-kpis article,.fq-slot{background:#17161e;border:1px solid #423d4e;border-radius:13px;padding:13px}.fq-kpis strong{display:block;font-size:24px;margin:8px 0}.fq-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 22px}.fq-slot strong{font-size:12px}.fq-slot .big{font-size:33px;font-weight:800;margin:12px 0}.fq-slot.white .big{color:white}.fq-slot.green .big{color:#51eb91}.fq-slot.yellow .big{color:#ffdf62}.fq-slot.orange .big{color:#ffa64e}.fq-slot.red .big{color:#ff616c}.fq-slot.strong-red .big{color:#ff2438;text-shadow:0 0 15px #f003}.fq-slot .bar{height:7px;background:#514b5e;border-radius:6px;overflow:hidden;margin:10px 0}.fq-slot .bar i{height:100%;display:block;background:currentColor}.fq-slot.green{color:#51eb91}.fq-slot.yellow{color:#ffdf62}.fq-slot.orange{color:#ffa64e}.fq-slot.red{color:#ff616c}.fq-slot.strong-red{color:#ff2438}.fq-slot.white{color:white}.fq-slot .fq-metric{display:flex;justify-content:space-between;margin:6px 0;color:#e2e0ea;font-size:12px}",
".fq-table{width:100%;border-collapse:collapse;font-size:12px}.fq-table th{text-align:left;padding:12px;background:#30263e;color:#e8d5ff}.fq-table td{padding:8px;border-top:1px solid #36333f}.fq-tablebox{overflow:auto;border:1px solid #3f3949;border-radius:10px}.fq-message{min-height:24px;color:#eed08b;margin:10px 0}.fq-preview{border:1px solid #9271b2;background:#272032;border-radius:12px;padding:15px;margin:12px 0}.fq-preview ul{max-height:210px;overflow:auto}.fq-tip{position:relative;border:1px solid #9785a5;color:#e2d8eb;border-radius:100%;background:transparent;font-size:11px;font-weight:700;width:18px;height:18px;margin-left:4px}.fq-tip:focus:after,.fq-tip:hover:after{content:attr(data-tip);position:absolute;z-index:30;bottom:calc(100% + 9px);right:0;background:#30283c;color:#fff;border:1px solid #a58ac2;box-shadow:0 8px 18px #0009;border-radius:8px;padding:9px;width:210px;text-align:left;white-space:normal;line-height:1.4;font-size:12px}.fq-slot button{margin:5px 4px 0 0}",
"#fq-root{background:#000;color:var(--fz-text,#f3f7f5);font-family:Inter,system-ui,Arial,sans-serif;padding:16px min(2vw,28px) 30px}#fq-root .fq-wrap{max-width:1680px}#fq-root .fq-top{border-color:var(--fz-border,#414d47);gap:10px;padding-bottom:12px}#fq-root .fq-top h1{font-size:clamp(21px,2.1vw,27px);letter-spacing:-.035em;font-weight:750}#fq-root .fq-muted{color:var(--fz-muted,#a2ada7)}#fq-root .fq-btn{background:var(--fz-control,#1d2320);border-color:var(--fz-border,#414d47);color:#edf7f0;border-radius:8px;padding:6px 10px;font-weight:550;font-size:11px;line-height:1.4;white-space:nowrap;min-height:30px}#fq-root .fq-btn:hover{background:var(--fz-control-hover,#272e2a);border-color:#00c984}#fq-root .fq-btn.green{background:var(--fz-green,#00f29a);border-color:var(--fz-green,#00f29a);color:#001a10}#fq-root .fq-btn.green:hover{filter:brightness(.92)}#fq-root .fq-btn:focus-visible,#fq-root .fq-filters :focus-visible,#fq-root .fq-list :focus-visible{outline:2px solid var(--fz-green,#00f29a);outline-offset:2px}",
".fq-filters{grid-template-columns:minmax(180px,2fr) repeat(4,minmax(95px,1fr)) minmax(160px,1.35fr);gap:8px;background:var(--fz-surface,#101412);border-color:var(--fz-border,#414d47);padding:11px;margin:12px 0}.fq-filters label{color:var(--fz-muted,#a2ada7);font-size:10px;font-weight:600}.fq-filters select,.fq-filters input,.fq-table select{background:var(--fz-control,#1d2320);border:1px solid var(--fz-border,#414d47);color:#f3f7f5;border-radius:7px;padding:5px 9px;min-height:30px;font-size:11px}.fq-filters select,.fq-filters input{margin-top:5px}.fq-table select{margin-top:0;max-width:180px;min-width:104px;font-size:11px;min-height:29px;padding:4px 7px}.fq-table select.fq-status{min-width:150px}.fq-kpis{gap:9px;margin:12px 0}.fq-kpis article,.fq-slot{background:var(--fz-surface,#101412);border-color:var(--fz-border,#414d47);border-radius:11px;padding:12px}.fq-kpis article{min-height:88px;font-size:11px}.fq-kpis strong{font-size:23px;margin:6px 0;color:#f5faf7}.fq-tools{gap:8px}.fq-tools h2{margin:7px 0;font-size:16px}.fq-slots{gap:9px;margin:10px 0 16px}.fq-slot strong{font-size:11px;color:#f3f7f5}.fq-slot .big{font-size:31px;margin:8px 0}.fq-slot .bar{background:#36413b;height:6px;margin:8px 0 10px}.fq-slot .fq-metric{margin:4px 0;color:#d0ddd5;font-size:11px}.fq-slot button.fq-btn{margin:7px 4px 3px 0;padding:5px 9px;min-height:27px}.fq-table th{background:#15251d;color:#b9f5d7;padding:10px 9px;font-size:10px;letter-spacing:.025em}.fq-table td{border-color:#334139;padding:7px 9px}.fq-tablebox{border-color:var(--fz-border,#414d47)}.fq-preview{background:#14221a;border-color:#357857}.fq-message{min-height:14px;margin:6px 0;color:#a2ada7}",
".fq-tip{display:inline;position:relative;vertical-align:baseline;width:auto;height:auto;min-width:0;min-height:0;margin-left:3px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;color:#92c8ae;line-height:1;font-family:inherit;font-size:11px;font-weight:750;cursor:help;white-space:nowrap}.fq-tip:hover,.fq-tip:focus-visible{color:#00f29a;outline:0}.fq-tip:hover:after,.fq-tip:focus-visible:after{content:attr(data-tip);position:absolute;bottom:calc(100% + 9px);left:0;right:auto;width:210px;z-index:50;white-space:normal;background:#173126;color:#f2fcf6;border:1px solid #426c57;border-radius:7px;box-shadow:0 9px 23px #000c;padding:8px 10px;font:11px/1.4 Inter,system-ui,Arial,sans-serif;text-align:left;pointer-events:none}.fq-slot.yellow .big{color:#ffd361}.fq-slot.orange .big{color:#ffa64e}.fq-slot.red .big{color:#ff606c}.fq-slot.strong-red .big{color:#ff2735}",
"#fq-root .fq-slot .fq-metric{display:flex;justify-content:flex-start;align-items:center;gap:7px;min-height:22px;margin:3px 0;line-height:1.35}#fq-root .fq-slot .fq-metric>span{flex:0 1 auto;min-width:0;white-space:normal}#fq-root .fq-slot .fq-metric>b{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:23px;padding:3px 6px;background:#20382c;border:1px solid #41624f;border-radius:7px;color:#d6fbe4;font-size:11px;font-variant-numeric:tabular-nums;line-height:1}#fq-root .fq-slot .fq-metric-1>b{background:#174a31;border-color:#2c8b58;color:#a3ffc9}#fq-root .fq-slot .fq-metric-2>b{background:#3c361e;border-color:#756b37;color:#ffe7a0}#fq-root .fq-slot .fq-metric-3>b{background:#28372d;border-color:#4a7055;color:#d1f8dc}#fq-root .fq-slot .fq-metric-4>b{background:#49272a;border-color:#91464c;color:#ffc1c5}#fq-root .fq-filters label{position:relative;color:#bcdfca}#fq-root .fq-filters label:nth-child(2),#fq-root .fq-filters label:nth-child(3){color:#a1e4d5}#fq-root .fq-filters label:nth-child(4){color:#b8dff2}#fq-root .fq-filters label:nth-child(5){color:#ffdc99}#fq-root .fq-filters select,#fq-root .fq-filters input{border:1px solid #3f6e53;background:#17271e;color:#f7fff9}#fq-root .fq-filters label:nth-child(2) select,#fq-root .fq-filters label:nth-child(3) select{border-color:#47766d;background:#152b27}#fq-root .fq-filters label:nth-child(4) select{border-color:#416e7a;background:#14282e}#fq-root .fq-filters label:nth-child(5) select{border-color:#76633c;background:#2e281c}#fq-root .fq-filters label:nth-child(6) input{border-color:#417857}#fq-root .fq-filters option,#fq-root .fq-table option{color:#fff;background:#173327}#fq-root .fq-table select.fq-assign{background:#193527;border-color:#427756;color:#f3fff8;font-weight:550}#fq-root .fq-table select.fq-status{background:#243b2d;border-color:#407950;color:#f2fff8;font-weight:650}#fq-root .fq-table select.fq-status[data-current-status=\"Contactado a confirmar\"]{background:#42371f;border-color:#967646;color:#ffe3ae}#fq-root .fq-table select.fq-status[data-current-status=\"Confirmado\"]{background:#145a37;border-color:#21ae66;color:#e4ffec}#fq-root .fq-table select.fq-status[data-current-status=\"No asistirá\"]{background:#48282b;border-color:#a75158;color:#ffd2d6}#fq-root .fq-table select.fq-status[data-current-status=\"Preinscrito\"]{background:#18392c;border-color:#4f9971;color:#d3ffe7}#fq-root .fq-suggestion-action{display:inline-flex;align-items:center;gap:6px}#fq-root .fq-suggestion-action .fq-tip{font-size:12px;color:#00f29a}#fq-root .fq-btn[data-view]{border-color:#3e8260;color:#c5fada}#fq-root .fq-btn[data-toggle]{border-color:#807347;color:#ffe3a5}#fq-root .fq-btn[data-open=\"false\"]{border-color:#449c69;color:#baffd2}#fq-root .fq-btn[data-save]{border-color:#23a86a;color:#c6ffdf}#fq-root .fq-btn:hover{filter:brightness(1.09)}",
"@media(max-width:1050px){.fq-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.fq-slots{grid-template-columns:repeat(2,minmax(0,1fr))}.fq-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){#fq-root{padding:12px}.fq-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.fq-slots{grid-template-columns:1fr}.fq-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}"
].join("\n");
function setup(){
 if(node)return;
 const style=document.createElement("style");style.textContent=styles;document.head.appendChild(style);
 node=document.createElement("section");node.id="fq-root";node.hidden=true;
 node.innerHTML='<div class="fq-wrap"><header class="fq-top"><div><span class="fq-muted">FIBRAZO Forms · Acceso protegido</span><h1>Focus Groups</h1><span class="fq-muted">Resumen de inscriptos y gestión de grupos</span></div><div><button id="fq-copy" class="fq-btn">Copiar enlace</button> <button id="fq-refresh" class="fq-btn green">Actualizar</button> <button id="fq-exit" class="fq-btn">Volver</button></div></header>'+
 '<div class="fq-message" id="fq-message" role="status"></div><div class="fq-filters">'+
 '<label>Encuesta<select id="fq-campaign"><option value="">Todas las encuestas</option></select></label>'+
 '<label>Fecha evento<select id="fq-date"><option value="">Ambos días</option><option value="2026-11-28">28/11/2026</option><option value="2026-11-29">29/11/2026</option></select></label>'+
 '<label>Día<select id="fq-day"><option value="">Todos</option><option value="2026-11-28">Sábado</option><option value="2026-11-29">Domingo</option></select></label>'+
 '<label>Horario<select id="fq-hour"><option value="">Todos</option><option value="09:00">9:00 a. m.</option><option value="14:00">2:00 p. m.</option></select></label>'+
 '<label>Estado<select id="fq-status"><option value="">Todos</option>'+STATUSES.map(v=>'<option>'+E(v)+'</option>').join("")+'<option>'+EXTRA_STATUS+'</option></select></label>'+
 '<label>Nombre o celular<input type="search" id="fq-q" placeholder="Buscar participante"></label></div>'+
 '<div id="fq-kpis" class="fq-kpis"></div><div class="fq-tools"><h2>Sesiones</h2><div class="fq-suggestion-action"><button id="fq-suggest" class="fq-btn" disabled>Sugerir distribución</button> '+hint("Propone repartir a los preinscritos entre los horarios disponibles. No aplica cambios hasta que lo confirmes.")+'</div><span class="fq-muted">Solo se cierran manualmente.</span></div>'+
 '<div id="fq-slots" class="fq-slots"></div><div id="fq-preview" hidden></div><section class="fq-table-panel"><div class="fq-table-toolbar"><h2 id="fq-count">Inscriptos</h2><input class="fq-table-search" id="fq-table-q" type="search" placeholder="Buscar en la tabla" aria-label="Buscar en la tabla"><div class="fq-table-actions"><button class="fq-btn" id="fq-export">Exportar CSV</button><div class="fq-column-anchor"><button class="fq-btn" id="fq-columns" type="button" aria-expanded="false" aria-controls="fq-columns-panel">Ver más columnas ▾</button><div id="fq-columns-panel" class="fq-column-popover" hidden></div></div></div></div>'+
 '<div class="fq-tablebox" id="fq-tablebox" role="region" aria-label="Tabla de inscritos desplazable" tabindex="0"><table class="fq-table"><thead id="fq-table-head"></thead><tbody id="fq-rows"></tbody></table></div><div class="fq-table-bottom"><button class="fq-btn" type="button" id="fq-more" hidden>Ver más</button><div class="fq-table-note">Desplázate para consultar más filas y columnas. La columna Participante permanece fija.</div></div></section></div>';
 document.body.appendChild(node);
 node.querySelector("#fq-exit").onclick=close;
 node.querySelector("#fq-refresh").onclick=load;
 node.querySelector("#fq-suggest").onclick=showSuggestions;
 node.querySelector("#fq-export").onclick=exportCsv;
 node.querySelector("#fq-copy").onclick=()=>navigator.clipboard.writeText(SHARE).then(()=>message("Enlace copiado. Requiere acceso corporativo."),()=>message("Copiá: "+SHARE));
 for(const f of Object.keys(filters)){node.querySelector("#fq-"+f).addEventListener(f==="q"?"input":"change",e=>{filters[f]=e.target.value;rowLimit=20;render();});}
 node.querySelector("#fq-table-q").addEventListener("input",e=>{tableQuery=e.target.value.toLocaleLowerCase("es");rowLimit=20;renderTable();});
 node.querySelector("#fq-more").addEventListener("click",()=>{rowLimit+=20;renderTable();});
 node.querySelector("#fq-columns").addEventListener("click",()=>{
  const panel=node.querySelector("#fq-columns-panel");panel.hidden=!panel.hidden;
  node.querySelector("#fq-columns").setAttribute("aria-expanded",String(!panel.hidden));
  if(!panel.hidden)renderColumnPicker();
 });
 node.querySelector("#fq-slots").onclick=async e=>{
  const view=e.target.closest("[data-view]");if(view){const key=view.dataset.view;filters.date=key.slice(0,10);filters.day="";filters.hour=key.slice(-5);node.querySelector("#fq-date").value=filters.date;node.querySelector("#fq-day").value="";node.querySelector("#fq-hour").value=filters.hour;render();return;}
  const toggle=e.target.closest("[data-toggle]");if(toggle&&info?.canEdit){if(!confirm((toggle.dataset.open==="true"?"Cerrar":"Reabrir")+" sesión "+label(toggle.dataset.toggle)+"?"))return;await save({action:"setSlot",slot:toggle.dataset.toggle,open:toggle.dataset.open!=="true"});}
 };
 node.querySelector("#fq-rows").addEventListener("change",e=>{if(e.target.matches(".fq-status"))e.target.dataset.currentStatus=e.target.value;});
 node.querySelector("#fq-rows").onclick=async e=>{const saveBtn=e.target.closest("[data-save]");if(!saveBtn)return;const tr=saveBtn.closest("tr");await save({action:"update",id:saveBtn.dataset.save,status:tr.querySelector(".fq-status").value,assigned:tr.querySelector(".fq-assign").value});};
}
function message(v,error=false){if(node){const el=node.querySelector("#fq-message");el.textContent=v;el.style.color=error?"#ff7989":"#eed08b";}}
async function request(body){
 const user=window.firebase?.auth?.().currentUser;if(!user)throw Error("Iniciá sesión con tu cuenta corporativa.");
 const token=await user.getIdToken();
 const res=await fetch(API,{method:body?"POST":"GET",cache:"no-store",headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Error "+res.status);return json;
}
async function load(){if(waiting)return;waiting=true;message("Actualizando…");try{info=await request();updateCampaignFilter();node.querySelector("#fq-suggest").disabled=!info.canEdit;message("Información actualizada.");render();}catch(e){message(e.message,true);}finally{waiting=false;}}
async function save(body){try{await request(body);await load();}catch(e){message(e.message,true);}}
function open(){setup();node.hidden=false;document.body.style.overflow="hidden";history.replaceState(null,"",SHARE);load();}
function close(){if(!node)return;node.hidden=true;document.body.style.overflow="";history.replaceState(null,"","/");}
function visible(){return (info?.rows||[]).filter(r=>{
 if(filters.campaign){const campaign=(info.campaigns||[]).find(c=>c.id===filters.campaign);if(!campaign||r.campaign!==campaign.name)return false;}
 const choices=[...r.availability,...(r.assigned?[r.assigned]:[])];
 if(filters.date&&!choices.some(q=>q.startsWith(filters.date)))return false;
 if(filters.day&&!choices.some(q=>q.startsWith(filters.day)))return false;
 if(filters.hour&&!choices.some(q=>q.endsWith(filters.hour)&&(filters.date?q.startsWith(filters.date):true)&&(filters.day?q.startsWith(filters.day):true)))return false;
 if(filters.status===EXTRA_STATUS?eligible(r):filters.status&&(!eligible(r)||r.status!==filters.status))return false;
 if(filters.q&&!((r.first+" "+r.last+" "+r.phone+" "+r.barrio).toLowerCase().includes(filters.q.toLowerCase())))return false;
 return true;
});}
function updateCampaignFilter(){
 const select=node.querySelector("#fq-campaign");
 const campaigns=Array.isArray(info?.campaigns)?info.campaigns:[];
 const previous=filters.campaign;
 select.innerHTML='<option value="">Todas las encuestas</option>'+campaigns.map(c=>'<option value="'+E(c.id)+'">'+E(c.id==="ESTUDIO_OPINION_2026"?"Estratos 2 y 3+":c.name)+'</option>').join("");
 if(previous&&!campaigns.some(c=>c.id===previous))filters.campaign="";
 select.value=filters.campaign;
}
function render(){
 if(!info)return;const rows=visible();
 const candidates=rows.filter(eligible);
 const metrics=[["Inscriptos únicos",candidates.length,"Solo personas que deciden o comparten decisiones del hogar."],["Confirmados",candidates.filter(r=>r.status==="Confirmado").length,"Candidatos elegibles confirmados."],["Contactados a confirmar",candidates.filter(r=>r.status==="Contactado a confirmar").length,"Candidatos elegibles pendientes."],["Preinscritos",candidates.filter(r=>r.status==="Preinscrito").length,"Candidatos elegibles pendientes de gestión."],["No asistirán",candidates.filter(r=>r.status==="No asistirá").length,"Candidatos elegibles que no asistirán."],["No elegibles",rows.filter(r=>!eligible(r)).length,"Registrados que no deciden ni comparten decisiones, excluidos de los cupos."]];
 node.querySelector("#fq-kpis").innerHTML=metrics.map(a=>'<article>'+E(a[0])+' '+hint(a[2])+'<strong>'+a[1]+'</strong></article>').join("");
 node.querySelector("#fq-slots").innerHTML=info.slots.map(s=>{
  const lines=[["Asignados",s.assigned,"Participantes ubicados en esta sesión."],["Confirmados",s.confirmed,"Asignados que confirmaron."],["Contactados a confirmar",s.contacted,"Asignados pendientes de confirmación."],["Preinscritos asignados",s.pending,"Asignados todavía sin gestionar."],["No asistirán",s.notAttending,"Asignados que no asistirán."]];
  return '<article class="fq-slot '+level(s.available)+'"><strong>'+E(label(s.id))+'</strong> '+hint("Disponibles: personas que eligieron este horario. Pueden aparecer en otros. No cierra automáticamente.")+'<div class="big">'+s.available+' <small style="font-size:16px">/ 12</small></div><div class="bar"><i style="width:'+Math.min(100,s.available/12*100)+'%"></i></div>'+
  lines.map((a,i)=>'<div class="fq-metric fq-metric-'+i+'"><span>'+E(a[0])+' '+hint(a[2])+'</span><b>'+a[1]+'</b></div>').join("")+
  '<button class="fq-btn" data-view="'+E(s.id)+'">Ver inscriptos</button> '+(info.canEdit?'<button class="fq-btn" data-toggle="'+E(s.id)+'" data-open="'+s.open+'">'+(s.open?"Cerrar":"Reabrir")+'</button>':'')+'<div class="fq-muted">'+(s.open?"Abierto":"Cerrado manualmente")+'</div></article>';
 }).join("");
 renderTable();
}
function displayColumns(){
 return [...COLUMNS.filter(c=>c[0]==="participant"||(c[0]!=="actions"&&selectedColumns.has(c[0])&&(!RESTRICTED.has(c[0])||info?.canEdit))),["actions","Acciones"]];
}
function renderColumnPicker(){
 const panel=node.querySelector("#fq-columns-panel");if(!panel)return;
 const options=COLUMNS.filter(c=>c[0]!=="participant"&&c[0]!=="actions"&&(!RESTRICTED.has(c[0])||info?.canEdit));
 panel.innerHTML='<strong>Selecciona las columnas</strong><div class="fq-column-list">'+options.map(c=>'<label><input type="checkbox" value="'+E(c[0])+'" '+(selectedColumns.has(c[0])?'checked':'')+'> '+E(c[1])+'</label>').join("")+'</div><div class="fq-column-actions"><button class="fq-btn green" type="button" id="fq-cols-apply">Aplicar</button><button class="fq-btn" type="button" id="fq-cols-reset">Restablecer</button></div>';
 panel.querySelector("#fq-cols-apply").onclick=()=>{
  selectedColumns=new Set(["participant","actions",...Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'),x=>x.value)]);
  panel.hidden=true;node.querySelector("#fq-columns").setAttribute("aria-expanded","false");renderTable();
 };
 panel.querySelector("#fq-cols-reset").onclick=()=>{
  selectedColumns=new Set(DEFAULT_COLUMNS);panel.hidden=true;node.querySelector("#fq-columns").setAttribute("aria-expanded","false");renderTable();
 };
}
function coordinates(r){
 if(!info?.canEdit)return "Restringido";
 const a=Number(r.geoLat),b=Number(r.geoLng);
 if(r.geoStatus!=="Autorizado"||!String(r.geoLat||"").trim()||!String(r.geoLng||"").trim()||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)return "Sin coordenadas";
 return '<a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(a+","+b)+'" target="_blank" rel="noopener noreferrer" aria-label="Ver coordenadas en Google Maps">'+E(a.toFixed(6)+", "+b.toFixed(6))+' ↗</a>';
}
function dataCell(r,key){
 switch(key){
 case "participant":return '<b>'+E((r.first+" "+r.last).trim())+'</b>';
 case "cedula":return E(r.cedula||"—");
 case "phone":return E(r.phone);
 case "barrio":return E(r.barrio);
 case "stratum":return E(r.stratum||"—");
 case "operator":return E((r.operator||"—")+(r.otherOperator?" · "+r.otherOperator:""));
 case "availability":return E(r.availability.map(label).join("; ")||"Sin disponibilidad");
 case "assigned":{
  if(!eligible(r))return '<span class="fq-eligibility">No elegible</span>';
  const options='<option value="">Sin asignar</option>'+OPTIONS.filter(x=>r.availability.includes(x[0])).map(x=>'<option value="'+E(x[0])+'" '+(r.assigned===x[0]?"selected":"")+'>'+E(x[1])+'</option>').join("");
  return '<select class="fq-assign" '+(info.canEdit?"":"disabled")+'>'+options+'</select>';
 }
 case "status":{
  if(!eligible(r))return '<span class="fq-eligibility">No elegible</span>';
  return '<select class="fq-status" data-current-status="'+E(r.status)+'" '+(info.canEdit?"":"disabled")+'>'+STATUSES.map(x=>'<option '+(r.status===x?"selected":"")+'>'+E(x)+'</option>').join("")+'</select>';
 }
 case "coordinates":return coordinates(r);
 case "actions":return !eligible(r)?'<span class="fq-eligibility">Revisión</span>':(info.canEdit?'<button class="fq-btn" data-save="'+E(r.id)+'">Guardar</button>':'Solo lectura');
 case "email":return E(r.email||"—");
 case "address":return E(r.address||"—");
 case "age":return E(r.age||"—");
 case "decision":return E(r.decision==="No"?"No, otra persona decide":r.decision==="Decido"?"Decide":r.decision==="Compartimos"?"Comparte decisión":r.decision||"—");
 case "stratumBill":return E(r.stratumBill||"—");
 case "internet":return E(r.internet||"—");
 case "otherOperator":return E(r.otherOperator||"—");
 case "income":return E(r.income||"—");
 case "source":return E(r.source||"—");
 case "geoStatus":return E(r.geoStatus||"—");
 case "geoAccuracy":return E(r.geoAccuracy?String(r.geoAccuracy)+" m":"—");
 case "geoAt":return E(r.geoAt||"—");
 case "registered":return E(r.registered||"—");
 case "updated":return E(r.updated||"—");
 case "updatedBy":return E(r.updatedBy||"—");
 case "campaign":return E("Estratos 2 y 3+");
 default:return "—";
 }
}
function renderTable(){
 if(!node||!info)return;
 const cols=displayColumns(),all=visible(),q=tableQuery.trim();
 const rows=q?all.filter(r=>([r.first,r.last,r.phone,r.barrio,r.stratum,r.operator,r.cedula,r.email,r.address,r.decision,r.geoLat,r.geoLng,r.status,r.source].join(" ").toLocaleLowerCase("es").includes(q))):all;
 node.querySelector("#fq-count").textContent="Inscriptos ("+rows.length+")";
 node.querySelector("#fq-table-head").innerHTML='<tr>'+cols.map(c=>'<th scope="col">'+E(c[1])+'</th>').join("")+'</tr>';
 const slice=rows.slice(0,rowLimit);
 node.querySelector("#fq-rows").innerHTML=slice.length?slice.map(r=>'<tr data-id="'+E(r.id)+'">'+cols.map(c=>'<td>'+dataCell(r,c[0])+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+cols.length+'" style="padding:24px">No hay inscriptos que coincidan con los filtros.</td></tr>';
 const remain=Math.min(20,Math.max(0,rows.length-rowLimit)),more=node.querySelector("#fq-more");more.hidden=!remain;more.textContent="Ver más ("+remain+")";
}

function showSuggestions(){
 if(!info?.canEdit)return;
 const proposals=info.suggestions?.proposed||[],panel=node.querySelector("#fq-preview");panel.hidden=false;panel.className="fq-preview";
 panel.innerHTML='<div class="fq-tools"><strong>Distribución sugerida: '+proposals.length+' personas</strong> '+hint("Prioriza personas con menos disponibilidad. No aplica cambios sin aprobación.")+' <button id="fq-hide" class="fq-btn">Cerrar</button></div>'+
 (proposals.length?'<p>Revisá antes de aplicar. Cada persona quedará asignada a una sola sesión.</p><ul>'+proposals.map(p=>'<li>'+E(p.name)+' → '+E(label(p.assigned))+'</li>').join("")+'</ul><button id="fq-apply" class="fq-btn green">Aplicar sugerencias</button>':'<p>Sin propuestas pendientes.</p>');
 panel.querySelector("#fq-hide").onclick=()=>panel.hidden=true;
 const button=panel.querySelector("#fq-apply");if(button)button.onclick=async()=>{if(!confirm("¿Aplicar "+proposals.length+" asignaciones propuestas?"))return;panel.hidden=true;await save({action:"applySuggestions",assignments:proposals.map(p=>({id:p.id,assigned:p.assigned}))});};
}
function exportCsv(){
 const rows=visible(),arr=[["ID","Nombre","Apellido","Celular","Barrio","Disponibilidad","Sesión asignada","Estado"],...rows.map(r=>[r.id,r.first,r.last,r.phone,r.barrio,r.availability.map(label).join("; "),label(r.assigned),r.status])];
 const csv="\ufeff"+arr.map(a=>a.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const link=document.createElement("a"),file=globalThis.URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.href=file;link.download="focus-group-estratos-2-y-3.csv";link.click();setTimeout(()=>globalThis.URL.revokeObjectURL(file),800);
}
window.FIBRAZO_OPEN_OPINION_SUMMARY=open;
window.addEventListener("fibrazo:access-ready",()=>{if(new URLSearchParams(location.search).get("resumen")==="focus-group")open();});
})();