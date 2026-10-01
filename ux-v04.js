(() => {
  const forms=window.FIBRAZO_FORMS||{};
  const $=id=>document.getElementById(id);
  const publicMode=document.body.classList.contains("public-mode");
  const state={form:null,sectionIndex:0,gps:null,photos:[],startedAt:0};
  const pending=window.FIBRAZO_PENDING||[];

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function css(v){return window.CSS&&CSS.escape?CSS.escape(v):String(v).replace(/["\\]/g,"\\$&");}
  function currentUser(){return window.FIBRAZO_PUBLIC_USER||window.firebase?.auth?.().currentUser||null;}

  function renderPending(){
    const count=$("pendingCount"),list=$("pendingList"); if(!count||!list)return;
    count.textContent=String(pending.length);
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
    const btn=e.target.closest(".form-card button");if(!btn)return;
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

  function openForm(id){
    const form=forms[id];if(!form)return;
    if(!publicMode&&window.FIBRAZO_ACCESS&&window.FIBRAZO_ACCESS[id]===false)return;
    state.form=form;state.sectionIndex=0;state.gps=null;state.photos=[];state.startedAt=Date.now();
    document.body.classList.add("form-mode");
    $("formTitle").textContent=form.name;
    $("formDescription").textContent=form.description||"";
    $("formEyebrow").textContent=form.eyebrow||"FORMULARIO";
    const who=currentUser()?.email||(publicMode?"Formulario público":"");
    if($("formUserEmail"))$("formUserEmail").textContent=who;
    if($("reviewUserEmail"))$("reviewUserEmail").textContent=who;
    $("dynamicFields").innerHTML="";
    form.fields.forEach(field=>$("dynamicFields").appendChild(renderField(field)));
    $("formWorkspace").hidden=false;$("reviewWorkspace").hidden=true;$("successWorkspace").hidden=true;
    clearValidation();renderSection();
    if(form.id==="CHURN") setTimeout(captureChurnGpsAutomatically,250);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  window.FIBRAZO_UX_OPEN_FORM=openForm;

  function exitForm(){
    if(publicMode){location.reload();return;}
    document.body.classList.remove("form-mode");
    $("formWorkspace").hidden=true;$("reviewWorkspace").hidden=true;$("successWorkspace").hidden=true;
    state.form=null;state.gps=null;state.photos=[];window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderField(field){
    const wrap=document.createElement("div");wrap.className="field"+(field.full?" full":"");wrap.dataset.key=field.key;wrap.dataset.section=field.section||"default";
    const label=document.createElement("label");label.className="field-label";label.innerHTML=esc(field.label)+(field.required?'<span class="required">*</span>':"");wrap.appendChild(label);
    if(field.help){const h=document.createElement("span");h.className="field-help field-help-top";h.textContent=field.help;wrap.appendChild(h);}

    if(field.type==="text"){wrap.appendChild(textInput(field));}
    else if(field.type==="numeric"||field.type==="currency"){wrap.appendChild(numericInput(field));}
    else if(field.type==="date-flex"){wrap.appendChild(dateInput(field));}
    else if(field.type==="select"){wrap.appendChild(selectInput(field));}
    else if(field.type==="textarea"){const t=document.createElement("textarea");t.name=field.key;t.addEventListener("input",()=>clearError(field.key));wrap.appendChild(t);}
    else if(field.type==="radio"||field.type==="checkbox"){wrap.appendChild(choiceInput(field));}
    else if(field.type==="gps"){wrap.appendChild(gpsInput(field));}
    else if(field.type==="photos"){wrap.appendChild(photoInput(field));}

    const err=document.createElement("div");err.className="field-error";err.dataset.errorFor=field.key;err.hidden=true;wrap.appendChild(err);
    if(field.default!==undefined)queueMicrotask(()=>{const n=document.querySelector('[name="'+css(field.key)+'"]');if(n&&!n.value)n.value=String(field.default);});
    return wrap;
  }

  function textInput(field){
    const i=document.createElement("input");i.type="text";i.name=field.key;i.addEventListener("input",()=>{clearError(field.key);updateVisibility();});return i;
  }
  function numericInput(field){
    const shell=document.createElement("div");shell.className="input-affix";
    if(field.type==="currency"){const p=document.createElement("span");p.className="input-prefix";p.textContent="$";shell.appendChild(p);}
    const i=document.createElement("input");i.type="text";i.name=field.key;i.inputMode="numeric";i.autocomplete="off";if(field.maxLength)i.maxLength=field.maxLength;
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
    s.addEventListener("change",()=>{clearError(field.key);updateVisibility();});return s;
  }
  function choiceInput(field){
    const grid=document.createElement("div");grid.className="choice-grid";
    (field.options||[]).forEach(o=>{const l=document.createElement("label");l.className="choice";const i=document.createElement("input");i.type=field.type;i.name=field.key;i.value=o;i.addEventListener("change",()=>{clearError(field.key);updateVisibility();});l.append(i,document.createTextNode(o));grid.appendChild(l);});return grid;
  }
  function gpsInput(field){
    const box=document.createElement("div");box.className="gps-box";const value=document.createElement("div");value.className="gps-value";value.textContent="Ubicación pendiente";
    const btn=document.createElement("button");btn.type="button";btn.className="secondary-button";btn.textContent="Tomar coordenadas";btn.addEventListener("click",()=>captureGps(value,btn,field.key));box.append(value,btn);return box;
  }
  function photoInput(field){
    const holder=document.createElement("div"),input=document.createElement("input"),preview=document.createElement("div");input.type="file";input.accept="image/*";input.multiple=true;input.capture="environment";input.className="photo-input";preview.className="photo-preview";
    input.addEventListener("change",async()=>{
      const limit=publicMode?Math.max(0,Math.min(3,Number(window.FIBRAZO_PUBLIC_POLICY?.maxPhotos??3))):3;
      const selected=Array.from(input.files||[]).slice(0,limit);state.photos=[];preview.innerHTML="";
      for(const file of selected){try{const data=await compressImage(file,1280,publicMode?.68:.72);state.photos.push({name:file.name||"foto.jpg",data});const img=document.createElement("img");img.src=data;img.alt=file.name||"Foto seleccionada";preview.appendChild(img);}catch(_){}}
      clearError(field.key);
    });holder.append(input,preview);return holder;
  }

  function fieldValue(key){
    const nodes=Array.from(document.querySelectorAll('[name="'+css(key)+'"]'));if(!nodes.length)return"";
    if(nodes[0].type==="radio")return nodes.find(n=>n.checked)?.value||"";
    if(nodes[0].type==="checkbox")return nodes.filter(n=>n.checked).map(n=>n.value);
    return nodes[0].value;
  }
  function conditionMet(field){
    if(!field.showWhen)return true;const v=fieldValue(field.showWhen.field);return Array.isArray(v)?v.includes(field.showWhen.equals):v===field.showWhen.equals;
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
    sections.forEach((s,i)=>{const x=document.createElement("div");x.className="step"+(i===state.sectionIndex?" active":i<state.sectionIndex?" complete":"");x.innerHTML="<span>"+(i+1)+"</span><small>"+esc(s.title)+"</small>";stepper.appendChild(x);});
    $("prevSection").hidden=state.sectionIndex===0;const last=state.sectionIndex===sections.length-1;$("nextSection").hidden=last;$("reviewForm").hidden=!last;
    clearValidation();updateVisibility();window.scrollTo({top:0,behavior:"smooth"});
  }
  function prev(){if(state.sectionIndex>0){state.sectionIndex--;renderSection();}}
  function next(){const e=validateSection(state.sectionIndex,true);if(e.length)return showValidation(e);state.sectionIndex++;renderSection();}

  function validateField(field){
    if(field.type==="gps")return field.required&&!state.gps?"Debes tomar la ubicación antes de continuar.":"";
    if(field.type==="photos")return"";
    const v=fieldValue(field.key),empty=Array.isArray(v)?v.length===0:String(v||"").trim()==="";
    if(field.required&&empty)return"Este campo es obligatorio.";
    if(!empty&&(field.type==="numeric"||field.type==="currency")&&!/^\d+$/.test(String(v)))return"Ingresa únicamente números.";
    if(field.type==="date-flex"&&!empty&&!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return"Ingresa una fecha válida.";
    return"";
  }
  function validateSection(index,paint){
    const section=activeSections()[index];if(!section)return[];const errors=[];
    state.form.fields.filter(f=>f.section===section.id&&conditionMet(f)).forEach(f=>{const m=validateField(f);if(m){errors.push({field:f,message:m});if(paint)setError(f.key,m);}else if(paint)clearError(f.key);});return errors;
  }
  function validateAll(){return activeSections().flatMap((s,i)=>validateSection(i,false));}
  function setError(key,msg){const f=document.querySelector('[data-key="'+css(key)+'"]'),e=document.querySelector('[data-error-for="'+css(key)+'"]');f?.classList.add("invalid");if(e){e.textContent=msg;e.hidden=false;}}
  function clearError(key){const f=document.querySelector('[data-key="'+css(key)+'"]'),e=document.querySelector('[data-error-for="'+css(key)+'"]');f?.classList.remove("invalid");if(e){e.textContent="";e.hidden=true;}}
  function clearValidation(){if(!$("validationSummary"))return;$("validationSummary").hidden=true;$("validationList").innerHTML="";document.querySelectorAll("#dynamicFields .field").forEach(f=>f.classList.remove("invalid"));document.querySelectorAll(".field-error").forEach(e=>{e.hidden=true;e.textContent="";});}
  function showValidation(errors){const list=$("validationList");list.innerHTML="";errors.forEach(x=>{setError(x.field.key,x.message);const li=document.createElement("li");li.textContent=x.field.label+": "+x.message;list.appendChild(li);});$("validationSummary").hidden=false;document.querySelector("#dynamicFields .field.invalid:not([hidden])")?.scrollIntoView({behavior:"smooth",block:"center"});}

  function review(){
    const errors=validateAll();if(errors.length){const sections=activeSections(),idx=sections.findIndex(s=>s.id===errors[0].field.section);if(idx>=0)state.sectionIndex=idx;renderSection();showValidation(errors.filter(x=>x.field.section===currentSection().id));return;}
    $("formWorkspace").hidden=true;$("reviewWorkspace").hidden=false;$("successWorkspace").hidden=true;buildReview();setStatus("","");window.scrollTo({top:0,behavior:"smooth"});
  }
  function edit(){$("reviewWorkspace").hidden=true;$("formWorkspace").hidden=false;renderSection();}
  function buildReview(){
    const host=$("reviewContent");host.innerHTML="";
    activeSections().forEach(section=>{const visible=state.form.fields.filter(f=>f.section===section.id&&conditionMet(f));if(!visible.length)return;const card=document.createElement("section");card.className="review-section";const rows=visible.map(f=>'<div class="review-row"><span>'+esc(f.label)+'</span><strong>'+esc(reviewValue(f))+'</strong></div>').join("");card.innerHTML='<div class="review-section-head"><span>SECCIÓN</span><h2>'+esc(section.title)+"</h2></div>"+rows;host.appendChild(card);});
  }
  function reviewValue(field){
    if(field.type==="gps")return state.gps?state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)+" · ±"+Math.round(state.gps.accuracy)+" m":"—";
    if(field.type==="photos")return state.photos.length?state.photos.length+" foto"+(state.photos.length===1?"":"s"):"—";
    const v=fieldValue(field.key);if(Array.isArray(v))return v.length?v.join(", "):"—";if(!v)return"—";if(field.type==="currency")return"$ "+Number(v).toLocaleString("es-CO");if(field.type==="date-flex")return isoToDmy(v);if(field.suffix)return v+" "+field.suffix;return String(v);
  }

  async function submit(){
    const u=currentUser();if(!state.form||(!u&&!publicMode))return;
    const btn=$("confirmSubmit");btn.disabled=true;setStatus("Guardando respuesta…","");
    const payload={
      formId:state.form.id,
      data:collectData(),
      location:state.gps,
      photos:state.photos,
      user:{email:u?.email||""},
      clientTimestamp:new Date().toISOString(),
      startedAt:state.startedAt,
      website:$("publicWebsite")?.value||""
    };
    try{
      let result;
      if(publicMode){
        const r=await fetch("/api/submissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        result=await r.json();
        if(!r.ok)throw new Error(result.error||"No se pudo guardar la respuesta.");
      }else if(location.hostname.endsWith("github.io")){
        const id="PREVIEW-"+Date.now(),saved=JSON.parse(localStorage.getItem("fibrazoFormsPreview")||"[]");
        saved.unshift({id,...payload});localStorage.setItem("fibrazoFormsPreview",JSON.stringify(saved.slice(0,100)));result={id,queued:false};
      }else if(window.FIBRAZO_OFFLINE){
        payload.clientSubmissionId=window.FIBRAZO_OFFLINE.createSubmissionId(state.form.id);
        result=await window.FIBRAZO_OFFLINE.submit(payload);
      }else{
        const token=await u.getIdToken();
        const r=await fetch("/api/submissions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(payload)});
        result=await r.json();
        if(!r.ok)throw new Error(result.error||"No se pudo guardar la respuesta.");
      }

      $("reviewWorkspace").hidden=true;$("formWorkspace").hidden=true;$("successWorkspace").hidden=false;
      $("successId").textContent=result.id||"—";
      $("successEmail").textContent=u?.email||(publicMode?"Formulario público":"");
      const title=$("successTitle"),message=$("successMessage"),icon=document.querySelector(".success-icon");
      if(result.queued){
        if(title)title.textContent="Guardado para sincronizar";
        if(message)message.textContent="La respuesta quedó segura en este dispositivo. Se enviará automáticamente cuando vuelva la conexión.";
        if(icon)icon.textContent="↻";
      }else{
        if(title)title.textContent="Formulario completado con éxito";
        if(message)message.textContent="La información fue guardada correctamente.";
        if(icon)icon.textContent="✓";
      }
      window.FIBRAZO_OFFLINE?.refreshUi?.();
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){
      setStatus(e.message||"No se pudo guardar la respuesta.","error");
    }finally{btn.disabled=false;}
  }
  function collectData(){const d={};state.form.fields.forEach(f=>{if(f.type==="gps"||f.type==="photos"||!conditionMet(f))return;d[f.key]=fieldValue(f.key);});return d;}
  function setStatus(m,t){if(!$("saveStatus"))return;$("saveStatus").textContent=m;$("saveStatus").className="save-status"+(t?" "+t:"");}

  function captureGps(value,btn,key){
    if(!navigator.geolocation){value.textContent="GPS no disponible en este navegador.";return;}
    btn.disabled=true;btn.textContent="Obteniendo…";
    navigator.geolocation.getCurrentPosition(p=>{
      state.gps={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};
      let detected="";
      if(state.form?.id==="CHURN"&&key==="coordenadas"){
        detected=detectChurnCity(state.gps.lat,state.gps.lng);
        if(detected){
          const city=document.querySelector('[name="ciudad"]');
          if(city){city.value=detected;city.dispatchEvent(new Event("change",{bubbles:true}));}
        }
      }
      value.textContent=state.gps.lat.toFixed(6)+", "+state.gps.lng.toFixed(6)+" · ±"+Math.round(state.gps.accuracy)+" m"+(state.form?.id==="CHURN"?(detected?" · Ciudad: "+detected:" · Ciudad no identificada"):"");
      btn.disabled=false;btn.textContent="Actualizar ubicación";clearError(key);
    },()=>{
      value.textContent="No se pudo obtener la ubicación. Revisa el permiso del navegador.";
      btn.disabled=false;btn.textContent="Reintentar";
    },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  }

  function detectChurnCity(lat,lng){
    const cities=[
      {name:"Sincelejo",lat:9.3047,lng:-75.3978,maxKm:50},
      {name:"Montería",lat:8.7479,lng:-75.8814,maxKm:50}
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