// FO-CHG-149 — Private Focus Group dashboard (Firebase bearer token required).
(()=>{
"use strict";
const API="/api/estudio-opinion?summary=1", SHARE=location.origin+"/?resumen=focus-group";
const OLD_SLOT="2026-11-28@14:00",REPLACEMENT_SLOT="2026-11-29@11:00";
const OPTIONS=[["2026-11-28@09:00","Sáb 28 · 9:00"],["2026-11-29@09:00","Dom 29 · 9:00"],["2026-11-29@11:00","Dom 29 · 11:00"],["2026-11-29@14:00","Dom 29 · 14:00"]];
const STATUSES=["Preinscrito","Contactado a confirmar","Confirmado","No asistirá"];
const CALENDAR_ICON='<svg class="fq-calendar-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>';
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=id=>id===OLD_SLOT?"Sáb 28 · 14:00 (horario anterior)":OPTIONS.find(o=>o[0]===id)?.[1]||"Sin asignar";
const hint=s=>'<span class="fq-tip" tabindex="0" role="note" data-tip="'+E(s)+'" aria-label="'+E(s)+'">?</span>';
const level=n=>n>=15?"strong-red":n>=13?"red":n>=12?"orange":n>=8?"yellow":n>=3?"green":"white";
let node=null,info=null,waiting=false;
const filters={campaign:"ESTUDIO_OPINION_2026",date:"",day:"",hour:"",status:"",q:""};
const EXTRA_STATUS="No elegible";
const FIXED_COLUMNS=new Set(["participant","age","stratumBill","actions","observations","coordinates","eligibilityReason"]);
const DEFAULT_COLUMNS=["participant","phone","barrio","age","stratum","stratumBill","operator","availability","assigned","status","actions","observations","coordinates","eligibilityReason"];
const COLUMNS=[
 ["participant","Participante"],["phone","Celular"],["barrio","Barrio"],["age","Edad"],
 ["stratum","Estrato vivienda"],["stratumBill","Estrato factura"],
 ["operator","Operadores"],["availability","Disponibilidad"],["assigned","Sesión asignada"],
 ["status","Estado"],["actions","Acciones"],["observations","Observaciones"],["coordinates","Coordenadas"],
 ["cedula","Cédula"],["email","Correo"],["address","Dirección"],
 ["decision","Decisión del hogar"],["telecomFamily","Vínculo laboral telecom"],["eligibilityReason","Motivo no elegible"],["internet","Internet fijo"],["otherOperator","Otro operador"],
 ["income","Tipo de ingresos"],["source","Cómo se enteró"],["geoStatus","Estado GPS"],
 ["geoAccuracy","Precisión GPS"],["geoAt","Fecha GPS"],["registered","Fecha inscripción"],
 ["updated","Última actualización"],["updatedBy","Actualizado por"],["campaign","Encuesta"]
]
const RESTRICTED=new Set(["cedula","email","address","coordinates","geoAccuracy","geoAt","income","updatedBy","observations"]);
let tableQuery="",rowLimit=20,selectedColumns=new Set(DEFAULT_COLUMNS),availabilityFilter="";
let tableSort={key:"",direction:"asc"};
const SORT_COLLATOR=new Intl.Collator("es",{sensitivity:"base",numeric:true});
const SORT_NUMERIC=new Set(["age","stratum","stratumBill","geoAccuracy","observations"]);
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
,"#fq-root{font-family:Montserrat,system-ui,Arial,sans-serif;background:#000;color:#fff}\n#fq-root .fq-top h1,#fq-root .fq-tools h2{color:#fff}\n#fq-root .fq-muted{color:#b8b8b8}\n#fq-root .fq-filters,#fq-root .fq-kpis article,#fq-root .fq-slot,#fq-root .fq-table-panel{background:#151515;border:1px solid #494949;border-radius:13px}\n#fq-root .fq-filters label{color:#fff!important;font-size:11px}\n#fq-root .fq-filters select,#fq-root .fq-filters input,#fq-root .fq-table select,#fq-root .fq-table-search{background:#0b0b0b!important;border:1px solid #666!important;color:#fff!important;border-radius:999px!important;min-height:36px;padding:6px 13px;font-size:12px}\n#fq-root .fq-filters input::placeholder,#fq-root .fq-table-search::placeholder{color:#bcbcbc}\n#fq-root .fq-filters option,#fq-root .fq-table option{color:#fff;background:#141414}\n#fq-root .fq-btn{background:#050505!important;color:#fff!important;border:1px solid #686868!important;border-radius:999px!important;min-height:34px;padding:6px 13px;font-family:Montserrat,system-ui,Arial,sans-serif;font-size:11px;font-weight:650}\n#fq-root .fq-btn.green,#fq-root .fq-btn[data-save]{background:#43FFA5!important;border-color:#43FFA5!important;color:#050b08!important}\n#fq-root .fq-btn:hover{border-color:#43FFA5!important}\n#fq-root .fq-btn:focus-visible,#fq-root input:focus-visible,#fq-root select:focus-visible{outline:2px solid #43FFA5!important;outline-offset:2px}\n#fq-root .fq-slot .big{color:#fff}\n#fq-root .fq-table-panel{padding:12px;margin:16px 0 0}\n#fq-root .fq-table-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}\n#fq-root .fq-table-toolbar h2{margin:4px 4px 4px 0;white-space:nowrap}\n#fq-root .fq-table-search{width:min(340px,100%);margin-left:4px}\n#fq-root .fq-table-actions{display:flex;align-items:center;gap:8px;margin-left:auto}\n#fq-root .fq-column-anchor{position:relative}\n#fq-root .fq-column-popover{position:absolute;right:0;top:calc(100% + 6px);z-index:12;background:#171717;border:1px solid #727272;border-radius:13px;padding:13px;width:min(280px,85vw);box-shadow:0 16px 34px #000c;color:#fff}\n#fq-root .fq-column-popover strong{display:block;margin-bottom:8px}\n#fq-root .fq-column-list{display:grid;gap:5px;max-height:330px;overflow:auto;padding:3px}\n#fq-root .fq-column-list label{display:flex;gap:8px;align-items:center;font-size:12px;cursor:pointer}\n#fq-root .fq-column-list input{width:16px;height:16px;accent-color:#43FFA5}\n#fq-root .fq-column-actions{display:flex;gap:8px;margin-top:12px}\n#fq-root .fq-column-actions button{flex:1}\n#fq-root .fq-tablebox{max-height:550px;overflow:auto;overscroll-behavior:contain;scrollbar-color:#888 #141414;border:1px solid #505050;border-radius:10px}\n#fq-root .fq-table{font-family:Poppins,Montserrat,sans-serif;border-collapse:separate;border-spacing:0;min-width:1130px;width:max-content;max-width:none}\n#fq-root .fq-table th,#fq-root .fq-table td{white-space:nowrap;min-width:100px;max-width:280px;padding:10px 12px;border-bottom:1px solid #3a3a3a;color:#fff;background:#101010}\n#fq-root .fq-table td{background:#171717}\n#fq-root .fq-table th{position:sticky;top:0;z-index:3;background:#0c0c0c!important;color:#fff!important;font-size:10px;text-transform:uppercase;letter-spacing:.02em}\n#fq-root .fq-table th:first-child,#fq-root .fq-table td:first-child{position:sticky;left:0;z-index:2;min-width:156px;background:#101010!important;box-shadow:2px 0 3px #000a}\n#fq-root .fq-table th:first-child{z-index:4}\n#fq-root .fq-table td:first-child b{font-weight:750}\n#fq-root .fq-table a{color:#43FFA5;text-decoration:underline;text-underline-offset:3px}\n#fq-root .fq-table .fq-eligibility{display:inline-flex;padding:4px 9px;border:1px solid #8a7644;border-radius:999px;color:#ffde95;white-space:nowrap}\n#fq-root .fq-table select.fq-status,#fq-root .fq-table select.fq-assign{background:#080808!important;border:1px solid #727272!important;color:#fff!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"Confirmado\"]{border-color:#43FFA5!important;color:#43FFA5!important}\n#fq-root .fq-table-bottom{text-align:center;padding:12px 0 2px}\n#fq-root .fq-table-bottom .fq-btn{min-width:145px}\n#fq-root .fq-table-note{color:#c5c5c5;font-size:11px;margin-top:7px}\n#fq-root .fq-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}\n#fq-root .fq-slot .bar{background:#404040}\n#fq-root .fq-slot .bar i{background:#43FFA5}\n#fq-root .fq-slot .fq-metric>b{border-radius:999px}\n@media(max-width:1100px){#fq-root .fq-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}\n@media(max-width:650px){#fq-root .fq-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#fq-root .fq-table-search{width:100%;margin-left:0}#fq-root .fq-table-toolbar h2{width:100%}#fq-root .fq-table-actions{margin-left:0;width:100%;justify-content:space-between}}\n"
,"#fq-root #fq-campaign{border-color:#43FFA5!important;background:#0b0b0b!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"Preinscrito\"]{border-color:#43FFA5!important;color:#fff!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"Confirmado\"]{border-color:#43FFA5!important;color:#43FFA5!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"Contactado a confirmar\"]{border-color:#FFCF40!important;color:#fff!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"No asistirá\"]{border-color:#ff8080!important;color:#fff!important}\n"
,"\n/* FO-CHG-159 — Availability by day and compact, consistently sized row actions. */\n#fq-root .fq-table th.fq-col-availability,#fq-root .fq-table td.fq-col-availability{width:185px;min-width:185px;max-width:185px;white-space:normal}\n#fq-root .fq-table .fq-availability{display:flex;flex-direction:column;align-items:flex-start;min-width:0;max-width:100%;gap:3px;line-height:1.4;font-size:11px}\n#fq-root .fq-table .fq-availability-line{display:block;max-width:100%;white-space:normal;overflow-wrap:anywhere}\n#fq-root .fq-table .fq-availability-line strong{font-weight:700;color:#fff}\n#fq-root .fq-table th.fq-col-assigned,#fq-root .fq-table td.fq-col-assigned{min-width:126px;max-width:135px;width:130px;padding-left:6px;padding-right:6px}\n#fq-root .fq-table th.fq-col-status,#fq-root .fq-table td.fq-col-status{min-width:116px;max-width:170px;width:116px;padding-left:6px;padding-right:6px}\n#fq-root .fq-table th.fq-col-actions,#fq-root .fq-table td.fq-col-actions{min-width:82px;max-width:90px;width:85px;padding-left:6px;padding-right:6px}\n#fq-root .fq-table select.fq-assign,#fq-root .fq-table select.fq-status{display:inline-block;box-sizing:border-box;min-height:26px!important;height:26px!important;padding:3px 18px 3px 8px!important;margin:0!important;font-size:10px!important;line-height:18px!important;vertical-align:middle;border-radius:999px!important;max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#fq-root .fq-table select.fq-assign{width:122px!important;min-width:122px!important}\n#fq-root .fq-table select.fq-status{width:104px!important;min-width:104px!important}\n#fq-root .fq-table select.fq-status[data-current-status=\"Contactado a confirmar\"]{width:165px!important;min-width:165px!important}\n#fq-root .fq-table .fq-btn[data-save]{display:inline-flex;align-items:center;justify-content:center;min-height:26px!important;height:26px!important;min-width:0!important;padding:3px 9px!important;font-size:10px!important;line-height:18px!important;border-radius:999px!important;white-space:nowrap}\n#fq-root .fq-table .fq-eligibility{display:inline-flex;align-items:center;min-height:26px;padding:3px 8px;line-height:18px;font-size:10px}\n"
,"\n/* FO-CHG-160 — Compact instant-toggle column picker */\n#fq-root .fq-column-popover{padding:10px 11px;width:min(240px,85vw)}\n#fq-root .fq-column-popover>strong{display:block;font-size:11px;line-height:1.3;margin:0 0 7px}\n#fq-root .fq-column-list{display:grid;gap:1px;max-height:310px;overflow:auto;padding:1px 2px;align-content:start}\n#fq-root .fq-column-list label{display:flex;align-items:center;gap:7px;min-height:26px;margin:0;padding:3px 4px;border-radius:5px;line-height:1.2;font-size:11px;color:#fff;cursor:pointer}\n#fq-root .fq-column-list label:hover{background:#252525}\n#fq-root .fq-column-list input[type=\"checkbox\"]{appearance:auto;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;margin:0!important;padding:0!important;flex:0 0 14px;accent-color:#43FFA5;cursor:pointer}\n#fq-root .fq-column-actions{margin-top:8px;display:flex;justify-content:center}\n#fq-root .fq-column-actions .fq-btn{flex:1;min-height:30px;padding:5px 9px;font-size:11px}\n"
,"\n/* FO-CHG-161 — private observation log on Focus Group participants. */\n#fq-root .fq-col-observations{min-width:138px;max-width:180px;width:150px}\n#fq-root .fq-note-trigger{min-height:26px!important;height:26px!important;padding:3px 9px!important;font-size:10px!important;line-height:18px!important;white-space:nowrap}\n#fq-root .fq-note-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.84)}\n#fq-root .fq-note-dialog{width:min(540px,100%);max-height:min(90vh,720px);overflow:auto;background:#171717;border:1px solid #757575;border-radius:15px;color:#fff;padding:18px;box-shadow:0 16px 50px #000b}\n#fq-root .fq-note-heading{display:flex;align-items:start;justify-content:space-between;gap:10px}\n#fq-root .fq-note-heading h3{font-size:16px;margin:0 0 5px}\n#fq-root .fq-note-participant{font-size:12px;color:#c9c9c9;margin:0 0 12px}\n#fq-root .fq-note-history{max-height:235px;overflow:auto;margin:7px 0 15px;padding:8px;background:#101010;border:1px solid #414141;border-radius:9px}\n#fq-root .fq-note-entry{padding:9px 8px;border-bottom:1px solid #363636}\n#fq-root .fq-note-entry:last-child{border-bottom:0}\n#fq-root .fq-note-meta{color:#bdbdbd;font-size:10px;margin-bottom:5px;overflow-wrap:anywhere}\n#fq-root .fq-note-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;font-size:12px;color:#fff}\n#fq-root .fq-note-dialog label{display:block;font-size:12px;font-weight:700;margin-bottom:7px}\n#fq-root .fq-note-dialog textarea{width:100%;min-height:92px;background:#0b0b0b;color:#fff;border:1px solid #686868;border-radius:9px;resize:vertical;padding:10px;font:12px/1.5 Montserrat,system-ui,sans-serif}\n#fq-root .fq-note-dialog textarea:focus-visible{outline:2px solid #43FFA5;outline-offset:1px}\n#fq-root .fq-note-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#bdbdbd;font-size:10px;min-height:17px}\n#fq-root .fq-note-error{color:#ff9aa1}\n#fq-root .fq-note-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:13px}\n#fq-root .fq-note-actions .fq-btn{min-height:31px}\n@media(max-width:550px){#fq-root .fq-note-dialog{padding:13px}#fq-root .fq-note-actions{flex-wrap:wrap}}\n"
,"\n/* FO-CHG-162 — Observations textarea: rectangular input and crisp green focus. */\n#fq-root #fq-note-input{border-radius:5px!important;appearance:none!important;-webkit-appearance:none!important;box-shadow:none!important;outline:none!important}\n#fq-root #fq-note-input:focus,#fq-root #fq-note-input:focus-visible{border-radius:5px!important;border-color:#43FFA5!important;outline:2px solid #43FFA5!important;outline-offset:1px;box-shadow:none!important}\n"
,"\n/* FO-CHG-165: clear title hierarchy for KPIs and sessions, approved green calendar icon. */\n#fq-root .fq-kpis article{min-width:0}\n#fq-root .fq-kpi-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;min-height:21px;color:#fff}\n#fq-root .fq-kpi-heading .fq-kpi-title{font-family:Montserrat,system-ui,Arial,sans-serif;font-size:clamp(12px,1.02vw,15px);line-height:1.25;font-weight:750;letter-spacing:-.015em;color:#fff;overflow-wrap:break-word}\n#fq-root .fq-kpi-heading .fq-tip{font-size:12px;color:#43FFA5;margin-left:1px}\n#fq-root .fq-kpis article>strong{margin:8px 0 0;line-height:1.1}\n#fq-root .fq-slot-heading{display:flex;align-items:center;flex-wrap:wrap;gap:7px;min-height:26px;margin:0 0 6px;color:#fff}\n#fq-root .fq-slot-heading .fq-calendar-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px;color:#43FFA5}\n#fq-root .fq-slot-heading .fq-calendar-svg{display:block;width:20px;height:20px}\n#fq-root .fq-slot-heading .fq-slot-title{font-family:Montserrat,system-ui,Arial,sans-serif;font-size:clamp(15px,1.22vw,18px);font-weight:780;line-height:1.25;letter-spacing:-.01em;color:#fff}\n#fq-root .fq-slot-heading .fq-tip{font-size:12px;margin-left:2px;color:#43FFA5}\n#fq-root .fq-slot .big{margin:9px 0 8px}\n@media(max-width:1050px){#fq-root .fq-kpi-heading .fq-kpi-title{font-size:14px}#fq-root .fq-slot-heading .fq-slot-title{font-size:17px}}\n@media(max-width:600px){#fq-root .fq-kpi-heading .fq-kpi-title{font-size:13px}#fq-root .fq-slot-heading .fq-slot-title{font-size:16px}}\n"
,"\n/* FO-CHG-176 — Accessible two-way sorting from Focus Groups table headers. */\n#fq-root .fq-table th .fq-sort-btn{display:inline-flex;align-items:center;justify-content:space-between;gap:7px;width:100%;min-height:22px;margin:0;padding:0;border:0;border-radius:3px;background:transparent!important;color:inherit!important;text-align:left;text-transform:inherit;letter-spacing:inherit;font:inherit;font-weight:750;cursor:pointer}\n#fq-root .fq-table th .fq-sort-btn:hover{color:#43FFA5!important}\n#fq-root .fq-table th .fq-sort-btn:focus-visible{outline:2px solid #43FFA5;outline-offset:3px}\n#fq-root .fq-table th .fq-sort-icon{flex:none;color:#9ca6a0;font-size:11px;line-height:1}\n#fq-root .fq-table th[aria-sort=\"ascending\"] .fq-sort-icon,#fq-root .fq-table th[aria-sort=\"descending\"] .fq-sort-icon{color:#43FFA5}\n"
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
 '<label>Horario<select id="fq-hour"><option value="">Todos</option><option value="09:00">9:00 a. m.</option><option value="11:00">11:00 a. m.</option><option value="14:00">2:00 p. m.</option></select></label>'+
 '<label>Estado<select id="fq-status"><option value="">Todos</option>'+STATUSES.map(v=>'<option>'+E(v)+'</option>').join("")+'<option>'+EXTRA_STATUS+'</option></select></label>'+
 '<label>Nombre o celular<input type="search" id="fq-q" placeholder="Buscar participante"></label></div>'+
 '<div id="fq-kpis" class="fq-kpis"></div><div class="fq-tools"><h2>Sesiones</h2><div class="fq-suggestion-action"><button id="fq-suggest" class="fq-btn" disabled>Sugerir distribución</button> '+hint("Propone repartir a los preinscritos entre los horarios disponibles. No aplica cambios hasta que lo confirmes.")+'</div><span class="fq-muted">Solo se cierran manualmente.</span></div>'+
 '<div id="fq-slots" class="fq-slots"></div><div id="fq-legacy-banner" class="fq-muted" style="margin:4px 0 12px;color:#ffdc99" hidden></div><div id="fq-preview" hidden></div><section class="fq-table-panel"><div class="fq-table-toolbar"><h2 id="fq-count">Inscriptos</h2><input class="fq-table-search" id="fq-table-q" type="search" placeholder="Buscar en la tabla" aria-label="Buscar en la tabla"><div class="fq-table-actions"><button class="fq-btn" id="fq-export">Exportar CSV</button><div class="fq-column-anchor"><button class="fq-btn" id="fq-columns" type="button" aria-expanded="false" aria-controls="fq-columns-panel">Ver más columnas ▾</button><div id="fq-columns-panel" class="fq-column-popover" hidden></div></div></div></div>'+
 '<div class="fq-tablebox" id="fq-tablebox" role="region" aria-label="Tabla de inscritos desplazable" tabindex="0"><table class="fq-table"><thead id="fq-table-head"></thead><tbody id="fq-rows"></tbody></table></div><div class="fq-table-bottom"><button class="fq-btn" type="button" id="fq-more" hidden>Ver más</button><div class="fq-table-note">Desplázate para consultar más filas y columnas. La columna Participante permanece fija.</div></div></section></div>';
 document.body.appendChild(node);
 node.insertAdjacentHTML("beforeend","<div class=\"fq-note-overlay\" id=\"fq-note-modal\" hidden><section class=\"fq-note-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"fq-note-title\"><div class=\"fq-note-heading\"><div><h3 id=\"fq-note-title\">Observaciones</h3><p class=\"fq-note-participant\" id=\"fq-note-participant\"></p></div><button type=\"button\" id=\"fq-note-close\" class=\"fq-btn\" aria-label=\"Cerrar observaciones\">Cerrar</button></div><div class=\"fq-note-history\" id=\"fq-note-history\" aria-live=\"polite\"></div><label for=\"fq-note-input\">Nueva observación</label><textarea id=\"fq-note-input\" rows=\"4\" maxlength=\"1500\" placeholder=\"Anota aquí lo que comentaron o lo que necesites recordar de este participante.\"></textarea><div class=\"fq-note-footer\"><span id=\"fq-note-counter\">0 / 1500</span><span class=\"fq-note-error\" id=\"fq-note-error\" role=\"alert\"></span></div><div class=\"fq-note-actions\"><button type=\"button\" class=\"fq-btn\" id=\"fq-note-cancel\">Cancelar</button><button type=\"button\" class=\"fq-btn green\" id=\"fq-note-save\">Guardar observación</button></div></section></div>");
 node.querySelector("#fq-note-close").onclick=closeNotes;
 node.querySelector("#fq-note-cancel").onclick=closeNotes;
 node.querySelector("#fq-note-modal").onclick=e=>{if(e.target===e.currentTarget)closeNotes();};
 node.querySelector("#fq-note-input").oninput=e=>{node.querySelector("#fq-note-counter").textContent=e.target.value.length+" / 1500";node.querySelector("#fq-note-error").textContent="";};
 node.querySelector("#fq-note-save").onclick=saveObservation;
 node.addEventListener("keydown",e=>{if(e.key==="Escape"&&!node.querySelector("#fq-note-modal").hidden){e.preventDefault();closeNotes();}});
 node.querySelector("#fq-exit").onclick=close;
 node.querySelector("#fq-refresh").onclick=load;
 node.querySelector("#fq-suggest").onclick=showSuggestions;
 node.querySelector("#fq-export").onclick=exportCsv;
 node.querySelector("#fq-copy").onclick=()=>navigator.clipboard.writeText(SHARE).then(()=>message("Enlace copiado. Requiere acceso corporativo."),()=>message("Copiá: "+SHARE));
 for(const f of Object.keys(filters)){node.querySelector("#fq-"+f).addEventListener(f==="q"?"input":"change",e=>{filters[f]=e.target.value;rowLimit=20;render();});}
 node.querySelector("#fq-table-q").addEventListener("input",e=>{tableQuery=e.target.value.toLocaleLowerCase("es");rowLimit=20;renderTable();});
 node.querySelector("#fq-table-head").addEventListener("change",e=>{
  if(e.target.id!=="fq-avail-filter")return;
  availabilityFilter=e.target.value;
  filters.date=filters.day=filters.hour="";
  for(const key of ["date","day","hour"])node.querySelector("#fq-"+key).value="";
  rowLimit=20;render();node.querySelector("#fq-avail-filter")?.focus();
 });
 node.querySelector("#fq-table-head").addEventListener("click",e=>{
  const button=e.target.closest("button[data-fq-sort]");if(!button)return;
  const key=button.dataset.fqSort;
  if(!displayColumns().some(c=>c[0]===key))return;
  tableSort=tableSort.key===key?{key,direction:tableSort.direction==="asc"?"desc":"asc"}:{key,direction:"asc"};
  rowLimit=20; // Sort the entire filtered dataset before showing its first page.
  const scroller=node.querySelector("#fq-tablebox"),left=scroller.scrollLeft,top=scroller.scrollTop;
  renderTable();
  scroller.scrollLeft=left;scroller.scrollTop=top;
  node.querySelector('#fq-table-head button[data-fq-sort="'+key+'"]')?.focus({preventScroll:true});
 });
 node.querySelector("#fq-more").addEventListener("click",()=>{rowLimit+=20;renderTable();});
 node.querySelector("#fq-columns").addEventListener("click",()=>{
  const panel=node.querySelector("#fq-columns-panel");panel.hidden=!panel.hidden;
  node.querySelector("#fq-columns").setAttribute("aria-expanded",String(!panel.hidden));
  if(!panel.hidden)renderColumnPicker();
 });
 node.querySelector("#fq-slots").onclick=async e=>{
  const view=e.target.closest("[data-view]");if(view){availabilityFilter="";const key=view.dataset.view;filters.date=key.slice(0,10);filters.day="";filters.hour=key.slice(-5);node.querySelector("#fq-date").value=filters.date;node.querySelector("#fq-day").value="";node.querySelector("#fq-hour").value=filters.hour;render();return;}
  const toggle=e.target.closest("[data-toggle]");if(toggle&&info?.canEdit){if(!confirm((toggle.dataset.open==="true"?"Cerrar":"Reabrir")+" sesión "+label(toggle.dataset.toggle)+"?"))return;await save({action:"setSlot",slot:toggle.dataset.toggle,open:toggle.dataset.open!=="true"});}
 };
 node.querySelector("#fq-rows").addEventListener("change",e=>{if(e.target.matches(".fq-status"))e.target.dataset.currentStatus=e.target.value;});
 node.querySelector("#fq-rows").onclick=async e=>{
  const noteBtn=e.target.closest("[data-note]");if(noteBtn){openNotes(noteBtn.dataset.note);return;}
  const saveBtn=e.target.closest("[data-save]");if(!saveBtn)return;
  const tr=saveBtn.closest("tr"),row=info?.rows?.find(r=>r.id===saveBtn.dataset.save);
   const assigned=tr.querySelector(".fq-assign").value,status=tr.querySelector(".fq-status").value;
   const confirmLegacyMove=assigned===REPLACEMENT_SLOT&&row?.availability?.includes(OLD_SLOT)&&!row.availability.includes(REPLACEMENT_SLOT);
   if(confirmLegacyMove&&!confirm("Esta persona indicó disponibilidad para el horario anterior (sábado 28, 2:00 p. m.). ¿Confirmaste con ella que podrá asistir el domingo 29 a las 11:00 a. m.?"))return;
   const overrideIneligible=!eligible(row)&&(Boolean(assigned)||status==="Confirmado");
   if(overrideIneligible&&!confirm("Esta persona sigue marcada como no elegible: "+(row.eligibilityReason||"requiere revisión")+". ¿Confirmas su asignación o participación manual? El motivo de no elegibilidad se mantendrá."))return;
   await save({action:"update",id:saveBtn.dataset.save,status,assigned,confirmLegacyMove,overrideIneligible});
 };
}
let activeNoteId="",savingNote=false;
function closeNotes(){
 const modal=node?.querySelector("#fq-note-modal");if(modal)modal.hidden=true;
 activeNoteId="";
}
function openNotes(id){
 if(!info?.canEdit)return;
 const row=(info.rows||[]).find(r=>r.id===id);if(!row)return;
 activeNoteId=id;
 node.querySelector("#fq-note-participant").textContent=(row.first+" "+row.last).trim();
 const items=Array.isArray(row.notes)?[...row.notes].reverse():[];
 const history=node.querySelector("#fq-note-history");
 history.innerHTML=items.length?items.map(entry=>
  '<div class="fq-note-entry"><div class="fq-note-meta">'+E(entry.at||"")+" · "+E(entry.author||"")+'</div><div class="fq-note-text">'+E(entry.text||"")+'</div></div>'
 ).join(""):'<div class="fq-note-entry">Todavía no hay observaciones para este participante.</div>';
 node.querySelector("#fq-note-input").value="";
 node.querySelector("#fq-note-counter").textContent="0 / 1500";
 node.querySelector("#fq-note-error").textContent="";
 node.querySelector("#fq-note-modal").hidden=false;
 node.querySelector("#fq-note-input").focus();
}
async function saveObservation(){
 if(savingNote||!activeNoteId||!info?.canEdit)return;
 const text=node.querySelector("#fq-note-input").value.trim();
 if(!text||text.length>1500){node.querySelector("#fq-note-error").textContent="Escribe entre 1 y 1500 caracteres.";return;}
 savingNote=true;node.querySelector("#fq-note-save").disabled=true;
 try{
  await request({action:"addObservation",id:activeNoteId,text});
  closeNotes();await load();message("Observación guardada correctamente.");
 }catch(error){node.querySelector("#fq-note-error").textContent=error.message||"No se pudo guardar la observación.";}
 finally{savingNote=false;node.querySelector("#fq-note-save").disabled=false;}
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
function close(){if(!node)return;closeNotes();node.hidden=true;document.body.style.overflow="";history.replaceState(null,"","/");}
function visible(){return (info?.rows||[]).filter(r=>{
 if(filters.campaign){const campaign=(info.campaigns||[]).find(c=>c.id===filters.campaign);if(!campaign||r.campaign!==campaign.name)return false;}
 const choices=[...r.availability,...(r.assigned?[r.assigned]:[])];
 if(filters.date&&!choices.some(q=>q.startsWith(filters.date)))return false;
 if(filters.day&&!choices.some(q=>q.startsWith(filters.day)))return false;
 if(filters.hour&&!choices.some(q=>q.endsWith(filters.hour)&&(filters.date?q.startsWith(filters.date):true)&&(filters.day?q.startsWith(filters.day):true)))return false;
 if(filters.status===EXTRA_STATUS?eligible(r):filters.status&&r.status!==filters.status)return false;
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
 const metrics=[["Inscriptos únicos",candidates.length,"Solo personas que deciden o comparten decisiones del hogar."],["Confirmados",candidates.filter(r=>r.status==="Confirmado").length,"Candidatos elegibles confirmados."],["Contactados a confirmar",candidates.filter(r=>r.status==="Contactado a confirmar").length,"Candidatos elegibles pendientes."],["Preinscritos",candidates.filter(r=>r.status==="Preinscrito").length,"Candidatos elegibles pendientes de gestión."],["No asistirán",candidates.filter(r=>r.status==="No asistirá").length,"Candidatos elegibles que no asistirán."],["No elegibles",rows.filter(r=>!eligible(r)).length,"Personas que no toman o comparten decisiones del hogar, tienen vínculo laboral con telecomunicaciones o no han respondido ese requisito. No se consideran para cupos."]];
 node.querySelector("#fq-kpis").innerHTML=metrics.map(a=>'<article><div class="fq-kpi-heading"><span class="fq-kpi-title">'+E(a[0])+'</span>'+hint(a[2])+'</div><strong>'+a[1]+'</strong></article>').join("");
 node.querySelector("#fq-slots").innerHTML=info.slots.map(s=>{
  const lines=[["Asignados",s.assigned,"Participantes ubicados en esta sesión."],["Confirmados",s.confirmed,"Asignados que confirmaron."],["Contactados a confirmar",s.contacted,"Asignados pendientes de confirmación."],["Preinscritos asignados",s.pending,"Asignados todavía sin gestionar."],["No asistirán",s.notAttending,"Asignados que no asistirán."]];
  return '<article class="fq-slot '+level(s.available)+'"><div class="fq-slot-heading"><span class="fq-calendar-icon">'+CALENDAR_ICON+'</span><strong class="fq-slot-title">'+E(label(s.id).replace(" · "," - "))+'</strong>'+hint("Disponibles: personas que eligieron este horario. Pueden aparecer en otros. No cierra automáticamente.")+'</div><div class="big">'+s.available+' <small style="font-size:16px">/ 12</small></div><div class="bar"><i style="width:'+Math.min(100,s.available/12*100)+'%"></i></div>'+
  lines.map((a,i)=>'<div class="fq-metric fq-metric-'+i+'"><span>'+E(a[0])+' '+hint(a[2])+'</span><b>'+a[1]+'</b></div>').join("")+
  '<button class="fq-btn" data-view="'+E(s.id)+'">Ver inscriptos</button> '+(info.canEdit?'<button class="fq-btn" data-toggle="'+E(s.id)+'" data-open="'+s.open+'">'+(s.open?"Cerrar":"Reabrir")+'</button>':'')+'<div class="fq-muted">'+(s.open?"Abierto":"Cerrado manualmente")+'</div></article>';
 }).join("");
 const affected=(info.rows||[]).filter(r=>Array.isArray(r.availability)&&r.availability.includes(OLD_SLOT));
 const banner=node.querySelector("#fq-legacy-banner");
 banner.hidden=!affected.length;
 if(affected.length)banner.textContent=affected.length+" inscripto(s) habían elegido el sábado 28 a las 2:00 p. m. Se conservaron sus respuestas originales y no fueron trasladados automáticamente. Para ubicarlos: filtra sábado y 2:00 p. m.; confirma la nueva disponibilidad antes de asignarlos.";
 renderTable();
}
function displayColumns(){
 const columns=COLUMNS.filter(c=>(FIXED_COLUMNS.has(c[0])||selectedColumns.has(c[0]))&&(!RESTRICTED.has(c[0])||info?.canEdit));
 // Keep Coordinates and Motivo no elegible at the far right, even if extra columns are selected.
 const trailing=["coordinates","eligibilityReason"];
 return columns.filter(c=>!trailing.includes(c[0])).concat(trailing.map(key=>columns.find(c=>c[0]===key)).filter(Boolean));
}
function renderColumnPicker(){
 const panel=node.querySelector("#fq-columns-panel");if(!panel)return;
 const options=COLUMNS.filter(c=>!FIXED_COLUMNS.has(c[0])&&(!RESTRICTED.has(c[0])||info?.canEdit));
 panel.innerHTML='<strong>Selecciona las columnas</strong><div class="fq-column-list">'+options.map(c=>'<label><input type="checkbox" value="'+E(c[0])+'" '+(selectedColumns.has(c[0])?'checked':'')+'> '+E(c[1])+'</label>').join("")+'</div><div class="fq-column-actions"><button class="fq-btn" type="button" id="fq-cols-reset">Restablecer</button></div>';
 panel.querySelector(".fq-column-list").onchange=e=>{
  const input=e.target;
  if(!input.matches('input[type="checkbox"]'))return;
  if(FIXED_COLUMNS.has(input.value))return;
  if(input.checked)selectedColumns.add(input.value);
  else{selectedColumns.delete(input.value);if(tableSort.key===input.value)tableSort={key:"",direction:"asc"};}
  renderTable();
 };
 panel.querySelector("#fq-cols-reset").onclick=()=>{
  selectedColumns=new Set(DEFAULT_COLUMNS);
  if(tableSort.key&&!DEFAULT_COLUMNS.includes(tableSort.key))tableSort={key:"",direction:"asc"};
  panel.querySelectorAll('.fq-column-list input[type="checkbox"]').forEach(input=>{input.checked=selectedColumns.has(input.value);});
  renderTable();
 };
}
function coordinates(r){
 if(!info?.canEdit)return "Restringido";
 const a=Number(r.geoLat),b=Number(r.geoLng);
 if(r.geoStatus!=="Autorizado"||!String(r.geoLat||"").trim()||!String(r.geoLng||"").trim()||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)return "Sin coordenadas";
 const accuracy=Number(r.geoAccuracy),hasAccuracy=String(r.geoAccuracy??"").trim()!==""&&Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=100000;
 const label=a.toFixed(6)+", "+b.toFixed(6)+(hasAccuracy?" (± "+Math.round(accuracy)+" m)":"");
 return '<a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(a+","+b)+'" target="_blank" rel="noopener noreferrer" aria-label="Ver coordenadas en Google Maps">'+E(label)+' ↗</a>';
}
function availabilityCell(availability){
 const ids=Array.isArray(availability)?[...new Set(availability.map(String))]:[];
 if(!ids.length)return "Sin disponibilidad";
 const days=[["2026-11-28","Sáb 28"],["2026-11-29","Dom 29"]];
 const lines=days.map(([day,title])=>{
  const hours=OPTIONS.filter(([id])=>id.startsWith(day+"@")&&ids.includes(id)).map(([id])=>id.endsWith("@09:00")?"9:00":id.endsWith("@11:00")?"11:00":"14:00");
  return hours.length?'<div class="fq-availability-line"><strong>'+E(title)+':</strong> '+E(hours.join(" · "))+'</div>':"";
 }).filter(Boolean);
 // Existing or historical identifiers that do not belong to the four configured
 // sessions are preserved in the display rather than discarded silently.
 if(ids.includes(OLD_SLOT))lines.unshift('<div class="fq-availability-line" title="Horario anterior: sábado 28, 2:00 p. m."><strong>Horario por reubicar</strong></div>');
 const other=ids.filter(id=>id!==OLD_SLOT&&!OPTIONS.some(([known])=>known===id));
 if(other.length)lines.push('<div class="fq-availability-line">'+E(other.join(" · "))+'</div>');
 return '<div class="fq-availability">'+lines.join("")+'</div>';
}
function displayPhone(value){
 const original=String(value??"").trim();
 const digits=original.replace(/\D/g,"");
 // Show only Colombian mobile local digits; keep unexpected international numbers unchanged.
 return digits.length===12&&/^573\d{9}$/.test(digits)?digits.slice(2):original;
}
function dataCell(r,key){
 switch(key){
 case "participant":return '<b>'+E((r.first+" "+r.last).trim())+'</b>';
 case "cedula":return E(r.cedula||"—");
 case "phone":return E(displayPhone(r.phone)||"—");
 case "barrio":return E(r.barrio);
 case "stratum":return E(r.stratum||"—");
 case "operator":return E((r.operator||"—")+(r.otherOperator?" · "+r.otherOperator:""));
 case "availability":return availabilityCell(r.availability);
 case "assigned":{
  const movedFromOld=r.availability.includes(OLD_SLOT)&&!r.availability.includes(REPLACEMENT_SLOT);
   const options='<option value="">Sin asignar</option>'+
    (r.assigned===OLD_SLOT?'<option value="'+OLD_SLOT+'" selected>Sáb 28 · 14:00 (anterior)</option>':'')+
    OPTIONS.filter(x=>r.availability.includes(x[0])||(info?.canEdit&&movedFromOld&&x[0]===REPLACEMENT_SLOT))
     .map(x=>'<option value="'+E(x[0])+'" '+(r.assigned===x[0]?"selected":"")+'>'+E(x[1]+(movedFromOld&&x[0]===REPLACEMENT_SLOT?" (confirmar)":""))+'</option>').join("");
  return '<select class="fq-assign" '+(info.canEdit?"":"disabled")+'>'+options+'</select>';
 }
 case "status":{
  return '<select class="fq-status" data-current-status="'+E(r.status)+'" '+(info.canEdit?"":"disabled")+'>'+STATUSES.map(x=>'<option '+(r.status===x?"selected":"")+'>'+E(x)+'</option>').join("")+'</select>';
 }
 case "coordinates":return coordinates(r);
 case "observations":{
  if(!info?.canEdit)return "Restringido";
  const count=Array.isArray(r.notes)?r.notes.length:0;
  return '<button type="button" class="fq-btn fq-note-trigger" data-note="'+E(r.id)+'">'+(count?"Ver notas ("+count+")":"Agregar nota")+'</button>';
 }
 case "actions":return info.canEdit?'<button class="fq-btn" data-save="'+E(r.id)+'">Guardar</button>':'Solo lectura';
 case "email":return E(r.email||"—");
 case "address":return E(r.address||"—");
 case "age":return E(r.age||"—");
 case "decision":return E(r.decision==="No"?"No, otra persona decide":r.decision==="Decido"?"Decide":r.decision==="Compartimos"?"Comparte decisión":r.decision||"—");
 case "telecomFamily":return E(r.telecomFamily||"Sin respuesta");
 case "eligibilityReason":return E(r.eligible?"—":r.eligibilityReason||"No elegible");
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

function tableSortValue(r,key){
 switch(key){
 case "participant":return (String(r.first||"")+" "+String(r.last||"")).trim();
 case "phone":return displayPhone(r.phone);
 case "operator":return (r.operator||"")+(r.otherOperator?" · "+r.otherOperator:"");
 case "availability":return Array.isArray(r.availability)?[...r.availability].sort()[0]||"":"";
 case "assigned":return r.assigned||"";
 case "status":return r.status;
 case "actions":return "Guardar";
 case "observations":return Array.isArray(r.notes)?r.notes.length:0;
 case "coordinates":return r.geoStatus==="Autorizado"&&String(r.geoLat||"").trim()?String(r.geoLat)+","+String(r.geoLng||""):"";
 case "decision":return r.decision==="Decido"?"Decide":r.decision==="Compartimos"?"Comparte decisión":r.decision==="No"?"No, otra persona decide":r.decision;
 case "eligibilityReason":return eligible(r)?"":r.eligibilityReason||"No elegible";
 case "campaign":return "Estratos 2 y 3+";
 default:return r[key];
 }
}
function sortedTableRows(rows){
 if(!tableSort.key)return rows;
 const key=tableSort.key,reverse=tableSort.direction==="desc"?-1:1,asNumber=SORT_NUMERIC.has(key);
 const missing=value=>value==null||String(value).trim()===""||String(value)==="—";
 return rows.map((row,index)=>({row,index,value:tableSortValue(row,key)})).sort((a,b)=>{
  const am=missing(a.value),bm=missing(b.value);
  if(am!==bm)return am?1:-1; // Missing values always at the end.
  if(am)return a.index-b.index;
  const an=Number(a.value),bn=Number(b.value);
  const comparison=asNumber&&Number.isFinite(an)&&Number.isFinite(bn)?an-bn:SORT_COLLATOR.compare(String(a.value),String(b.value));
  return comparison?comparison*reverse:a.index-b.index; // Stable order for ties.
 }).map(item=>item.row);
}
function renderTable(){
 if(!node||!info)return;
 const cols=displayColumns(),all=visible().filter(r=>!availabilityFilter||(Array.isArray(r.availability)&&r.availability.includes(availabilityFilter))),q=tableQuery.trim();
 const filtered=q?all.filter(r=>([r.first,r.last,r.phone,r.barrio,r.stratum,r.operator,r.cedula,r.email,r.address,r.decision,r.geoLat,r.geoLng,r.status,r.source,r.telecomFamily,r.eligibilityReason,...(Array.isArray(r.notes)?r.notes.map(n=>n.text):[])].join(" ").toLocaleLowerCase("es").includes(q))):all;
 const rows=sortedTableRows(filtered);
 node.querySelector("#fq-count").textContent="Inscriptos ("+rows.length+")";
 const availabilityOptions='<option value="">Todas las disponibilidades</option>'+OPTIONS.map(([id,desc])=>{
  const slot=(info.slots||[]).find(s=>s.id===id);
  return '<option value="'+E(id)+'" '+(availabilityFilter===id?"selected":"")+'>'+E(desc+(slot&&!slot.open?" · Cerrado":""))+'</option>';
 }).join("")+'<option value="'+OLD_SLOT+'" '+(availabilityFilter===OLD_SLOT?"selected":"")+'>Sáb 28 · 14:00 (horario anterior)</option>';
 node.querySelector("#fq-table-head").innerHTML='<tr>'+cols.map(c=>{
  const active=tableSort.key===c[0],direction=active?tableSort.direction:"";
  const next=active&&direction==="asc"?"descendentemente":"ascendentemente";
  const filter=c[0]==="availability"?'<select id="fq-avail-filter" aria-label="Filtrar inscriptos por disponibilidad de sesión" title="Incluye quienes indicaron este horario y también otros" style="display:block;width:100%;margin-top:6px;padding:5px 6px;background:#101016;color:#fff;border:1px solid #61596d;border-radius:6px;font-size:11px">'+availabilityOptions+'</select>':"";
  return '<th scope="col" class="fq-col-'+E(c[0])+'" aria-sort="'+(active?(direction==="asc"?"ascending":"descending"):"none")+'"><button type="button" class="fq-sort-btn" data-fq-sort="'+E(c[0])+'" aria-label="'+E("Ordenar "+c[1]+" "+next)+'" title="'+E("Ordenar "+c[1]+" "+next)+'"><span>'+E(c[1])+'</span><span class="fq-sort-icon" aria-hidden="true">'+(active?(direction==="asc"?"▲":"▼"):"↕")+'</span></button>'+filter+'</th>';
 }).join("")+'</tr>';
 const slice=rows.slice(0,rowLimit);
 node.querySelector("#fq-rows").innerHTML=slice.length?slice.map(r=>'<tr data-id="'+E(r.id)+'">'+cols.map(c=>'<td class="fq-col-'+E(c[0])+'">'+dataCell(r,c[0])+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+cols.length+'" style="padding:24px">No hay inscriptos que coincidan con los filtros.</td></tr>';
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
 const rows=visible().filter(r=>!availabilityFilter||r.availability.includes(availabilityFilter)),arr=[["ID","Nombre","Apellido","Celular","Barrio","Disponibilidad","Sesión asignada","Estado"],...rows.map(r=>[r.id,r.first,r.last,r.phone,r.barrio,r.availability.map(label).join("; "),label(r.assigned),r.status])];
 const csv="\ufeff"+arr.map(a=>a.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const link=document.createElement("a"),file=globalThis.URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.href=file;link.download="focus-group-estratos-2-y-3.csv";link.click();setTimeout(()=>globalThis.URL.revokeObjectURL(file),800);
}
window.FIBRAZO_OPEN_OPINION_SUMMARY=open;
window.addEventListener("fibrazo:access-ready",()=>{if(new URLSearchParams(location.search).get("resumen")==="focus-group")open();});
})();