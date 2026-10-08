(() => {
  const forms=window.FIBRAZO_FORMS||{};
  const $=id=>document.getElementById(id);
  const publicMode=document.body.classList.contains("public-mode");
  const state={form:null,policy:null,sectionIndex:0,gps:null,photos:[],startedAt:0,detectedCity:"",citySource:"",ispOptions:[],geoController:null,geoLookupId:0,geoLookupCancelled:false,locationBusy:false,maxSectionReached:0,locationValidated:false,geoPromise:null,editId:"",existingPhotoFields:{},serverHistory:[]};
  const pending=window.FIBRAZO_PENDING||[];

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function css(v){return window.CSS&&CSS.escape?CSS.escape(v):String(v).replace(/["\\]/g,"\\$&");}
  function currentUser(){return window.FIBRAZO_PUBLIC_USER||window.firebase?.auth?.().currentUser||null;}

  function renderPending(){
    const count=$("pendingCount"),list=$("pendingList"),hub=document.querySelector(".pending-hub"); if(!count||!list)return;
    count.textContent=String(pending.length);
    if(hub)hub.hidden=pending.length===0;
    list.innerHTML=pending.length?pending.map(x=>'<article class="pending-item"><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.description||"")+'</p></div><span>'+esc(x.status||"Pendiente")+'</span></article>').join(""):'<div class="pending-empty">No hay pendientes registrados.</div>';
  }
  function togglePending(force){
    const pop=$("pendingPopover"),btn=$("pendingToggle");if(!pop||!btn)return;
    const show=typeof force==="boolean"?force:pop.hidden;
    pop.hidden=!show;btn.setAttribute("aria-expanded",String(show));
  }
  $("pendingToggle")?.addEventListener("click",e=>{e.stopPropagation();togglePending();});
  $("pendingClose")?.addEventListener("click",()=>togglePending(false));
  document.addEventListener("click",e=>{if(!e.target.closest(".pending-hub"))togglePending(false);});
  renderPending();

  document.addEventListener("click",e=>{
    const btn=e.target.closest(".form-card .form-open-button");if(!btn)return;
    const title=btn.closest(".form-card")?.querySelector("h3")?.textContent?.trim();
    const form=Object.values(forms).find(x=>x.name===title);if(!form)return;
    e.preventDefault();e.stopImmediatePropagation();openForm(form.id);
  },true);

  $("dynamicForm")?.addEventListener("submit",e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  $("closeForm")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();exitForm();},true);
  $("backToForms")?.addEventListener("click",exitForm);
  $("prevSection")?.addEventListener("click",prev);
  $("nextSection")?.addEventListener("click",next);
  $("reviewForm")?.addEventListener("click",review);
  $("editForm")?.addEventListener("click",edit);
  $("editFormBottom")?.addEventListener("click",edit);
  $("confirmSubmit")?.addEventListener("click",submit);
  $("newResponse")?.addEventListener("click",()=>{if(state.form)openForm(state.form.id);});

  function policyFor(id){
    return publicMode?(window.FIBRAZO_PUBLIC_POLICY||{}):(window.FIBRAZO_FORM_POLICIES?.[id]||{});
  }
  function shuffledFields(form,enabled){
    if(!enabled)return [...form.fields];
    const out=[];
    for(const section of (form.sections||[])){
      const fields=form.fields.filter(f=>f.section===section.id);
      const byParent=new Map();
      fields.filter(f=>f.showWhen).forEach(f=>{
        const key=f.showWhen.field;if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(f);
      });
      const roots=fields.filter(f=>!f.showWhen);
      const groups=roots.map(root=>{
        const group=[root],seen=new Set([root.key]);
        const addChildren=key=>{
          for(const child of (byParent.get(key)||[])){
            if(seen.has(child.key))continue;seen.add(child.key);group.push(child);addChildren(child.key);
          }
        };
        addChildren(root.key);return group;
      });
      for(let i=groups.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[groups[i],groups[j]]=[groups[j],groups[i]];}
      groups.flat().forEach(f=>out.push(f));
      fields.filter(f=>!out.includes(f)).forEach(f=>out.push(f));
    }
    return out;
  }
  function openForm(id){
    const form=forms[id];if(!form)return;
    if(!publicMode&&window.FIBRAZO_ACCESS&&window.FIBRAZO_ACCESS[id]===false)return;
    const policy=policyFor(id);
    state.form=form;window.FIBRAZO_ACTIVE_FORM_ID=form.id;state.policy=policy;state.sectionIndex=0;state.gps=null;state.photos=[];state.editId="";state.existingPhotoFields={};state.startedAt=Date.now();state.detectedCity="";state.citySource="";state.ispOptions=[];state.geoController?.abort();state.geoController=null;state.geoLookupId=0;state.geoLookupCancelled=false;state.locationBusy=false;state.maxSectionReached=0;state.locationValidated=false;state.geoPromise=null;
    document.body.classList.add("form-mode");
    $("formTitle").textContent=form.name;
    $("formDescription").textContent=form.description||"";
    $("formEyebrow").textContent=form.eyebrow||"FORMULARIO";

    const collect=policy.collectEmail!==false;
    const email=String(currentUser()?.email||"").trim();
    const who=collect?(email||"Correo pendiente"):"Respuesta anónima";
    if($("formUserEmail"))$("formUserEmail").textContent=who;
    if($("reviewUserEmail"))$("reviewUserEmail").textContent=who;
    if($("formIdentityBadge"))$("formIdentityBadge").textContent=collect?(email?"✉ "+email:"✉ Correo pendiente"):"◌ Respuesta anónima";
    if($("successEmail"))$("successEmail").textContent=who;

    const intro=$("formIntroMessage");
    if(intro){intro.textContent=policy.introMessage||"";intro.hidden=!policy.introMessage;}
    const databaseLink=$("formDatabaseLink");
    if(databaseLink){
      const showDatabase=!publicMode&&!!policy.canViewDatabase&&!!policy.databaseUrl;
      databaseLink.hidden=!showDatabase;
      databaseLink.href=showDatabase?policy.databaseUrl:"#";
    }

    $("dynamicFields").innerHTML="";
    shuffledFields(form,!!policy.shuffleQuestions).forEach(field=>$("dynamicFields").appendChild(renderField(field)));
    if(form.id==="INTELIGENCIA_OPERADOR"){
      const pairs=[["modelo_caja","foto_modelo_caja"],["nomenclatura_caja","foto_nomenclatura_caja"],["marquilla","foto_marquilla"],["marquilla_drop","foto_marquilla_drop"],["tipo_tensor","foto_tipo_tensor"],["tensor_acometida","foto_tensor_acometida"]];
      for(const [key,photo] of pairs){
        const main=$("dynamicFields").querySelector('[data-key="'+key+'"]');
        const companion=$("dynamicFields").querySelector('[data-key="'+photo+'"]');
        if(!main||!companion)continue;
        const group=document.createElement("div");group.className="operator-element-group";group.dataset.section="elementos";
        main.before(group);group.append(main,companion);companion.dataset.photoCompanion="1";
      }
    }
    $("formWorkspace").hidden=false;$("reviewWorkspace").hidden=true;$("successWorkspace").hidden=true;
    const stepper=$("sectionStepper"),counter=$("formStepCounter");
    if(stepper)stepper.hidden=policy.showProgress===false;
    if(counter)counter.hidden=policy.showProgress===false;
    clearValidation();loadLocalIsps();renderSection();if(form.id==="INTELIGENCIA_OPERADOR")loadIntelligenceHistory();
    if(form.id==="EXPLORACION_PRESENCIAL"){requestAnimationFrame(()=>{restoreLastInfrastructure();restoreLastOperators();});}
    if(form.id==="INTELIGENCIA_OPERADOR")requestAnimationFrame(restoreLastOperatorTendidoQuality);
    window.FIBRAZO_OFFLINE?.refreshUi?.();
    const mapPreset=window.FIBRAZO_MAP_COORDINATE_PRESET;
    if(mapPreset){
      window.FIBRAZO_MAP_COORDINATE_PRESET=null;
      setTimeout(()=>applyMapCoordinatePreset(mapPreset),120);
    }else if(form.id==="CHURN"){
      setTimeout(captureChurnGpsAutomatically,250);
    }else if(form.id==="EXPLORACION_PRESENCIAL"||form.id==="INTELIGENCIA_OPERADOR"){
      setTimeout(()=>{
        const field=document.querySelector('[data-key="coordenadas"]');
        const value=field?.querySelector(".gps-value");
        const button=field?.querySelector(".gps-box > button");
        if(form.id==="INTELIGENCIA_OPERADOR"){setTimeout(()=>showCoordinateModeChoice(value,button),40);}
        else if(value&&button&&!state.gps&&form.id!=="EXPLORACION_PRESENCIAL")captureGps(value,button,"coordenadas");
        if(form.id==="EXPLORACION_PRESENCIAL"){setTimeout(()=>showCoordinateModeChoice(value,button),40);}
      },250);
    }
    window.scrollTo({top:0,behavior:"smooth"});
  }
  window.FIBRAZO_UX_OPEN_FORM=openForm;

  async function loadIntelligenceHistory(){
    const host=$("formHistoryList");if(!host||state.form?.id!=="INTELIGENCIA_OPERADOR"||publicMode)return;
    host.innerHTML='<div class="pending-empty">Cargando historial…</div>';
    try{
      const token=await currentUser()?.getIdToken?.();
      const r=await fetch("/api/submissions?form=INTELIGENCIA_OPERADOR&limit=250",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const result=await r.json();if(!r.ok)throw new Error(result.error||"HISTORY_ERROR");
      state.serverHistory=result.rows||[];renderIntelligenceHistory();
    }catch(_){host.innerHTML='<div class="pending-empty">No se pudo cargar el historial del servidor.</div>';}
  }
  function renderIntelligenceHistory(){
    const host=$("formHistoryList");if(!host)return;
    const operators=[...new Set(state.serverHistory.map(r=>String(r.data?.operador||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    const selected=host.querySelector("[data-intel-operator-filter]")?.value||"all";
    const rows=state.serverHistory.filter(r=>selected==="all"||r.data?.operador===selected);
    const dateTime=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?String(value||""):d.toLocaleString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"numeric",minute:"2-digit"});};
    host.closest(".form-history")?.classList.remove("intelligence-detail-open");
    host.innerHTML='<div class="intelligence-history-tools"><select data-intel-operator-filter><option value="all">Todos los operadores</option>'+operators.map(x=>'<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x)+'</option>').join("")+'</select></div>'+
      '<div class="intelligence-history-scroll"><div class="intelligence-history-table"><div class="intelligence-history-head"><span>Fecha y hora</span><span>Operador</span><span>Municipio</span><span></span></div>'+
      (rows.length?rows.map(r=>'<button type="button" class="intelligence-history-row" data-history-id="'+esc(r.id)+'"><span>'+esc(dateTime(r.timestamp))+'</span><strong>'+esc(r.data?.operador||"Sin operador")+'</strong><span>'+esc(r.data?.municipio||"")+'</span><span>Ver →</span></button>').join(""):'<div class="pending-empty">No hay registros para este operador.</div>')+'</div></div>';
    host.querySelector("[data-intel-operator-filter]")?.addEventListener("change",renderIntelligenceHistory);
    host.querySelectorAll("[data-history-id]").forEach(b=>b.addEventListener("click",()=>showIntelligenceSummary(b.dataset.historyId)));
  }
  function showIntelligenceSummary(id){
    const r=state.serverHistory.find(x=>x.id===id);if(!r)return;
    const d=r.data||{},photos=r.photoFields||{};
    const labels={operador:"Operador",modelo_caja:"Modelo / tipo de caja",nomenclatura_caja:"Nomenclatura",marquilla:"Marquilla despliegue",marquilla_drop:"Marquilla drop",tipo_tensor:"Tensor de despliegue",tensor_acometida:"Tensor de acometida",calidad_tendido:"Calidad del tendido",calidad_servicio_percibida:"Calidad percibida",precio_solo_internet:"Precio solo Internet",precio_internet_tv:"Precio Internet + TV",incluye_tv:"Incluye TV",grilla_tv:"Grilla TV",observaciones:"Observaciones",municipio:"Municipio",sector_barrio:"Barrio",estrato:"Estrato"};
    const detail=Object.entries(labels).filter(([k])=>d[k]!==undefined&&d[k]!=="").map(([k,l])=>'<div><span>'+esc(l)+'</span><strong>'+esc(d[k])+'</strong></div>').join("");
    const photoLabels={foto_modelo_caja:"Modelo / caja",foto_nomenclatura_caja:"Nomenclatura",foto_marquilla:"Marquilla despliegue",foto_marquilla_drop:"Marquilla drop",foto_tipo_tensor:"Tensor de despliegue",foto_tensor_acometida:"Tensor de acometida"};
    const imgs=Object.entries(photos).filter(([,url])=>Boolean(url)).map(([key,url])=>'<a class="intelligence-photo-button" href="'+esc(url)+'" target="_blank" rel="noopener"><span>'+esc(photoLabels[key]||"Evidencia")+'</span><strong>📷 Ver foto ↗</strong></a>').join("");
    const host=$("formHistoryList");
    host.closest(".form-history")?.classList.add("intelligence-detail-open");
    host.innerHTML='<div class="intelligence-summary"><div class="intelligence-summary-top"><button type="button" class="secondary-button compact" data-history-back>← Historial</button><strong>'+esc(d.operador||"Operador")+'</strong></div><div class="intelligence-summary-grid">'+detail+'</div>'+(imgs?'<div class="intelligence-summary-evidence"><span>EVIDENCIA FOTOGRÁFICA</span><div class="intelligence-summary-photos">'+imgs+'</div></div>':'')+'<button type="button" class="primary-button" data-history-edit>Editar registro</button></div>';
    host.querySelector("[data-history-back]")?.addEventListener("click",renderIntelligenceHistory);
    host.querySelector("[data-history-edit]")?.addEventListener("click",()=>editIntelligenceRecord(r));
  }
  function editIntelligenceRecord(r){
    state.editId=r.id;state.existingPhotoFields={...(r.photoFields||{})};
    state.gps={lat:Number(r.location?.lat),lng:Number(r.location?.lng),accuracy:Number(r.location?.accuracy)||null,cityDetected:r.data?.municipio||"",citySource:"history"};
    for(const [key,value] of Object.entries(r.data||{}))setFieldValue(key,value);
    const gps=document.querySelector('[data-key="coordenadas"] .gps-value');if(gps&&Number.isFinite(state.gps.lat)&&Number.isFinite(state.gps.lng))gps.textContent=state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)+(state.gps.accuracy?" · ±"+Math.round(state.gps.accuracy)+" m":"");
    state.sectionIndex=0;state.maxSectionReached=(state.form.sections||[]).length-1;updateVisibility();renderSection();
    document.querySelector(".form-history")?.removeAttribute("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function setFieldValue(key,value){
    const node=document.querySelector('[name="'+css(key)+'"]');if(!node)return;
    if(node.type==="radio"){document.querySelectorAll('[name="'+css(key)+'"]').forEach(x=>x.checked=String(x.value)===String(value));return;}
    if(node.type==="checkbox"){const vals=Array.isArray(value)?value:String(value||"").split(",").map(x=>x.trim());document.querySelectorAll('[name="'+css(key)+'"]').forEach(x=>x.checked=vals.includes(x.value));return;}
    if(node.type==="hidden"){
      node.value=value||"";const holder=node.closest(".segmented-control,.binary-toggle");
      holder?.querySelectorAll(".segment-option").forEach(b=>{const on=normalizeCityName(b.textContent)===normalizeCityName(value);b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));});
      return;
    }
    node.value=value??"";node.dispatchEvent(new Event("change",{bubbles:true}));
  }

  async function applyMapCoordinatePreset(preset){
    if(!state.form)return;
    const lat=Number(preset?.lat),lng=Number(preset?.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)return;
    const text=lat.toFixed(6)+", "+lng.toFixed(6);
    const direct=document.querySelector('[name="coordenadas"]');
    if(direct){
      direct.value=text;
      direct.dispatchEvent(new Event("input",{bubbles:true}));
      direct.focus({preventScroll:true});
      return;
    }

    const field=document.querySelector('[data-key="coordenadas"]');
    const value=field?.querySelector(".gps-value");
    const manual=field?.querySelector(".gps-manual-editor input");
    state.gps={lat,lng,accuracy:null,cityDetected:"",citySource:"map-selection"};
    if(value)value.textContent=text+" · seleccionado en mapa";
    if(manual)manual.value=text;

    if(state.form?.id==="CHURN"){
      const fallback=detectConfiguredCityOffline(lat,lng);
      if(fallback)applyDetectedCity(fallback,"map-selection");
      const territorialSummary=document.querySelector('[data-territorial-summary="1"]');
      if(territorialSummary){
        const layerRow=(label,status,assigned,nearby,distance)=>{
          const exact=status==="DENTRO",outside=status==="FUERA";
          const value=exact?assigned:(outside?nearby:"");
          const meters=distanceNumber(distance);
          const detail=exact?"Dentro del polígono":outside?("Fuera del polígono"+(meters!==null?" · "+Math.round(meters)+" m":"")):(status==="SIN_CAPA_CANONICA"?"Sin capa canónica":"Sin capa disponible");
          const cls=exact?"inside":outside?"outside":"missing";
          return '<div class="territorial-summary-row '+cls+'"><b>'+esc(label)+'</b><span>'+esc(value||"No disponible")+'</span><small>'+esc(detail)+'</small></div>';
        };
        territorialSummary.innerHTML=
          '<span class="territorial-summary-title">LECTURA TERRITORIAL</span>'+
          layerRow("Municipio",data.cityStatus,data.city,data.cityNearby,data.cityDistanceM)+
          layerRow("Barrio",data.barrioStatus,data.barrio,data.barrioNearby,data.barrioDistanceM)+
          layerRow("Estrato",data.estratoStatus,data.estrato,data.estratoNearby,data.estratoDistanceM)+
          layerRow("Troncal",data.troncalStatus,data.troncal,data.troncalNearby,data.troncalDistanceM);
        territorialSummary.hidden=false;
      }
      const cityStatus=document.querySelector('[data-gps-city-for="coordenadas"]');
      if(cityStatus&&!fallback)cityStatus.textContent=navigator.onLine?"Ciudad GPS: identificando…":"Ciudad GPS: sin conexión · selección manual disponible";
      if(navigator.onLine){
        try{
          const resolved=await reverseGeocodeCity(lat,lng);
          if(resolved)applyDetectedCity(resolved,"map-selection");
        }catch(_){}
      }
    }else if(isExplorationForm()){
      await resolveExplorationMunicipality(lat,lng,"coordenadas");
    }
    clearError("coordenadas");
  }

  function exitForm(){
    if(publicMode){location.reload();return;}
    if(/^\/form\//i.test(location.pathname))history.replaceState({},"","/");
    document.body.classList.remove("form-mode");
    $("formWorkspace").hidden=true;$("reviewWorkspace").hidden=true;$("successWorkspace").hidden=true;
    state.geoController?.abort();state.geoController=null;state.form=null;window.FIBRAZO_ACTIVE_FORM_ID="";state.policy=null;state.gps=null;state.photos=[];state.detectedCity="";state.citySource="";state.ispOptions=[];window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderField(field){
    const wrap=document.createElement("div");wrap.className="field"+(field.full?" full":"");wrap.dataset.key=field.key;wrap.dataset.section=field.section||"default";
    const label=document.createElement("label");label.className="field-label";label.innerHTML=esc(field.label)+(field.required?'<span class="required">*</span>':"");wrap.appendChild(label);
    if(["municipio","sector_barrio","estrato"].includes(field.key)){
      const tools=document.createElement("div");tools.className="field-quick-tools";
      const copy=document.createElement("button");copy.type="button";copy.textContent="⧉ Copiar";copy.addEventListener("click",async()=>{const v=fieldValue(field.key);if(v){try{await navigator.clipboard.writeText(String(v));copy.textContent="✓ Copiado";setTimeout(()=>copy.textContent="⧉ Copiar",1000);}catch(_){}}});
      tools.appendChild(copy);wrap.appendChild(tools);
    }
    if(field.help){const h=document.createElement("span");h.className="field-help field-help-top";h.textContent=field.help;wrap.appendChild(h);}

    if(field.type==="text"){wrap.appendChild(textInput(field));}
    else if(field.type==="editable-options"){wrap.appendChild(editableOptionsInput(field));}
    else if(field.type==="numeric"||field.type==="currency"){wrap.appendChild(numericInput(field));}
    else if(field.type==="date-flex"){wrap.appendChild(dateInput(field));}
    else if(field.type==="select"){wrap.appendChild(selectInput(field));}
    else if(field.type==="segmented"){wrap.appendChild(segmentedInput(field));}
    else if(field.type==="toggle"){wrap.appendChild(toggleInput(field));}
    else if(field.type==="textarea"){const t=document.createElement("textarea");t.name=field.key;t.addEventListener("input",()=>clearError(field.key));wrap.appendChild(t);}
    else if(field.type==="radio"||field.type==="checkbox"){wrap.appendChild(choiceInput(field));}
    else if(field.type==="gps"){wrap.appendChild(gpsInput(field));}
    else if(field.type==="coordinates"){wrap.appendChild(coordinatesInput(field));}
    else if(field.type==="isp-autocomplete"){wrap.appendChild(ispAutocompleteInput(field));}
    else if(field.type==="photos"){wrap.appendChild(photoInput(field));}
    else if(field.type==="photo-single"){wrap.appendChild(singlePhotoInput(field));}

    if(field.key==="sector_barrio"||field.key==="estrato"){
      const info=document.createElement("div");info.className="field-geo-info";info.dataset.geoInfoFor=field.key;info.hidden=true;wrap.appendChild(info);
      if(field.key==="estrato"){
        const summary=document.createElement("div");summary.className="territorial-layer-summary";summary.dataset.territorialSummary="1";summary.hidden=true;wrap.appendChild(summary);
      }
    }
    const err=document.createElement("div");err.className="field-error";err.dataset.errorFor=field.key;err.hidden=true;wrap.appendChild(err);
    if(field.default!==undefined)queueMicrotask(()=>{const n=document.querySelector('[name="'+css(field.key)+'"]');if(n&&!n.value)n.value=String(field.default);});
    return wrap;
  }

  function editableOptionsInput(field){
    const holder=document.createElement("div");holder.className="editable-options";
    const input=document.createElement("input");input.type="text";input.name=field.key;input.autocomplete="off";input.placeholder="Selecciona o escribe una opción";input.setAttribute("aria-haspopup","listbox");input.setAttribute("aria-expanded","false");
    const menu=document.createElement("div");menu.className="editable-options-menu";menu.setAttribute("role","listbox");menu.hidden=true;
    const storageKey="fibrazo:field-options:"+field.key;
    let custom=[];try{custom=JSON.parse(localStorage.getItem(storageKey)||"[]");if(!Array.isArray(custom))custom=[];}catch(_){}
    const options=[...new Set([...(field.options||[]),...custom])];
    const hide=()=>{menu.hidden=true;input.setAttribute("aria-expanded","false");holder.querySelector(".editable-options-arrow")?.setAttribute("aria-expanded","false");};
    const save=()=>{const value=input.value.trim();if(!value)return;clearError(field.key);if(!options.some(x=>x.toLowerCase()===value.toLowerCase())){options.push(value);custom.push(value);try{localStorage.setItem(storageKey,JSON.stringify([...new Set(custom)]));}catch(_){}}};
    const paint=()=>{
      menu.innerHTML="";
      const q=input.value.trim().toLocaleLowerCase("es");
      const matching=options.filter(x=>!q||x.toLocaleLowerCase("es").includes(q));
      for(const name of matching){
        const option=document.createElement("button");option.type="button";option.className="editable-options-choice";option.setAttribute("role","option");option.textContent=name;
        option.addEventListener("pointerdown",e=>e.preventDefault());
        option.addEventListener("click",()=>{input.value=name;save();hide();clearError(field.key);input.dispatchEvent(new Event("change",{bubbles:true}));});
        menu.appendChild(option);
      }
      if(!matching.length){const hint=document.createElement("div");hint.className="editable-options-hint";hint.textContent="Escribe tu opción nueva y continúa";menu.appendChild(hint);}
      menu.hidden=false;input.setAttribute("aria-expanded","true");holder.querySelector(".editable-options-arrow")?.setAttribute("aria-expanded","true");
    };
    input.addEventListener("focus",paint);
    input.addEventListener("input",()=>{paint();clearError(field.key);});
    input.addEventListener("change",save);
    input.addEventListener("keydown",e=>{if(e.key==="Escape")hide();if(e.key==="Enter"&&!menu.hidden){e.preventDefault();save();hide();input.blur();}});
    input.addEventListener("blur",()=>{save();setTimeout(hide,150);});
    const arrow=document.createElement("button");arrow.type="button";arrow.className="editable-options-arrow";arrow.textContent="▴";arrow.setAttribute("aria-label","Mostrar opciones de "+field.label);arrow.setAttribute("aria-expanded","false");
    arrow.addEventListener("pointerdown",e=>e.preventDefault());
    arrow.addEventListener("click",()=>{if(menu.hidden){paint();input.focus();}else hide();});
    holder.append(input,arrow,menu);return holder;
  }
  function textInput(field){
    const i=document.createElement("input");i.type="text";i.name=field.key;
    i.addEventListener("input",()=>{
      if(field.autoGeo&&i.dataset.geoWriting!=="1")i.dataset.geoManual="1";
      if((state.form?.id==="EXPLORACION_PRESENCIAL"||state.form?.id==="INTELIGENCIA_OPERADOR")&&field.key==="municipio"){
        i.dataset.geoManual="1";
        const city=String(i.value||"").trim();
        state.detectedCity=city;state.citySource="manual";
        if(state.gps){state.gps.cityDetected=city;state.gps.citySource="manual";}
        const status=document.querySelector('[data-gps-city-for="coordenadas"]');
        if(status)status.textContent=city?"Municipio: "+city+" · corregido manualmente":"Municipio: pendiente";
      }
      clearError(field.key);updateVisibility();
    });return i;
  }
  function rememberIspName(name){
    const v=String(name||"").trim();if(!v||v==="Sin ISP"||v==="Sin Identificar")return;
    if(!(state.ispOptions||[]).some(x=>normalizeCityName(x)===normalizeCityName(v)))state.ispOptions=[...(state.ispOptions||[]),v].sort((a,b)=>a.localeCompare(b,"es"));
    try{const saved=JSON.parse(localStorage.getItem("fibrazo:custom-isps")||"[]");const next=[...new Set([...saved,v])];localStorage.setItem("fibrazo:custom-isps",JSON.stringify(next));}catch(_){}
  }
  function loadLocalIsps(){
    try{const saved=JSON.parse(localStorage.getItem("fibrazo:custom-isps")||"[]");state.ispOptions=[...new Set([...(state.ispOptions||[]),...saved])].sort((a,b)=>a.localeCompare(b,"es"));}catch(_){}
  }
  function clearOperators(){
    ["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar"].forEach(key=>{const n=document.querySelector('[name="'+css(key)+'"]');if(n){n.value="No";n.closest(".binary-toggle,.segmented-control")?.querySelectorAll("button").forEach(b=>{const on=normalizeCityName(b.textContent)==="no";b.classList.toggle("selected",on);b.classList.toggle("is-yes",false);b.setAttribute("aria-pressed",String(on));});}});
    ["isp_1","isp_2","isp_3","isp_4"].forEach(key=>{const n=document.querySelector('[name="'+css(key)+'"]');if(n)n.value="Sin ISP";});
    for(let i=1;i<=4;i++)paintSegmentedValue("isp_"+i+"_calidad","");
    document.querySelectorAll(".isp-field-state").forEach(el=>{el.classList.add("isp-none");el.classList.remove("isp-known","isp-unknown");});
    updateVisibility();
  }
  const operatorTendidoQualityKey="fibrazo:last-operator-tendido-quality";
  function saveLastOperatorTendidoQuality(){
    if(state.form?.id!=="INTELIGENCIA_OPERADOR"||state.editId)return;
    const value=String(fieldValue("calidad_tendido")||"");
    if(!["1","2","3","4","5"].includes(value))return;
    try{localStorage.setItem(operatorTendidoQualityKey,value);}catch(_){}
  }
  function restoreLastOperatorTendidoQuality(){
    if(state.form?.id!=="INTELIGENCIA_OPERADOR"||state.editId)return;
    let value="";try{value=localStorage.getItem(operatorTendidoQualityKey)||"";}catch(_){}
    if(["1","2","3","4","5"].includes(value))paintSegmentedValue("calidad_tendido",value);
  }
  const infraMemoryKey="fibrazo:last-infrastructure";
  function paintSegmentedValue(key,value){
    const n=document.querySelector('[name="'+css(key)+'"]');if(!n)return;
    n.value=String(value||"");
    const holder=n.closest(".segmented-control");
    holder?.querySelectorAll(".segment-option").forEach(b=>{const on=String(b.textContent||"").trim()===String(value||"");b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));});
    clearError(key);updateVisibility();
  }
  function saveLastInfrastructure(){
    if(state.form?.id!=="EXPLORACION_PRESENCIAL")return;
    const data={tipo_despliegue:String(fieldValue("tipo_despliegue")||"Aéreo"),condicion_ocupacion_tendido:String(fieldValue("condicion_ocupacion_tendido")||""),condicion_fisica_posteria:String(fieldValue("condicion_fisica_posteria")||""),tipo_terreno:String(fieldValue("tipo_terreno")||""),nivel_seguridad:String(fieldValue("nivel_seguridad")||""),barrio_asentamiento_informal:String(fieldValue("barrio_asentamiento_informal")||"No")};
    try{localStorage.setItem(infraMemoryKey,JSON.stringify(data));}catch(_){}
  }
  function restoreLastInfrastructure(){
    if(state.form?.id!=="EXPLORACION_PRESENCIAL")return;
    let data=null;try{data=JSON.parse(localStorage.getItem(infraMemoryKey)||"null");}catch(_){}
    if(!data)return;
    const type=document.querySelector('[name="tipo_despliegue"]');if(type){type.value=data.tipo_despliegue||"Aéreo";type.dispatchEvent(new Event("change",{bubbles:true}));}
    paintSegmentedValue("condicion_ocupacion_tendido",data.condicion_ocupacion_tendido);
    paintSegmentedValue("condicion_fisica_posteria",data.condicion_fisica_posteria);
    paintSegmentedValue("tipo_terreno",data.tipo_terreno);
    paintSegmentedValue("nivel_seguridad",data.nivel_seguridad);
    setFieldValue("barrio_asentamiento_informal",data.barrio_asentamiento_informal||"No");
  }
  function clearInfrastructure(){
    const type=document.querySelector('[name="tipo_despliegue"]');if(type){type.value="Aéreo";type.dispatchEvent(new Event("change",{bubbles:true}));}
    paintSegmentedValue("condicion_ocupacion_tendido","");
    paintSegmentedValue("condicion_fisica_posteria","");
    paintSegmentedValue("tipo_terreno","");
    paintSegmentedValue("nivel_seguridad","");
    setFieldValue("barrio_asentamiento_informal","No");
  }
  function operatorSectionTools(){
    if(state.form?.id!=="EXPLORACION_PRESENCIAL")return;
    const section=document.querySelector('[data-section-id="operadores"],.form-section[data-section="operadores"]')||document.querySelector('[data-key="tigo_hfc"]')?.parentElement;
    if(!section||section.querySelector(".operator-memory-tools"))return;
    const bar=document.createElement("div");bar.className="operator-memory-tools";
    const reuse=document.createElement("button");reuse.type="button";reuse.textContent="↻ Usar última selección";reuse.addEventListener("click",restoreLastOperators);
    const clear=document.createElement("button");clear.type="button";clear.textContent="✕ Limpiar operadores";clear.addEventListener("click",clearOperators);
    bar.append(reuse,clear);section.prepend(bar);
  }
  function ispAutocompleteInput(field){
    const shell=document.createElement("div");shell.className="isp-autocomplete isp-field-state";
    const updateIspState=()=>{const v=String(input?.value||"").trim();shell.classList.toggle("isp-none",!v||v==="Sin ISP");shell.classList.toggle("isp-unknown",v==="Sin Identificar");shell.classList.toggle("isp-known",!!v&&v!=="Sin ISP"&&v!=="Sin Identificar");};
    const input=document.createElement("input");input.type="text";input.name=field.key;input.autocomplete="off";
    input.value=String(field.default??"Sin ISP");input.placeholder="Sin ISP";queueMicrotask(updateIspState);
    const list=document.createElement("div");list.className="isp-suggestion-list";list.hidden=true;
    const options=()=>{
      const query=normalizeCityName(input.value==="Sin ISP"?"":input.value);
      const all=["Sin ISP","Sin Identificar",...(state.ispOptions||[])];
      return [...new Set(all)].filter((name,index)=>index<2||!query||normalizeCityName(name).includes(query));
    };
    const qualityKey=/^isp_[1-4]$/.test(field.key)?field.key+"_calidad":null;
    let previousName=String(input.value||"").trim();
    const clearQualityIfChanged=()=>{const next=String(input.value||"").trim();if(qualityKey&&next!==previousName)paintSegmentedValue(qualityKey,"");previousName=next;};
    const choose=name=>{
      input.value=name;clearQualityIfChanged();
      rememberIspName(name);updateIspState();
      list.hidden=true;
      clearError(field.key);
      updateVisibility();
      input.dispatchEvent(new Event("change",{bubbles:true}));
    };
    const paint=()=>{
      list.innerHTML="";
      for(const name of options()){
        const b=document.createElement("button");b.type="button";b.className="isp-suggestion";
        b.textContent=name;
        b.addEventListener("click",e=>{e.preventDefault();choose(name);});
        list.appendChild(b);
      }
      const custom=String(input.value||"").trim();
      if(custom&&custom!=="Sin ISP"&&custom!=="Sin Identificar"&&!(state.ispOptions||[]).some(x=>normalizeCityName(x)===normalizeCityName(custom))){
        const note=document.createElement("div");note.className="isp-custom-note";note.textContent='Usar "'+custom+'" como operador nuevo';list.appendChild(note);
      }
      list.hidden=false;
    };
    input.addEventListener("focus",()=>{if(input.value==="Sin ISP")input.select();paint();});
    input.addEventListener("input",()=>{clearQualityIfChanged();paint();updateIspState();clearError(field.key);updateVisibility();});
    input.addEventListener("change",()=>{rememberIspName(input.value);refreshIspSuggestions();});
    input.addEventListener("blur",()=>setTimeout(()=>{rememberIspName(input.value);list.hidden=true;},220));
    const clear=document.createElement("button");clear.type="button";clear.className="isp-clear-button";clear.textContent="×";clear.title="Borrar selección";clear.setAttribute("aria-label","Borrar selección de ISP");
    clear.addEventListener("pointerdown",e=>e.preventDefault());
    clear.addEventListener("click",e=>{e.preventDefault();const position=Number(field.key.match(/^isp_([1-4])$/)?.[1]);if(position&&isExplorationForm()){removeExplorationIsp(position);list.hidden=true;return;}input.value="";clearQualityIfChanged();updateIspState();input.focus();paint();clearError(field.key);updateVisibility();});
    shell.append(input,clear,list);return shell;
  }

  function removeExplorationIsp(position){
    const entries=[];
    for(let i=1;i<=4;i++){
      const name=String(fieldValue("isp_"+i)||"").trim();
      if(i===position||!name||name==="Sin ISP")continue;
      entries.push({name,quality:String(fieldValue("isp_"+i+"_calidad")||"")});
    }
    for(let i=1;i<=4;i++){
      const item=entries[i-1];
      setFieldValue("isp_"+i,item?.name||"Sin ISP");
      paintSegmentedValue("isp_"+i+"_calidad",item?.quality||"");
    }
    updateVisibility();
  }
  function refreshIspSuggestions(){
    document.querySelectorAll(".isp-autocomplete input").forEach(input=>{
      if(input.value==="Sin ISP"||!String(input.value||"").trim())input.placeholder=(state.ispOptions||[]).length?"Busca o escribe un ISP":"Escribe un ISP";
    });
  }

  function numericInput(field){
    const shell=document.createElement("div");shell.className="input-affix";
    if(field.type==="currency"){const p=document.createElement("span");p.className="input-prefix";p.textContent="$";shell.appendChild(p);}
    const i=document.createElement("input");i.type="text";i.name=field.key;i.inputMode="numeric";i.autocomplete="off";if(field.maxLength)i.maxLength=field.maxLength;if(field.max!==undefined)i.dataset.max=String(field.max);
    i.addEventListener("input",()=>{i.value=i.value.replace(/\D/g,"");clearError(field.key);updateVisibility();});shell.appendChild(i);
    if(field.suffix){const s=document.createElement("span");s.className="input-suffix";s.textContent=field.suffix;shell.appendChild(s);}return shell;
  }
  function dateInput(field){
    const holder=document.createElement("div"),hidden=document.createElement("input");hidden.type="hidden";hidden.name=field.key;
    const shell=document.createElement("div");shell.className="date-flex";
    const a=document.createElement("div");a.className="date-option";const al=document.createElement("small");al.textContent="Calendario";const picker=document.createElement("input");picker.type="date";
    const b=document.createElement("div");b.className="date-option";const bl=document.createElement("small");bl.textContent="Escribir fecha";const manual=document.createElement("input");manual.type="text";manual.inputMode="numeric";manual.placeholder="DD/MM/AAAA";manual.maxLength=10;
    picker.addEventListener("change",()=>{hidden.value=picker.value;manual.value=picker.value?isoToDmy(picker.value):"";clearError(field.key);});
    manual.addEventListener("input",()=>{manual.value=maskDate(manual.value);const iso=dmyToIso(manual.value);hidden.value=iso||"";picker.value=iso||"";clearError(field.key);});
    a.append(al,picker);b.append(bl,manual);shell.append(a,b);holder.append(hidden,shell);return holder;
  }
  function selectInput(field){
    const s=document.createElement("select");s.name=field.key;const first=document.createElement("option");first.value="";first.textContent="Seleccionar…";s.appendChild(first);
    (field.options||[]).forEach(o=>{const x=document.createElement("option");x.value=o;x.textContent=o;s.appendChild(x);});
    s.addEventListener("change",()=>{
      if(field.autoGeo&&s.dataset.geoWriting!=="1")s.dataset.geoManual="1";
      const isManualCity=(state.form?.id==="CHURN"&&field.key==="ciudad")||((state.form?.id==="EXPLORACION_PRESENCIAL"||state.form?.id==="INTELIGENCIA_OPERADOR")&&field.key==="municipio");
      if(isManualCity&&s.dataset.autoGps!=="1"){
        const city=String(s.value||"").trim();
        state.detectedCity=city;state.citySource="manual";
        if(state.gps){state.gps.cityDetected=city;state.gps.citySource="manual";}
        const status=document.querySelector('[data-gps-city-for="coordenadas"]');
        if(status)status.textContent=city?"Municipio: "+city+" · corregido manualmente":"Municipio: pendiente";
      }
      clearError(field.key);updateVisibility();
    });return s;
  }
  function segmentedInput(field){
    const shell=document.createElement("div");shell.className="segmented-shell";
    const holder=document.createElement("div");holder.className="segmented-control";holder.setAttribute("role","radiogroup");
    const hidden=document.createElement("input");hidden.type="hidden";hidden.name=field.key;hidden.value="";
    const detail=document.createElement("div");detail.className="segment-detail";detail.hidden=true;
    (field.options||[]).forEach(o=>{
      const b=document.createElement("button");b.type="button";b.className="segment-option";b.textContent=o;b.setAttribute("aria-pressed","false");
      b.addEventListener("click",()=>{
        hidden.value=String(o);
        holder.querySelectorAll(".segment-option").forEach(x=>{const on=x===b;x.classList.toggle("selected",on);x.setAttribute("aria-pressed",String(on));});
        const text=field.details?.[String(o)]||"";
        detail.textContent=text?"Puntuación "+String(o)+"/5 · "+text:"";
        detail.hidden=!text;
        clearError(field.key);updateVisibility();
      });
      holder.appendChild(b);
    });
    holder.prepend(hidden);shell.append(holder,detail);return shell;
  }
  function toggleInput(field){
    const holder=document.createElement("div");holder.className="binary-toggle";
    const brand=field.key.startsWith("tigo_")?"brand-tigo":field.key.startsWith("claro_")?"brand-claro":field.key==="movistar"?"brand-movistar":"";
    if(brand){holder.classList.add(brand);queueMicrotask(()=>holder.closest(".field")?.classList.add(brand,"operator-brand-field"));}
    const hidden=document.createElement("input");hidden.type="hidden";hidden.name=field.key;hidden.value=String(field.default??"No");
    const b=document.createElement("button");b.type="button";b.className="binary-toggle-button";
    const paint=()=>{const yes=hidden.value==="Sí";b.classList.toggle("is-yes",yes);b.setAttribute("aria-pressed",String(yes));b.innerHTML='<span class="toggle-state">'+(yes?"Sí":"No")+'</span><span class="toggle-hint">Toca para cambiar</span>';};
    b.addEventListener("pointerup",e=>{e.preventDefault();e.stopPropagation();hidden.value=hidden.value==="Sí"?"No":"Sí";paint();clearError(field.key);updateVisibility();});
    paint();holder.append(hidden,b);return holder;
  }
  function choiceInput(field){
    const grid=document.createElement("div");grid.className="choice-grid";
    (field.options||[]).forEach(o=>{const l=document.createElement("label");l.className="choice";const i=document.createElement("input");i.type=field.type;i.name=field.key;i.value=o;i.addEventListener("change",()=>{clearError(field.key);updateVisibility();});l.append(i,document.createTextNode(o));grid.appendChild(l);});return grid;
  }
  function showCoordinateModeChoice(value,btn){
    const box=value?.closest(".gps-box");if(!box||box.querySelector(".coordinate-mode-choice"))return;
    const choice=document.createElement("div");choice.className="coordinate-mode-choice";
    choice.innerHTML='<b>¿Cómo quieres cargar la ubicación?</b><small>La búsqueda territorial continuará mientras completas el resto del formulario.</small>';
    const auto=document.createElement("button");auto.type="button";auto.textContent="📍 Automática por GPS";
    const manual=document.createElement("button");manual.type="button";manual.textContent="⌨ Manual";
    auto.addEventListener("click",()=>{choice.remove();captureGps(value,btn,"coordenadas");});
    manual.addEventListener("click",()=>{choice.remove();box.querySelector(".gps-manual-editor input")?.focus();});
    choice.append(auto,manual);box.prepend(choice);
  }
  function gpsInput(field){
    const box=document.createElement("div");box.className="gps-box";const value=document.createElement("div");value.className="gps-value";value.textContent="Ubicación pendiente";
    const btn=document.createElement("button");btn.type="button";btn.className="secondary-button";btn.textContent="Tomar coordenadas";btn.addEventListener("click",()=>captureGps(value,btn,field.key));
    box.append(value,btn);
    const quick=document.createElement("div");quick.className="gps-quick-tools";
    const copyGps=document.createElement("button");copyGps.type="button";copyGps.textContent="⧉ Copiar coordenada";copyGps.addEventListener("click",async()=>{if(!state.gps)return;const v=state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6);try{await navigator.clipboard.writeText(v);}catch(_){}});
    const mapsGps=document.createElement("button");mapsGps.type="button";mapsGps.textContent="↗ Google Maps";mapsGps.addEventListener("click",()=>{if(!state.gps)return;window.open("https://www.google.com/maps?q="+state.gps.lat+","+state.gps.lng,"_blank","noopener");});
    quick.append(copyGps,mapsGps);box.appendChild(quick);
    if(field.key==="coordenadas"&&state.form?.id==="EXPLORACION_PRESENCIAL"){
      const improve=document.createElement("button");improve.type="button";improve.className="secondary-button compact gps-improve-button";improve.textContent="◎ Mejorar precisión";
      improve.addEventListener("click",()=>captureGps(value,btn,field.key));
      box.appendChild(improve);
    }
    if(field.key==="coordenadas"&&(state.form?.id==="CHURN"||isExplorationForm())){
      const city=document.createElement("div");city.className="gps-city";city.dataset.gpsCityFor=field.key;
      city.textContent=state.form?.id==="CHURN"?"Ciudad GPS: pendiente":"Municipio: pendiente";
      box.appendChild(city);
    }
    if(field.manualEdit){
      const editor=document.createElement("div");editor.className="gps-manual-editor";
      const label=document.createElement("small");label.textContent="Corregir coordenadas manualmente";
      const row=document.createElement("div");row.className="gps-manual-row";
      const input=document.createElement("input");input.type="text";input.inputMode="decimal";input.placeholder="7.10485, -73.10280";
      const apply=document.createElement("button");apply.type="button";apply.className="secondary-button compact";apply.textContent="Aplicar";
      apply.addEventListener("click",async()=>{
        const parsed=parseCoordinateText(input.value);
        if(!parsed){input.setCustomValidity("Coordenada inválida");input.reportValidity();return;}
        input.setCustomValidity("");
        state.gps={lat:parsed.lat,lng:parsed.lng,accuracy:null,cityDetected:"",citySource:"manual-coordinate"};
        value.textContent=parsed.lat.toFixed(6)+", "+parsed.lng.toFixed(6)+" · corrección manual";
        state.locationBusy=true;state.locationValidated=false;state.geoPromise=resolveExplorationMunicipality(parsed.lat,parsed.lng,field.key);state.geoPromise.finally(()=>{state.locationBusy=false;state.geoPromise=null;});
        clearError(field.key);
      });
      row.append(input,apply);editor.append(label,row);box.appendChild(editor);
    }
    if(isExplorationForm()&&field.key==="coordenadas"){
      const geo=document.createElement("div");geo.className="geo-enrichment";geo.dataset.geoEnrichment="1";geo.hidden=true;
      const txt=document.createElement("span");txt.dataset.geoEnrichmentText="1";
      const stop=document.createElement("button");stop.type="button";stop.className="secondary-button compact";stop.textContent="Detener búsqueda";
      stop.dataset.geoStop="1";stop.addEventListener("click",handleGeoAction);
      geo.append(txt,stop);box.appendChild(geo);
    }
    return box;
  }
  function coordinatesInput(field){
    const box=document.createElement("div");box.className="coordinate-box";
    const input=document.createElement("input");input.type="text";input.name=field.key;input.inputMode="decimal";input.autocomplete="off";
    input.placeholder="7.10485, -73.10280";
    const status=document.createElement("div");status.className="gps-city";status.dataset.gpsCityFor=field.key;status.textContent="Municipio: pendiente";
    let timer=null;
    input.addEventListener("input",()=>{
      clearError(field.key);clearTimeout(timer);
      const raw=String(input.value||"").trim(),parsed=parseCoordinateText(raw);
      if(!raw){state.gps=null;state.detectedCity="";state.citySource="";status.textContent="Municipio: pendiente";return;}
      if(!parsed){state.gps=null;state.detectedCity="";state.citySource="";status.textContent="Formato esperado: latitud, longitud";return;}
      state.gps={lat:parsed.lat,lng:parsed.lng,accuracy:null,cityDetected:"",citySource:"manual-coordinate"};state.locationValidated=false;
      status.textContent="Municipio: identificando…";
      timer=setTimeout(()=>{state.locationBusy=true;state.geoPromise=resolveExplorationMunicipality(parsed.lat,parsed.lng,field.key);state.geoPromise.finally(()=>{state.locationBusy=false;state.geoPromise=null;});},350);
    });
    const geo=document.createElement("div");geo.className="geo-enrichment";geo.dataset.geoEnrichment="1";geo.hidden=true;
    const txt=document.createElement("span");txt.dataset.geoEnrichmentText="1";
    const stop=document.createElement("button");stop.type="button";stop.className="secondary-button compact";stop.textContent="Detener búsqueda";stop.dataset.geoStop="1";
    stop.addEventListener("click",handleGeoAction);
    geo.append(txt,stop);
    const quick=document.createElement("div");quick.className="gps-quick-tools";
    const copy=document.createElement("button");copy.type="button";copy.textContent="⧉ Copiar coordenada";copy.addEventListener("click",async()=>{if(state.gps)try{await navigator.clipboard.writeText(state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6));}catch(_){}});
    const maps=document.createElement("button");maps.type="button";maps.textContent="↗ Google Maps";maps.addEventListener("click",()=>{if(state.gps)window.open("https://www.google.com/maps?q="+state.gps.lat+","+state.gps.lng,"_blank","noopener");});
    quick.append(copy,maps);box.append(input,quick,status,geo);return box;
  }
  function singlePhotoInput(field){
    const holder=document.createElement("div");holder.className="single-photo-field";
    const preview=document.createElement("div");preview.className="single-photo-preview";
    const actions=document.createElement("div");actions.className="photo-slot-actions";
    const camera=document.createElement("input");camera.type="file";camera.accept="image/*";camera.capture="environment";camera.hidden=true;
    const gallery=document.createElement("input");gallery.type="file";gallery.accept="image/*";gallery.hidden=true;
    const take=document.createElement("button");take.type="button";take.className="photo-add-button";
    const choose=document.createElement("button");choose.type="button";choose.className="photo-add-button secondary-photo";
    const remove=document.createElement("button");remove.type="button";remove.className="secondary-button compact";remove.textContent="Eliminar";
    const setPhoto=async file=>{
      if(!file)return;
      try{
        const data=await compressImage(file,1280,publicMode?.68:.72);
        state.photos=state.photos.filter(p=>p.fieldKey!==field.key);
        state.photos.push({fieldKey:field.key,name:file.name||"foto.jpg",data});
        render();clearError(field.key);
      }catch(_){}
    };
    const render=()=>{
      const photo=state.photos.find(p=>p.fieldKey===field.key);
      preview.innerHTML=photo?'<img src="'+photo.data+'" alt="'+esc(field.label)+'">':'<span>Sin foto</span>';
      take.textContent=photo?"📷 Tomar otra":"📷 Tomar foto";
      choose.textContent=photo?"▣ Elegir otra":"▣ Elegir de galería";
      remove.hidden=!photo;
    };
    take.addEventListener("click",()=>camera.click());
    choose.addEventListener("click",()=>gallery.click());
    remove.addEventListener("click",()=>{state.photos=state.photos.filter(p=>p.fieldKey!==field.key);render();});
    camera.addEventListener("change",async()=>{await setPhoto(camera.files?.[0]);camera.value="";});
    gallery.addEventListener("change",async()=>{await setPhoto(gallery.files?.[0]);gallery.value="";});
    actions.append(take,choose,remove,camera,gallery);
    holder.append(preview,actions);render();return holder;
  }
  function photoInput(field){
    const holder=document.createElement("div");holder.className="photo-sequence";
    const limit=publicMode?Math.max(0,Math.min(3,Number(window.FIBRAZO_PUBLIC_POLICY?.maxPhotos??3))):3;
    const slots=document.createElement("div");slots.className="photo-slots";
    const makePicker=(capture,onFile)=>{
      const picker=document.createElement("input");picker.type="file";picker.accept="image/*";if(capture)picker.capture="environment";else picker.multiple=true;picker.hidden=true;
      picker.addEventListener("change",async()=>{
        const files=[...(picker.files||[])];if(!files.length)return;
        const available=Math.max(0,limit-state.photos.length+(capture?0:0));
        const selected=capture?files.slice(0,1):files.slice(0,Math.max(1,available));
        try{
          const photos=[];
          for(const file of selected){const data=await compressImage(file,1280,publicMode?.68:.72);photos.push({name:file.name||"foto.jpg",data});}
          if(capture)onFile(photos[0]);
          else{
            for(const photo of photos){if(state.photos.length<limit)state.photos.push(photo);}
            render();
          }
          clearError(field.key);
        }catch(_){}
        picker.value="";
      });
      return picker;
    };
    const render=()=>{
      slots.innerHTML="";
      for(let index=0;index<limit;index++){
        if(index>state.photos.length)break;
        const card=document.createElement("div");card.className="photo-slot";
        const title=document.createElement("strong");title.textContent="Foto "+(index+1);
        const actions=document.createElement("div");actions.className="photo-slot-actions";
        const apply=photo=>{if(index<state.photos.length)state.photos[index]=photo;else state.photos.push(photo);render();};
        if(index<state.photos.length){
          const img=document.createElement("img");img.src=state.photos[index].data;img.alt="Vista previa foto "+(index+1);
          const camera=makePicker(true,apply),gallery=makePicker(false,apply);
          const take=document.createElement("button");take.type="button";take.className="secondary-button compact";take.textContent="Tomar otra";take.addEventListener("click",()=>camera.click());
          const choose=document.createElement("button");choose.type="button";choose.className="secondary-button compact";choose.textContent="Elegir otra";choose.addEventListener("click",()=>gallery.click());
          const remove=document.createElement("button");remove.type="button";remove.className="secondary-button compact";remove.textContent="Eliminar";remove.addEventListener("click",()=>{state.photos.splice(index,1);render();});
          actions.append(take,choose,remove,camera,gallery);card.append(title,img,actions);
        }else{
          const camera=makePicker(true,apply),gallery=makePicker(false,apply);
          const take=document.createElement("button");take.type="button";take.className="photo-add-button";take.textContent="📷 Tomar foto "+(index+1);take.addEventListener("click",()=>camera.click());
          const choose=document.createElement("button");choose.type="button";choose.className="photo-add-button secondary-photo";choose.textContent="▣ Elegir de galería";choose.addEventListener("click",()=>gallery.click());
          actions.append(take,choose,camera,gallery);card.append(title,actions);
        }
        slots.appendChild(card);
      }
    };
    render();holder.appendChild(slots);return holder;
  }

  function fieldValue(key){
    const nodes=Array.from(document.querySelectorAll('[name="'+css(key)+'"]'));if(!nodes.length)return"";
    if(nodes[0].type==="radio")return nodes.find(n=>n.checked)?.value||"";
    if(nodes[0].type==="checkbox")return nodes.filter(n=>n.checked).map(n=>n.value);
    return nodes[0].value;
  }
  function conditionMet(field){
    if(!field.showWhen)return true;
    const v=fieldValue(field.showWhen.field);
    if(field.showWhen.notEmpty===true)return Array.isArray(v)?v.length>0:String(v||"").trim()!=="";
    if(Array.isArray(field.showWhen.notValues))return !field.showWhen.notValues.includes(String(v||"").trim());
    return Array.isArray(v)?v.includes(field.showWhen.equals):v===field.showWhen.equals;
  }
  function activeSections(){
    if(!state.form)return[];return (state.form.sections||[]).filter(section=>state.form.fields.some(field=>field.section===section.id&&conditionMet(field)));
  }
  function currentSection(){return activeSections()[state.sectionIndex]||null;}
  function updateVisibility(){
    const section=currentSection(),map=Object.fromEntries((state.form?.fields||[]).map(f=>[f.key,f]));
    document.querySelectorAll("#dynamicFields .field").forEach(el=>{const f=map[el.dataset.key];el.hidden=!(f&&section&&f.section===section.id&&conditionMet(f));});
  }
  function renderSection(){
    const sections=activeSections();if(!sections.length)return;
    if(state.sectionIndex>=sections.length)state.sectionIndex=sections.length-1;
    const section=sections[state.sectionIndex];
    $("sectionTitle").textContent=section.title;$("sectionDescription").textContent=section.description||"";$("sectionEyebrow").textContent="SECCIÓN "+(state.sectionIndex+1);$("formStepCounter").textContent=(state.sectionIndex+1)+" de "+sections.length;
    const stepper=$("sectionStepper");stepper.innerHTML="";
    stepper.style.gridTemplateColumns="repeat("+sections.length+",minmax(0,1fr))";
    let activeStep=null;
    sections.forEach((s,i)=>{
      const x=document.createElement("button");
      x.type="button";
      x.className="step"+(i===state.sectionIndex?" active":i<state.sectionIndex?" complete":" future");
      x.innerHTML="<span>"+(i+1)+"</span><small>"+esc(s.title)+"</small>";
      x.disabled=i>state.maxSectionReached;
      x.setAttribute("aria-current",i===state.sectionIndex?"step":"false");
      if(i!==state.sectionIndex&&i<=state.maxSectionReached){
        x.title="Ir a "+s.title;
        x.addEventListener("click",()=>{state.sectionIndex=i;renderSection();});
      }
      if(i===state.sectionIndex)activeStep=x;
      stepper.appendChild(x);
    });
    stepper.hidden=state.policy?.showProgress===false;
    $("formStepCounter").hidden=state.policy?.showProgress===false;
    $("prevSection").hidden=state.sectionIndex===0;const last=state.sectionIndex===sections.length-1;$("nextSection").hidden=last;$("reviewForm").hidden=!last;
    document.querySelectorAll(".operator-memory-inline").forEach(el=>el.remove());
    document.querySelectorAll(".territorial-coordinate-summary").forEach(el=>el.remove());
    clearValidation();updateVisibility();
    if((state.form?.id==="EXPLORACION_PRESENCIAL"&&section.id==="ubicacion")||(state.form?.id==="INTELIGENCIA_OPERADOR"&&section.id==="validacion")){
      requestAnimationFrame(()=>{
        if(currentSection()?.id!==section.id)return;
        const first=document.querySelector('[data-key="municipio"]');
        if(first&&!document.querySelector(".territorial-coordinate-summary")){
          const box=document.createElement("div");box.className="territorial-coordinate-summary";
          const gps=state.gps;
          box.innerHTML='<strong>Coordenada relevada</strong><span class="territorial-coordinate-value">'+(gps?(gps.lat.toFixed(6)+", "+gps.lng.toFixed(6)+(Number.isFinite(Number(gps.accuracy))?" · ±"+Math.round(Number(gps.accuracy))+" m":"")):"Sin coordenada")+'</span><small>Puedes corregirla aquí antes de finalizar. Al cambiarla se recalcula la lectura territorial sin volver al primer paso.</small>';
          const editRow=document.createElement("div");editRow.className="territorial-coordinate-edit";
          const editInput=document.createElement("input");editInput.type="text";editInput.inputMode="decimal";editInput.placeholder="7.10485, -73.10280";editInput.value=gps?(gps.lat.toFixed(6)+", "+gps.lng.toFixed(6)):"";
          const applyEdit=document.createElement("button");applyEdit.type="button";applyEdit.className="secondary-button compact";applyEdit.textContent="Aplicar y recalcular";
          applyEdit.addEventListener("click",async()=>{
            const parsed=parseCoordinateText(editInput.value);
            if(!parsed){editInput.setCustomValidity("Coordenada inválida");editInput.reportValidity();return;}
            editInput.setCustomValidity("");
            state.gps={lat:parsed.lat,lng:parsed.lng,accuracy:null,cityDetected:"",citySource:"manual-coordinate"};
            const valueNode=box.querySelector(".territorial-coordinate-value");if(valueNode)valueNode.textContent=parsed.lat.toFixed(6)+", "+parsed.lng.toFixed(6)+" · corrección manual";
            state.locationBusy=true;state.locationValidated=false;
            applyEdit.disabled=true;applyEdit.textContent="Recalculando…";
            try{state.geoPromise=resolveExplorationMunicipality(parsed.lat,parsed.lng,"coordenadas");await state.geoPromise;}
            finally{state.locationBusy=false;state.geoPromise=null;applyEdit.disabled=false;applyEdit.textContent="Aplicar y recalcular";}
          });
          const gpsEdit=document.createElement("button");gpsEdit.type="button";gpsEdit.className="secondary-button compact";gpsEdit.textContent="📍 Actualizar por GPS";
          gpsEdit.addEventListener("click",()=>captureGps(box.querySelector(".territorial-coordinate-value"),gpsEdit,"coordenadas"));
          const copyCoord=document.createElement("button");copyCoord.type="button";copyCoord.className="secondary-button compact";copyCoord.textContent="⧉ Copiar";copyCoord.addEventListener("click",()=>{if(state.gps)navigator.clipboard?.writeText(state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)).catch(()=>{});});
          const mapsCoord=document.createElement("button");mapsCoord.type="button";mapsCoord.className="secondary-button compact";mapsCoord.textContent="↗ Google Maps";mapsCoord.addEventListener("click",()=>{if(state.gps)window.open("https://www.google.com/maps?q="+state.gps.lat+","+state.gps.lng,"_blank","noopener");});
          editRow.append(editInput,applyEdit,gpsEdit,copyCoord,mapsCoord);box.appendChild(editRow);first.parentElement?.insertBefore(box,first);
        }
      });
    }
    if(state.form?.id==="EXPLORACION_PRESENCIAL"&&section.id==="infraestructura"){
      requestAnimationFrame(()=>{
        const first=document.querySelector('[data-key="tipo_despliegue"]');
        if(first&&!document.querySelector(".infrastructure-memory-inline")){
          const bar=document.createElement("div");bar.className="operator-memory-inline infrastructure-memory-inline";
          const reuse=document.createElement("button");reuse.type="button";reuse.textContent="↻ Usar última postería";reuse.addEventListener("click",restoreLastInfrastructure);
          const clear=document.createElement("button");clear.type="button";clear.textContent="✕ Limpiar";clear.addEventListener("click",clearInfrastructure);
          bar.append(reuse,clear);first.parentElement?.insertBefore(bar,first);
          restoreLastInfrastructure();
        }
      });
    }
    if(state.form?.id==="EXPLORACION_PRESENCIAL"&&section.id==="operadores"){
      requestAnimationFrame(()=>{
        const first=document.querySelector('[data-key="tigo_hfc"]');
        if(first&&!document.querySelector(".operator-memory-inline")){
          const bar=document.createElement("div");bar.className="operator-memory-inline";
          const reuse=document.createElement("button");reuse.type="button";reuse.textContent="↻ Últimos operadores";reuse.addEventListener("click",restoreLastOperators);
          const clear=document.createElement("button");clear.type="button";clear.textContent="✕ Limpiar";clear.addEventListener("click",clearOperators);
          bar.append(reuse,clear);first.parentElement?.insertBefore(bar,first);
          restoreLastOperators();
        }
      });
    }
    requestAnimationFrame(()=>{
      if(activeStep&&stepper.scrollWidth>stepper.clientWidth){
        const left=Math.max(0,activeStep.offsetLeft-(stepper.clientWidth-activeStep.offsetWidth)/2);
        stepper.scrollTo({left,behavior:"smooth"});
      }
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function prev(){if(state.sectionIndex>0){state.sectionIndex--;renderSection();}}
  function next(){if(state.form?.id==="INTELIGENCIA_OPERADOR"&&currentSection()?.id==="calidad")saveLastOperatorTendidoQuality();if(isExplorationForm()&&currentSection()?.id==="coordenada"&&state.locationBusy){state.sectionIndex++;state.maxSectionReached=Math.max(state.maxSectionReached,state.sectionIndex);renderSection();return;}const e=validateSection(state.sectionIndex,true);if(e.length)return showValidation(e);if(state.form?.id==="EXPLORACION_PRESENCIAL"){if(currentSection()?.id==="infraestructura")saveLastInfrastructure();if(currentSection()?.id==="operadores")saveLastOperators();}state.sectionIndex++;state.maxSectionReached=Math.max(state.maxSectionReached,state.sectionIndex);renderSection();}

  function hasExplorationOperator(){
    if(!isExplorationForm())return true;
    const incumbent=["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar"].some(key=>String(fieldValue(key)||"")==="Sí");
    const isp=["isp_1","isp_2","isp_3","isp_4"].some(key=>{
      const value=String(fieldValue(key)||"").trim();
      return value&&value!=="Sin ISP";
    });
    return incumbent||isp;
  }

  function validateField(field){
    if(field.type==="gps")return field.required&&!state.gps?"Debes tomar la ubicación antes de continuar.":"";
    if(field.type==="coordinates")return field.required&&!state.gps?"Pega una coordenada válida en formato latitud, longitud.":"";
    if(field.type==="photos"||field.type==="photo-single")return"";
    const v=fieldValue(field.key),empty=Array.isArray(v)?v.length===0:String(v||"").trim()==="";
    if(field.key.endsWith("_calidad")&&/^isp_[1-4]_calidad$/.test(field.key)&&isExplorationForm()){const isp=String(fieldValue(field.key.replace("_calidad",""))||"").trim();if(isp&&isp!=="Sin ISP"&&empty)return"Selecciona la calidad del tendido de este ISP.";}
    if(field.required&&empty)return"Este campo es obligatorio.";
    if(!empty&&(field.type==="numeric"||field.type==="currency")&&!/^\d+$/.test(String(v)))return"Ingresa únicamente números.";
    if(!empty&&field.max!==undefined&&Number(v)>Number(field.max))return"No puede ser mayor a "+field.max+".";
    if(field.type==="date-flex"&&!empty&&!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return"Ingresa una fecha válida.";
    return"";
  }
  function validateSection(index,paint){
    const section=activeSections()[index];if(!section)return[];const errors=[];
    state.form.fields.filter(f=>f.section===section.id&&conditionMet(f)).forEach(f=>{const m=validateField(f);if(m){errors.push({field:f,message:m});if(paint)setError(f.key,m);}else if(paint)clearError(f.key);});
    if(isExplorationForm()&&section.id==="operadores"&&!hasExplorationOperator()){
      const target=state.form.fields.find(f=>f.key==="isp_1")||state.form.fields.find(f=>f.section==="operadores");
      if(target){
        const message="Selecciona al menos un operador observado antes de continuar.";
        errors.push({field:target,message});
        if(paint)setError(target.key,message);
      }
    }
    return errors;
  }
  function validateAll(){return activeSections().flatMap((s,i)=>validateSection(i,false));}
  function setError(key,msg){const f=document.querySelector('[data-key="'+css(key)+'"]'),e=document.querySelector('[data-error-for="'+css(key)+'"]');f?.classList.add("invalid");if(e){e.textContent=msg;e.hidden=false;}}
  function clearError(key){const f=document.querySelector('[data-key="'+css(key)+'"]'),e=document.querySelector('[data-error-for="'+css(key)+'"]');f?.classList.remove("invalid");if(e){e.textContent="";e.hidden=true;}}
  function clearValidation(){if(!$("validationSummary"))return;$("validationSummary").hidden=true;$("validationList").innerHTML="";document.querySelectorAll("#dynamicFields .field").forEach(f=>f.classList.remove("invalid"));document.querySelectorAll(".field-error").forEach(e=>{e.hidden=true;e.textContent="";});}
  function showValidation(errors){const list=$("validationList");list.innerHTML="";errors.forEach(x=>{setError(x.field.key,x.message);const li=document.createElement("li");li.textContent=x.field.label+": "+x.message;list.appendChild(li);});$("validationSummary").hidden=false;document.querySelector("#dynamicFields .field.invalid:not([hidden])")?.scrollIntoView({behavior:"smooth",block:"center"});}

  async function review(){
    if(isExplorationForm()&&state.locationBusy){setStatus("Terminando ubicación y datos territoriales…","");try{await state.geoPromise;}catch(_){}}
    if(isExplorationForm()&&state.gps&&!state.locationValidated){setStatus("Validando datos territoriales antes del resumen…","");try{state.geoPromise=resolveExplorationMunicipality(state.gps.lat,state.gps.lng,"coordenadas");await state.geoPromise;}catch(_){}finally{state.geoPromise=null;}}
    const errors=validateAll();if(errors.length){const sections=activeSections(),idx=sections.findIndex(s=>s.id===errors[0].field.section);state.maxSectionReached=Math.max(state.maxSectionReached,sections.length-1);if(idx>=0&&idx!==state.sectionIndex){state.sectionIndex=idx;renderSection();}showValidation(errors.filter(x=>x.field.section===currentSection().id));return;}
    $("formWorkspace").hidden=true;$("reviewWorkspace").hidden=false;$("successWorkspace").hidden=true;buildReview();setStatus("","");window.scrollTo({top:0,behavior:"smooth"});
  }
  function edit(){$("reviewWorkspace").hidden=true;$("formWorkspace").hidden=false;renderSection();}
  function buildReview(){
    const host=$("reviewContent");host.innerHTML="";
    activeSections().forEach(section=>{const visible=state.form.fields.filter(f=>f.section===section.id&&conditionMet(f));if(!visible.length)return;const card=document.createElement("section");card.className="review-section";const rows=visible.map(f=>'<div class="review-row"><span>'+esc(f.label)+'</span><strong>'+esc(reviewValue(f))+'</strong></div>').join("");card.innerHTML='<div class="review-section-head"><span>SECCIÓN</span><h2>'+esc(section.title)+"</h2></div>"+rows;host.appendChild(card);});
  }
  function reviewValue(field){
    if(field.type==="gps"||field.type==="coordinates"){
      if(!state.gps)return"—";
      const accuracy=Number.isFinite(Number(state.gps.accuracy))?" · ±"+Math.round(Number(state.gps.accuracy))+" m":"";
      return state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)+accuracy+(state.gps.cityDetected?" · "+state.gps.cityDetected:"");
    }
    if((field.key==="estrato"||field.key==="sector_barrio")&&state.gps){
      const prefix=field.key==="estrato"?"estrato":"barrio";
      const geoState=String(state.gps[prefix+"Status"]||"");
      if(geoState){
        const base=String(fieldValue(field.key)||"—");
        const near=String(state.gps[prefix+"Nearby"]||"");
        const distance=distanceNumber(state.gps[prefix+"DistanceM"]);
        const baseNorm=base.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
        if(geoState==="DENTRO"){
          if(prefix==="estrato"&&baseNorm==="sin informacion")return base+" · dentro de un polígono cuyo estrato no está informado";
          return base+" · coincidencia exacta";
        }
        if(geoState==="FUERA")return base+" · sin asignación"+(near?" · más cercano: "+near:"")+(distance!==null?" · distancia: "+Math.round(distance)+" m":"");
        if(geoState==="SIN_CAPA_CANONICA")return base+" · sin capa canónica disponible";
        if(geoState==="SIN_CAPA")return base+" · sin capa disponible";
      }
    }
    if(field.type==="photos")return state.photos.length?state.photos.length+" foto"+(state.photos.length===1?"":"s"):"—";
    if(field.type==="photo-single")return state.photos.some(p=>p.fieldKey===field.key)?"1 foto":"—";
    const v=fieldValue(field.key);if(Array.isArray(v))return v.length?v.join(", "):"—";if(!v)return"—";if(field.type==="currency")return"$ "+Number(v).toLocaleString("es-CO");if(field.type==="date-flex")return isoToDmy(v);if(field.suffix)return v+" "+field.suffix;return String(v);
  }

  async function submit(){
    const u=currentUser();if(!state.form||(!u&&!publicMode))return;
    const btn=$("confirmSubmit");btn.disabled=true;setStatus("Guardando respuesta…","");
    if(state.form.id==="EXPLORACION_PRESENCIAL"){saveLastOperators();saveLastInfrastructure();}
    if(state.form.id==="INTELIGENCIA_OPERADOR")saveLastOperatorTendidoQuality();
    const payload={
      formId:state.form.id,
      data:collectData(),
      location:state.gps,
      photos:state.form.id==="INTELIGENCIA_OPERADOR"
        ?["foto_modelo_caja","foto_nomenclatura_caja","foto_marquilla","foto_tipo_tensor","foto_marquilla_drop","foto_tensor_acometida"].map(key=>state.photos.find(p=>p.fieldKey===key)||null).filter(Boolean)
        :state.photos,
      user:{email:u?.email||""},
      clientTimestamp:new Date().toISOString(),
      startedAt:state.startedAt,
      website:$("publicWebsite")?.value||"",
      publicMode,
      editId:state.editId||"",
      existingPhotoFields:state.existingPhotoFields||{}
    };
    try{
      let result;
      if(publicMode){
        const headers={"Content-Type":"application/json"};
        if(state.policy?.collectEmail!==false&&u?.getIdToken)headers.Authorization="Bearer "+await u.getIdToken();
        const r=await fetch("/api/submissions",{method:"POST",headers,body:JSON.stringify(payload)});
        result=await r.json();
        if(!r.ok){
          const message=result.error==="ALREADY_RESPONDED"?"Esta cuenta ya respondió este formulario.":result.error||"No se pudo guardar la respuesta.";
          throw new Error(message);
        }
      }else if(location.hostname.endsWith("github.io")){
        const id="PREVIEW-"+Date.now(),saved=JSON.parse(localStorage.getItem("fibrazoFormsPreview")||"[]");
        saved.unshift({id,...payload});localStorage.setItem("fibrazoFormsPreview",JSON.stringify(saved.slice(0,100)));result={id,queued:false};
      }else if(window.FIBRAZO_OFFLINE&&!state.editId){
        payload.clientSubmissionId=window.FIBRAZO_OFFLINE.createSubmissionId(state.form.id);
        result=await window.FIBRAZO_OFFLINE.submit(payload);
      }else{
        const token=await u.getIdToken();
        const r=await fetch("/api/submissions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(payload)});
        result=await r.json();
        if(!r.ok)throw new Error(result.error||"No se pudo guardar la respuesta.");
      }

      $("reviewWorkspace").hidden=true;$("formWorkspace").hidden=true;$("successWorkspace").hidden=false;
      const recordedWho=state.policy?.collectEmail===false?"Respuesta anónima":(u?.email||"—");
      $("successEmail").textContent=recordedWho;
      paintCompletionStatus(result);
      window.FIBRAZO_OFFLINE?.refreshUi?.();
      if(isExplorationForm()&&!result?.queued){
        window.dispatchEvent(new CustomEvent("fibrazo:submission-saved",{detail:{formId:state.form.id,id:result?.id||""}}));
      }
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){
      const msg=e.message||"No se pudo guardar la respuesta.";
      setStatus("🔴 "+msg+" La encuesta no se considera finalizada hasta que puedas reintentar.","error");
      const summary=$("validationSummary"),list=$("validationList");
      if(summary&&list){summary.hidden=false;list.innerHTML="<li>"+esc(msg)+"</li>";}
    }finally{btn.disabled=false;}
  }

  function paintCompletionStatus(result){
    const workspace=$("successWorkspace"),title=$("successTitle"),message=$("successMessage"),icon=$("successIcon");
    const card=$("successStatusCard"),statusTitle=$("successStatusTitle"),statusDetail=$("successStatusDetail");
    const pointWrap=$("successPointWrap"),point=$("successPoint");
    workspace?.classList.remove("status-ok","status-pending","status-error");
    card?.classList.remove("status-ok","status-pending","status-error");
    if(pointWrap)pointWrap.hidden=true;

    if(result?.queued){
      workspace?.classList.add("status-pending");card?.classList.add("status-pending");
      if(icon)icon.textContent="!";
      if(title)title.textContent="Encuesta guardada en el dispositivo";
      if(message)message.textContent="La encuesta quedó segura localmente y todavía no llegó al servidor.";
      if(statusTitle)statusTitle.textContent="Pendiente de sincronización";
      if(statusDetail)statusDetail.textContent=navigator.onLine?"Se está enviando en segundo plano. Ya puedes completar otra respuesta.":"Se enviará automáticamente cuando vuelva la conexión. Ya puedes completar otra respuesta.";
      return;
    }

    if(isExplorationForm()&&result?.masterSync&&!result.masterSync.ok){
      workspace?.classList.add("status-pending");card?.classList.add("status-pending");
      if(icon)icon.textContent="!";
      if(title)title.textContent="Encuesta guardada";
      if(message)message.textContent="La respuesta quedó registrada correctamente en FIBRAZO Forms.";
      if(statusTitle)statusTitle.textContent="Sincronización con el maestro pendiente";
      if(statusDetail)statusDetail.textContent="El relevamiento está seguro, pero aún no pudo incorporarse a Bucaramanga_Exploracion. Motivo: "+friendlySyncReason(result.masterSync.reason);
      return;
    }

    workspace?.classList.add("status-ok");card?.classList.add("status-ok");
    if(icon)icon.textContent="✓";
    if(title)title.textContent="Encuesta completada correctamente";
    if(message)message.textContent=state.policy?.completionMessage||"La información fue guardada correctamente.";
    if(statusTitle)statusTitle.textContent="Todo correcto";
    if(statusDetail){
      if(isExplorationForm()&&result?.masterSync?.scope==="GLOBAL_ONLY"){
        statusDetail.textContent="La respuesta quedó guardada correctamente en el registro general. No se asignó a un proyecto geográfico específico.";
      }else{
        statusDetail.textContent=isExplorationForm()?"La respuesta quedó guardada y procesada en el proyecto geográfico correspondiente.":"La respuesta quedó guardada correctamente.";
      }
    }
    if(isExplorationForm()&&result?.masterSync?.pointId&&pointWrap&&point){
      pointWrap.hidden=false;point.textContent=result.masterSync.pointId;
    }
  }

  function friendlySyncReason(reason){
    const map={
      MASTER_ACCESS_DENIED:"la integración no tiene acceso de edición al Sheet maestro",
      MASTER_NOT_FOUND:"no se encontró el Sheet maestro configurado",
      MASTER_RATE_LIMIT:"Google limitó temporalmente las solicitudes",
      MASTER_TIMEOUT:"la sincronización excedió el tiempo disponible",
      OUTSIDE_STUDY_AREA:"la coordenada está fuera del área de estudio de Bucaramanga, Floridablanca, Girón y Piedecuesta",
      NO_POLYGON_DATA:"no fue posible relacionar la coordenada con la base geográfica",
      SYNC_ERROR:"se produjo un error técnico en la integración",
      PENDIENTE:"la sincronización quedó pendiente"
    };
    return map[String(reason||"")]||String(reason||"pendiente");
  }

  function collectData(){const d={};state.form.fields.forEach(f=>{if(f.type==="gps"||f.type==="coordinates"||f.type==="photos"||f.type==="photo-single"||!conditionMet(f))return;d[f.key]=fieldValue(f.key);});return d;}
  function operatorSnapshot(){
    const keys=["tigo_hfc","tigo_ftth","claro_hfc","claro_ftth","movistar","isp_1","isp_1_calidad","isp_2","isp_2_calidad","isp_3","isp_3_calidad","isp_4","isp_4_calidad"];
    return Object.fromEntries(keys.map(k=>[k,fieldValue(k)]).filter(([,v])=>v!==undefined&&v!==null&&v!==""));
  }
  function saveLastOperators(){
    if(state.form?.id!=="EXPLORACION_PRESENCIAL")return;
    try{localStorage.setItem("fibrazo:last-operators",JSON.stringify(operatorSnapshot()));}catch(_){}
  }
  function restoreLastOperators(){
    let saved={};try{saved=JSON.parse(localStorage.getItem("fibrazo:last-operators")||"{}");}catch(_){}
    for(const [key,value] of Object.entries(saved)){
      if(/^isp_[1-4]_calidad$/.test(key))continue;
      const node=document.querySelector('[name="'+css(key)+'"]');if(!node)continue;
      if(node.type==="hidden"){
        node.value=value;
        const holder=node.closest(".binary-toggle,.segmented-control");
        if(holder?.classList.contains("binary-toggle")){
          const b=holder.querySelector(".binary-toggle-button");
          if(b){
            const yes=normalizeCityName(value)==="si";
            b.classList.toggle("is-yes",yes);
            b.setAttribute("aria-pressed",String(yes));
            b.innerHTML='<span class="toggle-state">'+(yes?"Sí":"No")+'</span><span class="toggle-hint">Toca para cambiar</span>';
          }
        }else{
          holder?.querySelectorAll(".segment-option").forEach(b=>{const on=normalizeCityName(b.textContent)===normalizeCityName(value);b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));});
        }
      } else {
        node.value=value;
        const shell=node.closest(".isp-field-state");
        if(shell){
          const v=String(value||"").trim();
          shell.classList.toggle("isp-none",!v||v==="Sin ISP");
          shell.classList.toggle("isp-unknown",v==="Sin Identificar");
          shell.classList.toggle("isp-known",!!v&&v!=="Sin ISP"&&v!=="Sin Identificar");
          shell.querySelector(".isp-suggestion-list")?.setAttribute("hidden","");
        }
        node.dispatchEvent(new Event("change",{bubbles:true}));
      }
    }
    for(let i=1;i<=4;i++){
      const key="isp_"+i;
      const current=String(fieldValue(key)||"").trim();
      const original=String(saved[key]||"").trim();
      const quality=String(saved[key+"_calidad"]||"");
      paintSegmentedValue(key+"_calidad",current&&current!=="Sin ISP"&&normalizeCityName(current)===normalizeCityName(original)&&["1","2","3","4","5"].includes(quality)?quality:"");
    }
    updateVisibility();
  }
  function setStatus(m,t){if(!$("saveStatus"))return;$("saveStatus").textContent=m;$("saveStatus").className="save-status"+(t?" "+t:"");}

  function captureChurnGpsAutomatically(){
    if(state.form?.id!=="CHURN"||state.gps)return;
    const field=document.querySelector('[data-key="coordenadas"]');
    const value=field?.querySelector(".gps-value");
    const btn=field?.querySelector("button");
    if(value&&btn){
      value.textContent="Obteniendo ubicación automáticamente…";
      captureGps(value,btn,"coordenadas");
    }
  }

  function captureGps(value,btn,key){
    if(!navigator.geolocation){value.textContent="GPS no disponible en este navegador.";return;}
    btn.disabled=true;btn.textContent="Buscando mejor señal…";state.locationBusy=isExplorationForm()&&key==="coordenadas";state.locationValidated=false;
    let best=null,finished=false,watchId=null,timer=null;
    const finish=async p=>{
      if(finished)return;finished=true;if(watchId!==null)navigator.geolocation.clearWatch(watchId);clearTimeout(timer);
      if(!p){value.textContent="No se pudo obtener la ubicación. Revisa el permiso del navegador.";btn.disabled=false;btn.textContent="Reintentar";state.locationBusy=false;return;}
      const advanceAfterGps=(state.form?.id==="EXPLORACION_PRESENCIAL"||state.form?.id==="INTELIGENCIA_OPERADOR")&&key==="coordenadas"&&currentSection()?.id==="coordenada"&&!state.gps;
      state.gps={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,cityDetected:"",citySource:""};
      value.textContent=state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)+" · ±"+Math.round(state.gps.accuracy)+" m";
      const summaryValue=document.querySelector(".territorial-coordinate-summary .territorial-coordinate-value");
      if(summaryValue)summaryValue.textContent=value.textContent;
      const summaryInput=document.querySelector(".territorial-coordinate-summary .territorial-coordinate-edit input");
      if(summaryInput)summaryInput.value=state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6);
      if(advanceAfterGps&&currentSection()?.id==="coordenada"){
        state.sectionIndex++;state.maxSectionReached=Math.max(state.maxSectionReached,state.sectionIndex);renderSection();
      }
      if(state.form?.id==="CHURN"&&key==="coordenadas"){
        const fallback=detectConfiguredCityOffline(state.gps.lat,state.gps.lng);
        if(fallback)applyDetectedCity(fallback);
        const cityStatus=document.querySelector('[data-gps-city-for="coordenadas"]');
        if(cityStatus&&!fallback)cityStatus.textContent=navigator.onLine?"Ciudad GPS: identificando…":"Ciudad GPS: sin conexión · selección manual disponible";
        if(navigator.onLine){
          const resolved=await reverseGeocodeCity(state.gps.lat,state.gps.lng);
          if(resolved)applyDetectedCity(resolved);
          else if(cityStatus&&!fallback)cityStatus.textContent="Ciudad GPS: no se pudo identificar · selección manual disponible";
        }
      }else if(isExplorationForm()&&key==="coordenadas"){
        state.geoPromise=resolveExplorationMunicipality(state.gps.lat,state.gps.lng,key);await state.geoPromise;state.geoPromise=null;
      }
      btn.disabled=false;btn.textContent="Actualizar ubicación";state.locationBusy=false;clearError(key);
    };
    const onPosition=p=>{
      if(!best||Number(p.coords.accuracy)<Number(best.coords.accuracy))best=p;
      if(best){value.textContent="Buscando precisión… mejor lectura ±"+Math.round(best.coords.accuracy)+" m";}
      if(Number(p.coords.accuracy)<=12)finish(p);
    };
    try{watchId=navigator.geolocation.watchPosition(onPosition,()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:18000});}
    catch(_){watchId=null;}
    timer=setTimeout(()=>finish(best),10000);
  }

  function normalizeCityName(value){
    return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  }

  function applyDetectedCity(cityName,source="gps"){
    const city=String(cityName||"").trim();
    if(!city)return;
    const fieldKey=state.form?.id==="CHURN"?"ciudad":(state.form?.id==="EXPLORACION_PRESENCIAL"||state.form?.id==="INTELIGENCIA_OPERADOR")?"municipio":"";
    const control=fieldKey?document.querySelector('[name="'+css(fieldKey)+'"]'):null;
    if(control?.dataset.geoManual==="1"&&source!=="manual"){
      if(state.gps){state.gps.cityTerritorialSuggested=city;state.gps.cityTerritorialSource=source;}
      return;
    }
    state.detectedCity=city;state.citySource=source;
    if(state.gps){state.gps.cityDetected=city;state.gps.citySource=source;}
    const status=document.querySelector('[data-gps-city-for="coordenadas"]');
    if(status)status.textContent=(isExplorationForm()?"Municipio: ":"Ciudad GPS: ")+city;
    if(!control)return;
    control.dataset.autoGps="1";
    if(control.tagName==="SELECT"){
      control.querySelectorAll('[data-gps-detected="1"]').forEach(o=>o.remove());
      const configured=state.form?.fields?.find(f=>f.key===fieldKey)?.options||[];
      const match=configured.find(item=>normalizeCityName(item)===normalizeCityName(city));
      if(match)control.value=match;
      else{
        const opt=document.createElement("option");
        opt.value=city;opt.textContent=city+" · detectada por GPS";opt.disabled=true;opt.selected=true;opt.dataset.gpsDetected="1";
        control.insertBefore(opt,control.options[1]||null);
      }
    }else{
      control.value=city;
    }
    delete control.dataset.autoGps;
    clearError(fieldKey);
  }

  function isExplorationForm(){
    return state.form?.id==="EXPLORACION"||state.form?.id==="EXPLORACION_PRESENCIAL"||state.form?.id==="INTELIGENCIA_OPERADOR";
  }

  function parseCoordinateText(value){
    const m=String(value||"").trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(!m)return null;
    const lat=Number(m[1]),lng=Number(m[2]);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)return null;
    return {lat,lng};
  }

  function geoStatus(message,{busy=false,hidden=false,retry=false}={}){
    const box=document.querySelector("[data-geo-enrichment='1']");
    const text=box?.querySelector("[data-geo-enrichment-text='1']");
    const stop=box?.querySelector("[data-geo-stop='1']");
    if(!box)return;
    box.hidden=hidden;
    if(text)text.textContent=message||"";
    if(stop){
      stop.hidden=!(busy||retry);
      stop.textContent=busy?"Detener búsqueda":"Reintentar búsqueda";
      stop.dataset.geoMode=busy?"stop":"retry";
    }
  }

  function handleGeoAction(){
    const mode=this?.dataset?.geoMode||"stop";
    if(mode==="retry")return restartGeoLookup();
    cancelGeoLookup("Búsqueda detenida. Puedes continuar manualmente o reiniciarla.");
  }

  function cancelGeoLookup(message="Búsqueda detenida. Puedes continuar."){
    state.geoLookupCancelled=true;
    state.geoController?.abort();state.geoController=null;
    geoStatus(message,{busy:false,retry:true});
  }

  function restartGeoLookup(){
    if(!state.gps)return;
    state.geoLookupCancelled=false;
    return resolveExplorationMunicipality(state.gps.lat,state.gps.lng,"coordenadas");
  }

  function setGeoField(key,value,emptyValue=""){
    const control=document.querySelector('[name="'+css(key)+'"]');
    if(!control||control.dataset.geoManual==="1")return;
    const hasValue=value!==undefined&&value!==null&&String(value).trim()!=="";
    control.dataset.geoWriting="1";
    control.value=hasValue?String(value):String(emptyValue||"");
    control.dataset.geoAuto="1";
    delete control.dataset.geoWriting;
    clearError(key);
  }

  function distanceNumber(value){
    if(value===null||value===undefined||value==="")return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function geoLayerDetail(status,assigned,nearby,distance,source,label){
    const stateCode=String(status||"");
    const current=String(assigned||"").trim();
    const near=String(nearby||"").trim();
    const meters=distanceNumber(distance);
    const currentNorm=current.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

    if(stateCode==="DENTRO"){
      if(label==="Estrato"&&(!current||currentNorm==="sin informacion")){
        return"Dentro de un polígono de estrato, pero ese polígono no tiene estrato informado"+(source?" · "+source:"");
      }
      return"Coincidencia exacta"+(source?" · "+source:"");
    }
    if(stateCode==="FUERA"){
      return"Fuera del polígono"
        +(near?" · "+label+" más cercano: "+near:"")
        +(meters!==null?" · Distancia al polígono: "+Math.round(meters)+" m":"");
    }
    if(stateCode==="SIN_CAPA_CANONICA")return"Sin capa canónica disponible para "+label.toLowerCase();
    if(stateCode==="SIN_CAPA")return"Sin capa disponible para "+label.toLowerCase();
    return"";
  }

  async function queryExplorationEnrichment(lat,lng,cityHint=""){
    if(!navigator.onLine){
      geoStatus("Sin conexión · GPS guardado. La geografía canónica se resolverá al sincronizar; puedes completar los campos manualmente.",{busy:false,retry:true});
      return null;
    }
    const lookupId=++state.geoLookupId;
    state.geoLookupCancelled=false;
    state.geoController?.abort();
    const controller=new AbortController();state.geoController=controller;
    const timer=setTimeout(()=>controller.abort(),15000);
    geoStatus("Consultando Maestro Territorial FIBRAZO…",{busy:true});
    try{
      const user=currentUser();
      const token=user&&typeof user.getIdToken==="function"?await user.getIdToken():"";
      if(!token)throw new Error("AUTH_REQUIRED");
      const url="/api/exploration?lat="+encodeURIComponent(lat)+"&lng="+encodeURIComponent(lng)+"&city="+encodeURIComponent(cityHint||state.detectedCity||"");
      const response=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:controller.signal,cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"LOOKUP_ERROR");
      if(lookupId!==state.geoLookupId||state.geoLookupCancelled)return null;

      if(data.cityStatus==="DENTRO"&&data.city)applyDetectedCity(data.city,"territorial");
      const barrioDisplay=data.barrioStatus==="DENTRO"?data.barrio:(data.barrioStatus==="FUERA"?data.barrioNearby:"");
      const estratoDisplay=data.estratoStatus==="DENTRO"?data.estrato:(data.estratoStatus==="FUERA"?data.estratoNearby:"");
      setGeoField("sector_barrio",barrioDisplay||"","");
      setGeoField("estrato",estratoDisplay||"","Sin información");

      if(state.gps){
        Object.assign(state.gps,{
          territorialVersion:data.territorialVersion||"",
          territorialCatalogId:data.catalogId||"",
          territorialFileId:data.territorialFileId||"",
          cityStatus:data.cityStatus||"",
          cityNearby:data.cityNearby||"",
          cityDistanceM:distanceNumber(data.cityDistanceM),
          barrioSource:data.barrioSource||"",
          barrioStatus:data.barrioStatus||"",
          barrioNearby:data.barrioNearby||"",
          barrioDistanceM:distanceNumber(data.barrioDistanceM),
          estratoSource:data.estratoSource||"",
          estratoStatus:data.estratoStatus||"",
          estratoNearby:data.estratoNearby||"",
          estratoMatch:data.estratoMatch||"",
          estratoDistanceM:distanceNumber(data.estratoDistanceM),
          troncalSource:data.troncalSource||"",
          troncalStatus:data.troncalStatus||"",
          troncalNearby:data.troncalNearby||"",
          troncalDistanceM:distanceNumber(data.troncalDistanceM)
        });
      }

      state.ispOptions=Array.isArray(data.isps)?data.isps:[];
      refreshIspSuggestions();

      const barrioInfo=document.querySelector('[data-geo-info-for="sector_barrio"]');
      if(barrioInfo){
        const detail=geoLayerDetail(data.barrioStatus,data.barrio,data.barrioNearby,data.barrioDistanceM,data.barrioSource,"Barrio");
        barrioInfo.textContent=detail;barrioInfo.hidden=!detail;
        barrioInfo.className="field-geo-info "+(data.barrioStatus==="DENTRO"?"geo-inside":data.barrioStatus==="FUERA"?"geo-outside":"geo-missing");
      }
      const estratoInfo=document.querySelector('[data-geo-info-for="estrato"]');
      if(estratoInfo){
        const detail=geoLayerDetail(data.estratoStatus,data.estrato,data.estratoNearby,data.estratoDistanceM,data.estratoSource,"Estrato");
        estratoInfo.textContent=detail;estratoInfo.hidden=!detail;
        estratoInfo.className="field-geo-info "+(data.estratoStatus==="DENTRO"?"geo-inside":data.estratoStatus==="FUERA"?"geo-outside":"geo-missing");
      }
      const cityStatus=document.querySelector('[data-gps-city-for="coordenadas"]');
      if(cityStatus){
        const cityDistance=distanceNumber(data.cityDistanceM);
        if(data.cityStatus==="DENTRO"&&data.city)cityStatus.textContent="Municipio: "+data.city+" · coincidencia exacta";
        else if(data.cityStatus==="FUERA")cityStatus.textContent="Fuera del límite municipal"
          +(data.cityNearby?" · Municipio más cercano: "+data.cityNearby:"")
          +(cityDistance!==null?" · Distancia al límite: "+Math.round(cityDistance)+" m":"");
        else if(data.cityStatus==="SIN_CAPA_CANONICA")cityStatus.textContent="Municipio: sin capa canónica disponible";
        else if(data.cityStatus==="SIN_CAPA")cityStatus.textContent="Municipio: sin capa territorial disponible";
      }
      geoStatus("",{hidden:true});
      state.locationValidated=true;
      return data;
    }catch(error){
      if(lookupId!==state.geoLookupId)return null;
      const stopped=state.geoLookupCancelled||error?.name==="AbortError";
      geoStatus(stopped?"Búsqueda detenida o sin respuesta. Puedes continuar manualmente o reintentar.":"No se pudo completar la búsqueda automática. Puedes continuar manualmente o reintentar.",{busy:false,retry:true});
      return null;
    }finally{
      clearTimeout(timer);
      if(state.geoController===controller)state.geoController=null;
    }
  }

  async function resolveExplorationMunicipality(lat,lng,key="coordenadas"){
    const status=document.querySelector('[data-gps-city-for="'+css(key)+'"]');
    const fallback=detectAmbMunicipalityOffline(lat,lng)||detectConfiguredCityOffline(lat,lng);
    state.geoLookupCancelled=false;

    if(!navigator.onLine){
      if(fallback)applyDetectedCity(fallback,"aproximado");
      if(status)status.textContent=fallback?"Municipio aprox.: "+fallback+" · se validará al sincronizar":"Municipio: sin conexión · se validará al sincronizar";
      geoStatus("Sin conexión · la geografía canónica se resolverá al sincronizar.",{busy:false,retry:true});
      return fallback||"";
    }

    if(status)status.textContent="Municipio: consultando Maestro Territorial…";
    const data=await queryExplorationEnrichment(lat,lng,"");
    if(state.geoLookupCancelled)return"";
    if(data?.cityStatus==="DENTRO"&&data.city)return data.city;

    let observed="";
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5500);
    try{observed=await reverseGeocodeCity(lat,lng,controller.signal);}catch(_){}
    finally{clearTimeout(timer);}

    if(observed){
      applyDetectedCity(observed,"reverse-geocode");
      if(status){
        const territorialContext=data?.cityStatus==="FUERA"
          ?(" · fuera del ámbito FIBRAZO"+(data.cityNearby?" · cercano: "+data.cityNearby:"")+(Number.isFinite(Number(data.cityDistanceM))?" · ~"+Math.round(Number(data.cityDistanceM))+" m":""))
          :" · referencia de ubicación";
        status.textContent="Municipio observado: "+observed+territorialContext;
      }
      return observed;
    }

    if(fallback){
      applyDetectedCity(fallback,"aproximado");
      if(status)status.textContent="Municipio aprox.: "+fallback+" · sin confirmación territorial";
      return fallback;
    }
    if(status&&data?.cityStatus!=="FUERA")status.textContent="Municipio: puedes completarlo manualmente";
    return"";
  }

  function detectAmbMunicipalityOffline(lat,lng){
    const cities=[
      {name:"Bucaramanga",lat:7.11935,lng:-73.12274,maxKm:18},
      {name:"Floridablanca",lat:7.06222,lng:-73.08644,maxKm:18},
      {name:"Girón",lat:7.06820,lng:-73.16980,maxKm:18},
      {name:"Piedecuesta",lat:6.98770,lng:-73.05080,maxKm:18}
    ];
    let best=null;
    for(const city of cities){
      const distance=haversineKm(lat,lng,city.lat,city.lng);
      if(distance<=city.maxKm&&(!best||distance<best.distance))best={name:city.name,distance};
    }
    return best?.name||"";
  }

  async function reverseGeocodeCity(lat,lng,externalSignal=null){
    if(!navigator.onLine)return"";
    const controller=externalSignal?null:new AbortController();
    const signal=externalSignal||controller.signal;
    const timer=setTimeout(()=>{if(controller)controller.abort();},5500);
    try{
      const url="https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="+encodeURIComponent(lat)+"&longitude="+encodeURIComponent(lng)+"&localityLanguage=es";
      const response=await fetch(url,{signal});
      if(!response.ok)return"";
      const data=await response.json();
      return String(data.city||data.locality||"").trim();
    }catch(_){return"";}
    finally{clearTimeout(timer);}
  }

  function detectConfiguredCityOffline(lat,lng){
    const cities=[
      {name:"Cartagena",lat:10.3910,lng:-75.4794,maxKm:30},
      {name:"Barranquilla",lat:10.9685,lng:-74.7813,maxKm:25},
      {name:"Santa Marta",lat:11.2408,lng:-74.1990,maxKm:30},
      {name:"Sincelejo",lat:9.3047,lng:-75.3978,maxKm:20},
      {name:"Montería",lat:8.7480,lng:-75.8814,maxKm:25},
      {name:"Turbaco",lat:10.3294,lng:-75.4114,maxKm:18}
    ];
    let best=null;
    for(const city of cities){
      const distance=haversineKm(lat,lng,city.lat,city.lng);
      if(distance<=city.maxKm&&(!best||distance<best.distance))best={name:city.name,distance};
    }
    return best?.name||"";
  }

  function haversineKm(lat1,lng1,lat2,lng2){
    const rad=x=>x*Math.PI/180,R=6371;
    const dLat=rad(lat2-lat1),dLng=rad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function compressImage(file,maxWidth,quality){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxWidth/img.width),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",quality));};img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});}
  function maskDate(v){const d=String(v||"").replace(/\D/g,"").slice(0,8);if(d.length<=2)return d;if(d.length<=4)return d.slice(0,2)+"/"+d.slice(2);return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4);}
  function dmyToIso(v){const m=String(v||"").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return"";const dd=m[1],mm=m[2],yyyy=m[3],date=new Date(yyyy+"-"+mm+"-"+dd+"T00:00:00");if(Number.isNaN(date.getTime())||date.getFullYear()!==Number(yyyy)||date.getMonth()+1!==Number(mm)||date.getDate()!==Number(dd))return"";return yyyy+"-"+mm+"-"+dd;}
  function isoToDmy(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"/"+m[2]+"/"+m[1]:String(v||"");}
})();