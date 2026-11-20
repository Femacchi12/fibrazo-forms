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
const filters={campaign:"",date:"",day:"",hour:"",status:"",q:""};
const styles=[
"#fq-root{position:fixed;inset:0;z-index:99999;background:#0b0b0f;color:#faf9fd;overflow-y:auto;padding:22px 2vw;font:13px Arial,sans-serif}#fq-root *{box-sizing:border-box}#fq-root [hidden]{display:none!important}.fq-wrap{max-width:1550px;margin:auto}",
"#fq-root button,#fq-root select,#fq-root input{font:inherit}#fq-root button{cursor:pointer}.fq-top,.fq-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.fq-top{padding-bottom:15px;border-bottom:1px solid #393640}.fq-top h1{font-size:25px;margin:6px 0}.fq-muted{color:#aaa9ba;font-size:11px}.fq-btn{border:1px solid #676075;background:#282431;color:#fff;padding:9px 12px;border-radius:8px}.fq-btn.green{background:#49eb91;border-color:#49eb91;color:#06150c;font-weight:bold}.fq-btn:disabled{opacity:.5;cursor:default}",
".fq-filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1.5fr;gap:10px;background:#19171e;border:1px solid #35313d;border-radius:13px;padding:14px;margin:16px 0}.fq-filters label{font-size:11px;color:#bbb4cc}.fq-filters select,.fq-filters input,.fq-list select{display:block;background:#101016;color:#fff;border:1px solid #61596d;padding:8px;border-radius:7px;width:100%;min-height:35px;margin-top:5px}",
".fq-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:15px 0}.fq-kpis article,.fq-slot{background:#17161e;border:1px solid #423d4e;border-radius:13px;padding:13px}.fq-kpis strong{display:block;font-size:24px;margin:8px 0}.fq-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 22px}.fq-slot strong{font-size:12px}.fq-slot .big{font-size:33px;font-weight:800;margin:12px 0}.fq-slot.white .big{color:white}.fq-slot.green .big{color:#51eb91}.fq-slot.yellow .big{color:#ffdf62}.fq-slot.orange .big{color:#ffa64e}.fq-slot.red .big{color:#ff616c}.fq-slot.strong-red .big{color:#ff2438;text-shadow:0 0 15px #f003}.fq-slot .bar{height:7px;background:#514b5e;border-radius:6px;overflow:hidden;margin:10px 0}.fq-slot .bar i{height:100%;display:block;background:currentColor}.fq-slot.green{color:#51eb91}.fq-slot.yellow{color:#ffdf62}.fq-slot.orange{color:#ffa64e}.fq-slot.red{color:#ff616c}.fq-slot.strong-red{color:#ff2438}.fq-slot.white{color:white}.fq-slot .fq-metric{display:flex;justify-content:space-between;margin:6px 0;color:#e2e0ea;font-size:12px}",
".fq-table{width:100%;border-collapse:collapse;font-size:12px}.fq-table th{text-align:left;padding:12px;background:#30263e;color:#e8d5ff}.fq-table td{padding:8px;border-top:1px solid #36333f}.fq-tablebox{overflow:auto;border:1px solid #3f3949;border-radius:10px}.fq-message{min-height:24px;color:#eed08b;margin:10px 0}.fq-preview{border:1px solid #9271b2;background:#272032;border-radius:12px;padding:15px;margin:12px 0}.fq-preview ul{max-height:210px;overflow:auto}.fq-tip{position:relative;border:1px solid #9785a5;color:#e2d8eb;border-radius:100%;background:transparent;font-size:11px;font-weight:700;width:18px;height:18px;margin-left:4px}.fq-tip:focus:after,.fq-tip:hover:after{content:attr(data-tip);position:absolute;z-index:30;bottom:calc(100% + 9px);right:0;background:#30283c;color:#fff;border:1px solid #a58ac2;box-shadow:0 8px 18px #0009;border-radius:8px;padding:9px;width:210px;text-align:left;white-space:normal;line-height:1.4;font-size:12px}.fq-slot button{margin:5px 4px 0 0}",
"#fq-root{background:#000;color:var(--fz-text,#f3f7f5);font-family:Inter,system-ui,Arial,sans-serif;padding:16px min(2vw,28px) 30px}#fq-root .fq-wrap{max-width:1680px}#fq-root .fq-top{border-color:var(--fz-border,#414d47);gap:10px;padding-bottom:12px}#fq-root .fq-top h1{font-size:clamp(21px,2.1vw,27px);letter-spacing:-.035em;font-weight:750}#fq-root .fq-muted{color:var(--fz-muted,#a2ada7)}#fq-root .fq-btn{background:var(--fz-control,#1d2320);border-color:var(--fz-border,#414d47);color:#edf7f0;border-radius:8px;padding:6px 10px;font-weight:550;font-size:11px;line-height:1.4;white-space:nowrap;min-height:30px}#fq-root .fq-btn:hover{background:var(--fz-control-hover,#272e2a);border-color:#00c984}#fq-root .fq-btn.green{background:var(--fz-green,#00f29a);border-color:var(--fz-green,#00f29a);color:#001a10}#fq-root .fq-btn.green:hover{filter:brightness(.92)}#fq-root .fq-btn:focus-visible,#fq-root .fq-filters :focus-visible,#fq-root .fq-list :focus-visible{outline:2px solid var(--fz-green,#00f29a);outline-offset:2px}",
".fq-filters{grid-template-columns:minmax(180px,2fr) repeat(4,minmax(95px,1fr)) minmax(160px,1.35fr);gap:8px;background:var(--fz-surface,#101412);border-color:var(--fz-border,#414d47);padding:11px;margin:12px 0}.fq-filters label{color:var(--fz-muted,#a2ada7);font-size:10px;font-weight:600}.fq-filters select,.fq-filters input,.fq-table select{background:var(--fz-control,#1d2320);border:1px solid var(--fz-border,#414d47);color:#f3f7f5;border-radius:7px;padding:5px 9px;min-height:30px;font-size:11px}.fq-filters select,.fq-filters input{margin-top:5px}.fq-table select{margin-top:0;max-width:180px;min-width:104px;font-size:11px;min-height:29px;padding:4px 7px}.fq-table select.fq-status{min-width:150px}.fq-kpis{gap:9px;margin:12px 0}.fq-kpis article,.fq-slot{background:var(--fz-surface,#101412);border-color:var(--fz-border,#414d47);border-radius:11px;padding:12px}.fq-kpis article{min-height:88px;font-size:11px}.fq-kpis strong{font-size:23px;margin:6px 0;color:#f5faf7}.fq-tools{gap:8px}.fq-tools h2{margin:7px 0;font-size:16px}.fq-slots{gap:9px;margin:10px 0 16px}.fq-slot strong{font-size:11px;color:#f3f7f5}.fq-slot .big{font-size:31px;margin:8px 0}.fq-slot .bar{background:#36413b;height:6px;margin:8px 0 10px}.fq-slot .fq-metric{margin:4px 0;color:#d0ddd5;font-size:11px}.fq-slot button.fq-btn{margin:7px 4px 3px 0;padding:5px 9px;min-height:27px}.fq-table th{background:#15251d;color:#b9f5d7;padding:10px 9px;font-size:10px;letter-spacing:.025em}.fq-table td{border-color:#334139;padding:7px 9px}.fq-tablebox{border-color:var(--fz-border,#414d47)}.fq-preview{background:#14221a;border-color:#357857}.fq-message{min-height:14px;margin:6px 0;color:#a2ada7}",
".fq-tip{display:inline;position:relative;vertical-align:baseline;width:auto;height:auto;min-width:0;min-height:0;margin-left:3px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;color:#92c8ae;line-height:1;font-family:inherit;font-size:11px;font-weight:750;cursor:help;white-space:nowrap}.fq-tip:hover,.fq-tip:focus-visible{color:#00f29a;outline:0}.fq-tip:hover:after,.fq-tip:focus-visible:after{content:attr(data-tip);position:absolute;bottom:calc(100% + 9px);left:0;right:auto;width:210px;z-index:50;white-space:normal;background:#173126;color:#f2fcf6;border:1px solid #426c57;border-radius:7px;box-shadow:0 9px 23px #000c;padding:8px 10px;font:11px/1.4 Inter,system-ui,Arial,sans-serif;text-align:left;pointer-events:none}.fq-slot.yellow .big{color:#ffd361}.fq-slot.orange .big{color:#ffa64e}.fq-slot.red .big{color:#ff606c}.fq-slot.strong-red .big{color:#ff2735}",
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
 '<label>Estado<select id="fq-status"><option value="">Todos</option>'+STATUSES.map(v=>'<option>'+E(v)+'</option>').join("")+'</select></label>'+
 '<label>Nombre o celular<input type="search" id="fq-q" placeholder="Buscar participante"></label></div>'+
 '<div id="fq-kpis" class="fq-kpis"></div><div class="fq-tools"><h2>Sesiones</h2><button id="fq-suggest" class="fq-btn" disabled>Sugerir distribución</button><span class="fq-muted">Solo se cierran manualmente.</span></div>'+
 '<div id="fq-slots" class="fq-slots"></div><div id="fq-preview" hidden></div><div class="fq-tools"><h2 id="fq-count">Inscriptos</h2><button class="fq-btn" id="fq-export">Exportar CSV</button></div>'+
 '<div class="fq-tablebox"><table class="fq-table"><thead><tr><th>Participante</th><th>Celular</th><th>Barrio</th><th>Disponibilidad '+hint("Los horarios elegidos por la persona. Puede haber varios.")+'</th><th>Sesión asignada '+hint("Una sola sesión por persona. Solo horarios declarados.")+'</th><th>Estado '+hint("Preinscrito, Contactado a confirmar, Confirmado o No asistirá.")+'</th><th>Acciones</th></tr></thead><tbody id="fq-rows"></tbody></table></div></div>';
 document.body.appendChild(node);
 node.querySelector("#fq-exit").onclick=close;
 node.querySelector("#fq-refresh").onclick=load;
 node.querySelector("#fq-suggest").onclick=showSuggestions;
 node.querySelector("#fq-export").onclick=exportCsv;
 node.querySelector("#fq-copy").onclick=()=>navigator.clipboard.writeText(SHARE).then(()=>message("Enlace copiado. Requiere acceso corporativo."),()=>message("Copiá: "+SHARE));
 for(const f of Object.keys(filters)){node.querySelector("#fq-"+f).addEventListener(f==="q"?"input":"change",e=>{filters[f]=e.target.value;render();});}
 node.querySelector("#fq-slots").onclick=async e=>{
  const view=e.target.closest("[data-view]");if(view){const key=view.dataset.view;filters.date=key.slice(0,10);filters.day="";filters.hour=key.slice(-5);node.querySelector("#fq-date").value=filters.date;node.querySelector("#fq-day").value="";node.querySelector("#fq-hour").value=filters.hour;render();return;}
  const toggle=e.target.closest("[data-toggle]");if(toggle&&info?.canEdit){if(!confirm((toggle.dataset.open==="true"?"Cerrar":"Reabrir")+" sesión "+label(toggle.dataset.toggle)+"?"))return;await save({action:"setSlot",slot:toggle.dataset.toggle,open:toggle.dataset.open!=="true"});}
 };
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
 if(filters.status&&r.status!==filters.status)return false;
 if(filters.q&&!((r.first+" "+r.last+" "+r.phone+" "+r.barrio).toLowerCase().includes(filters.q.toLowerCase())))return false;
 return true;
});}
function updateCampaignFilter(){
 const select=node.querySelector("#fq-campaign");
 const campaigns=Array.isArray(info?.campaigns)?info.campaigns:[];
 const previous=filters.campaign;
 select.innerHTML='<option value="">Todas las encuestas</option>'+campaigns.map(c=>'<option value="'+E(c.id)+'">'+E(c.id==="ESTUDIO_OPINION_2026"?"Focus Group":c.name)+'</option>').join("");
 if(previous&&!campaigns.some(c=>c.id===previous))filters.campaign="";
 select.value=filters.campaign;
}
function render(){
 if(!info)return;const rows=visible();
 const metrics=[["Inscriptos únicos",rows.length,"Cada persona se cuenta una sola vez."],["Confirmados",rows.filter(r=>r.status==="Confirmado").length,"Personas confirmadas para una sesión."],["Contactados a confirmar",rows.filter(r=>r.status==="Contactado a confirmar").length,"Personas contactadas pendientes de confirmación."],["Preinscritos",rows.filter(r=>r.status==="Preinscrito").length,"Personas que todavía requieren gestión."],["No asistirán",rows.filter(r=>r.status==="No asistirá").length,"No se contabilizan como candidatos activos."]];
 node.querySelector("#fq-kpis").innerHTML=metrics.map(a=>'<article>'+E(a[0])+' '+hint(a[2])+'<strong>'+a[1]+'</strong></article>').join("");
 node.querySelector("#fq-slots").innerHTML=info.slots.map(s=>{
  const lines=[["Asignados",s.assigned,"Participantes ubicados en esta sesión."],["Confirmados",s.confirmed,"Asignados que confirmaron."],["Contactados a confirmar",s.contacted,"Asignados pendientes de confirmación."],["Preinscritos asignados",s.pending,"Asignados todavía sin gestionar."],["No asistirán",s.notAttending,"Asignados que no asistirán."]];
  return '<article class="fq-slot '+level(s.available)+'"><strong>'+E(label(s.id))+'</strong> '+hint("Disponibles: personas que eligieron este horario. Pueden aparecer en otros. No cierra automáticamente.")+'<div class="big">'+s.available+' <small style="font-size:16px">/ 12</small></div><div class="bar"><i style="width:'+Math.min(100,s.available/12*100)+'%"></i></div>'+
  lines.map(a=>'<div class="fq-metric"><span>'+E(a[0])+' '+hint(a[2])+'</span><b>'+a[1]+'</b></div>').join("")+
  '<button class="fq-btn" data-view="'+E(s.id)+'">Ver inscriptos</button> '+(info.canEdit?'<button class="fq-btn" data-toggle="'+E(s.id)+'" data-open="'+s.open+'">'+(s.open?"Cerrar":"Reabrir")+'</button>':'')+'<div class="fq-muted">'+(s.open?"Abierto":"Cerrado manualmente")+'</div></article>';
 }).join("");
 node.querySelector("#fq-count").textContent="Inscriptos ("+rows.length+")";
 node.querySelector("#fq-rows").innerHTML=rows.length?rows.map(r=>{
 const assign='<option value="">Sin asignar</option>'+OPTIONS.filter(s=>r.availability.includes(s[0])).map(s=>'<option value="'+s[0]+'" '+(r.assigned===s[0]?"selected":"")+'>'+E(s[1])+'</option>').join("");
 return '<tr><td><b>'+E(r.first+" "+r.last)+'</b><div class="fq-muted">'+E(r.id)+'</div></td><td>'+E(r.phone)+'</td><td>'+E(r.barrio)+'</td><td>'+E(r.availability.map(label).join("; ")||"Sin disponibilidad")+'</td><td><select class="fq-assign" '+(info.canEdit?"":"disabled")+'>'+assign+'</select></td><td><select class="fq-status" '+(info.canEdit?"":"disabled")+'>'+STATUSES.map(v=>'<option '+(r.status===v?"selected":"")+'>'+E(v)+'</option>').join("")+'</select></td><td>'+(info.canEdit?'<button class="fq-btn" data-save="'+E(r.id)+'">Guardar</button>':'Solo lectura')+'</td></tr>';
 }).join(""):'<tr><td colspan="7" style="padding:24px">No hay inscriptos que coincidan con los filtros.</td></tr>';
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