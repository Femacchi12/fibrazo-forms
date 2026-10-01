(() => {
  const $=id=>document.getElementById(id),nav=$("adminNavButton"),view=$("adminView"),host=$("adminForms"),status=$("adminStatus");
  let items=[],openId=null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const current=()=>window.firebase?.auth?.().currentUser||null;
  async function tok(){const u=current();if(!u)throw new Error("AUTH_REQUIRED");return u.getIdToken();}
  function msg(t,type=""){status.textContent=t;status.className="save-status"+(type?" "+type:"");}
  function normalizeDomain(v){let d=String(v||"").trim().toLowerCase();if(!d)return"";return d.startsWith("@")?d:"@"+d;}

  function forceForms(){
    nav.hidden=true;view.hidden=true;host.innerHTML="";items=[];openId=null;
    if(window.FIBRAZO_SET_VIEW)window.FIBRAZO_SET_VIEW("forms");
  }

  async function load(){
    try{
      const r=await fetch("/api/admin",{headers:{Authorization:"Bearer "+await tok()},cache:"no-store"});
      if(r.status===403){forceForms();return;}
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo cargar administración.");
      nav.hidden=false;items=j.forms||[];render();
    }catch(_){forceForms();}
  }

  function switchRow(key,title,copy,checked,locked=false){
    return '<label class="permission-row '+(locked?"locked":"")+'"><div><strong>'+esc(title)+'</strong><small>'+esc(copy)+'</small></div>'+
      '<span class="switch"><input type="checkbox" data-field="'+key+'" '+(checked?"checked ":"")+(locked?"disabled ":"")+'><i></i></span></label>';
  }

  function summaryChips(f){
    const chips=['Interno FIBRAZO'];
    if(f.publicEnabled)chips.push('Público');
    if(f.domainsEnabled)chips.push((f.domains||[]).length+' dominio'+((f.domains||[]).length===1?'':'s'));
    if(f.emailsEnabled)chips.push((f.allowedEmails||[]).length+' correo'+((f.allowedEmails||[]).length===1?'':'s'));
    chips.push(f.collectEmail?'Correo verificado':'Anónimo');
    return chips.map(x=>'<span>'+esc(x)+'</span>').join("");
  }

  function render(){
    host.innerHTML="";
    items.forEach(f=>{
      const card=document.createElement("article");card.className="admin-form-card accordion";card.dataset.formId=f.id;
      card._domains=[...(f.domains||[])];card.dataset.savedPublic=String(!!f.publicEnabled);
      const publicUrl=location.origin+"/f/"+f.slug;
      card.innerHTML=
        '<button type="button" class="admin-accordion-head" data-toggle>'+
          '<div><span>'+esc(f.id)+'</span><h3>'+esc(f.name)+'</h3><p>'+esc(f.description)+'</p><div class="admin-summary-chips">'+summaryChips(f)+'</div></div>'+
          '<b class="accordion-chevron">⌄</b>'+
        '</button>'+
        '<div class="admin-accordion-body" hidden>'+
          '<section class="admin-config-section"><div class="admin-config-title"><span>ACCESO</span><h4>Quién puede completar este formulario</h4><p>El equipo FIBRAZO y los administradores siempre tienen acceso. Activa solo los accesos externos que necesites.</p></div>'+
            '<div class="permission-stack">'+
              switchRow("admins","Administradores","Acceso total y configuración. Siempre activo.",true,true)+
              switchRow("internal","Equipo FIBRAZO","Todos los usuarios @fibrazo.com pueden entrar al dashboard y completar el formulario.",true,true)+
              switchRow("publicEnabled","Enlace público","Permite responder desde el enlace directo. Puede ser anónimo o pedir correo, según la configuración inferior.",!!f.publicEnabled)+
              '<div class="permission-extra public-extra"><div class="public-link-state"></div><div class="admin-public-link"><input readonly value="'+esc(publicUrl)+'"><button type="button" class="secondary-button compact" data-copy>Copiar enlace</button></div><label class="inline-setting"><span>Límite por IP / 10 min</span><input data-field="rateLimit" type="number" min="1" max="100" value="'+esc(f.rateLimit)+'"></label></div>'+
              switchRow("domainsEnabled","Dominios adicionales","Da acceso al dashboard y a este formulario a usuarios de otros dominios.",!!f.domainsEnabled)+
              '<div class="permission-extra domain-extra"><div class="domain-list" data-domain-list></div><div class="domain-add"><input data-domain-input type="text" placeholder="@empresa.com"><button type="button" class="secondary-button compact" data-add-domain>Agregar dominio</button></div></div>'+
              switchRow("emailsEnabled","Correos específicos","Da acceso a este formulario a personas concretas fuera de FIBRAZO.",!!f.emailsEnabled)+
              '<div class="permission-extra email-extra"><textarea data-field="allowedEmails" placeholder="persona@empresa.com">'+esc((f.allowedEmails||[]).join("\n"))+'</textarea><small>Un correo por línea o separados por comas.</small></div>'+
            '</div>'+
          '</section>'+
          '<section class="admin-config-section"><div class="admin-config-title"><span>EXPERIENCIA</span><h4>Presentación y comportamiento</h4><p>Estas opciones afectan cómo ve y completa la encuesta cada persona.</p></div>'+
            '<div class="message-grid"><label><span>Mensaje inicial</span><textarea data-field="introMessage" placeholder="Mensaje opcional al iniciar la encuesta">'+esc(f.introMessage||"")+'</textarea></label>'+
            '<label><span>Mensaje final</span><textarea data-field="completionMessage" placeholder="Mensaje después de enviar">'+esc(f.completionMessage||"")+'</textarea></label></div>'+
            '<div class="permission-stack compact-stack">'+
              switchRow("collectEmail","Recopilar correo verificado","Si está activo, el correo de Google se muestra durante la encuesta y se guarda con la respuesta. Si está apagado, la respuesta es anónima.",!!f.collectEmail)+
              switchRow("shuffleQuestions","Aleatorizar preguntas","Cambia el orden de las preguntas dentro de cada sección, manteniendo juntas las preguntas condicionales.",!!f.shuffleQuestions)+
              switchRow("showProgress","Mostrar progreso","Muestra secciones y avance durante la encuesta.",!!f.showProgress)+
              switchRow("allowMultipleResponses","Permitir múltiples respuestas","Si se recopila correo, permite que una misma cuenta responda más de una vez.",!!f.allowMultipleResponses)+
            '</div>'+
          '</section>'+
          '<section class="admin-config-section"><div class="admin-config-title"><span>EVIDENCIA</span><h4>Límites de archivos</h4></div><div class="admin-grid limits-grid">'+
            '<label><span>Máximo de fotos</span><input data-field="maxPhotos" type="number" min="0" max="3" value="'+esc(f.maxPhotos)+'"></label>'+
            '<label><span>Máximo por foto (MB)</span><input data-field="maxPhotoMb" type="number" min=".25" max="2" step=".25" value="'+esc(f.maxPhotoMb)+'"></label>'+
          '</div></section>'+
          '<div class="admin-card-actions"><small>Última configuración guardada: '+esc(f.updatedAt||"—")+(f.updatedBy?" · "+esc(f.updatedBy):"")+'</small><button type="button" class="primary-button" data-save>Guardar configuración</button></div>'+
        '</div>';

      card.querySelector("[data-toggle]").addEventListener("click",()=>toggleCard(card));
      card.querySelectorAll('input[data-field],textarea[data-field]').forEach(el=>el.addEventListener("input",()=>{markDirty(card);refresh(card);}));
      card.querySelectorAll('input[type="checkbox"][data-field]').forEach(el=>el.addEventListener("change",()=>{markDirty(card);refresh(card);}));
      card.querySelector("[data-add-domain]").addEventListener("click",()=>addDomain(card));
      card.querySelector("[data-domain-input]").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addDomain(card);}});
      card.querySelector("[data-copy]").addEventListener("click",()=>copyLink(card));
      card.querySelector("[data-save]").addEventListener("click",()=>save(card));
      renderDomains(card);refresh(card);host.appendChild(card);
      if(openId===f.id)openCard(card);
    });
  }

  function toggleCard(card){
    const isOpen=!card.querySelector(".admin-accordion-body").hidden;
    document.querySelectorAll(".admin-form-card.accordion").forEach(closeCard);
    if(!isOpen){openId=card.dataset.formId;openCard(card);}else openId=null;
  }
  function openCard(card){card.classList.add("open");card.querySelector(".admin-accordion-body").hidden=false;}
  function closeCard(card){card.classList.remove("open");card.querySelector(".admin-accordion-body").hidden=true;}

  function renderDomains(card){
    const list=card.querySelector("[data-domain-list]");list.innerHTML="";
    (card._domains||[]).forEach(domain=>{
      const chip=document.createElement("span");chip.className="domain-chip";
      chip.innerHTML='<b>'+esc(domain)+'</b><button type="button" aria-label="Quitar '+esc(domain)+'">×</button>';
      chip.querySelector("button").addEventListener("click",()=>{card._domains=card._domains.filter(d=>d!==domain);renderDomains(card);markDirty(card);});
      list.appendChild(chip);
    });
    if(!(card._domains||[]).length)list.innerHTML='<span class="domain-empty">Sin dominios adicionales.</span>';
  }

  function addDomain(card){
    const input=card.querySelector("[data-domain-input]"),d=normalizeDomain(input.value);
    if(!d)return;
    if(!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)){msg("Ingresa un dominio válido, por ejemplo @empresa.com.","error");return;}
    if(!card._domains.includes(d))card._domains.push(d);
    input.value="";renderDomains(card);markDirty(card);
  }

  function markDirty(card){card.classList.add("dirty");}

  function refresh(card){
    const val=k=>!!card.querySelector('[data-field="'+k+'"]')?.checked;
    const publicOn=val("publicEnabled"),domainsOn=val("domainsEnabled"),emailsOn=val("emailsEnabled"),collect=val("collectEmail");
    card.querySelector(".public-extra").hidden=!publicOn;
    card.querySelector(".domain-extra").hidden=!domainsOn;
    card.querySelector(".email-extra").hidden=!emailsOn;
    const saved=card.dataset.savedPublic==="true",state=card.querySelector(".public-link-state");
    state.className="public-link-state "+(saved?"active":"inactive");
    if(saved)state.innerHTML='<b>● ENLACE PÚBLICO ACTIVO</b><span>El enlace guardado acepta respuestas.</span>';
    else if(publicOn)state.innerHTML='<b>○ PENDIENTE DE ACTIVAR</b><span>Presiona Guardar configuración para habilitar el enlace.</span>';
    else state.innerHTML='<b>○ ENLACE PÚBLICO DESACTIVADO</b><span>El enlace no acepta respuestas.</span>';
    card.querySelector("[data-copy]").disabled=!saved;
    const multiple=card.querySelector('[data-field="allowMultipleResponses"]');
    if(multiple)multiple.closest(".permission-row").classList.toggle("not-applicable",!collect);
  }

  async function copyLink(card){
    if(card.dataset.savedPublic!=="true")return;
    const input=card.querySelector(".admin-public-link input");
    try{await navigator.clipboard.writeText(input.value);msg("Enlace público copiado.","success");}
    catch(_){input.select();document.execCommand("copy");}
  }

  async function save(card){
    const checkbox=k=>!!card.querySelector('[data-field="'+k+'"]')?.checked;
    const value=k=>card.querySelector('[data-field="'+k+'"]')?.value??"";
    if(checkbox("domainsEnabled")&&!card._domains.length){msg("Agrega al menos un dominio adicional o desactiva esa opción.","error");return;}
    if(checkbox("emailsEnabled")&&!value("allowedEmails").trim()){msg("Agrega al menos un correo específico o desactiva esa opción.","error");return;}
    const btn=card.querySelector("[data-save]");btn.disabled=true;msg("Guardando configuración…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        formId:card.dataset.formId,publicEnabled:checkbox("publicEnabled"),domainsEnabled:checkbox("domainsEnabled"),emailsEnabled:checkbox("emailsEnabled"),
        domains:card._domains,allowedEmails:value("allowedEmails"),introMessage:value("introMessage"),completionMessage:value("completionMessage"),
        collectEmail:checkbox("collectEmail"),shuffleQuestions:checkbox("shuffleQuestions"),showProgress:checkbox("showProgress"),
        allowMultipleResponses:checkbox("allowMultipleResponses"),rateLimit:value("rateLimit"),maxPhotos:value("maxPhotos"),maxPhotoMb:value("maxPhotoMb")
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo guardar.");
      const i=items.findIndex(x=>x.id===j.form.id);if(i>=0)items[i]=j.form;
      openId=card.dataset.formId;render();msg("Configuración guardada correctamente.","success");
    }catch(e){msg(e.message||"No se pudo guardar.","error");}
    finally{btn.disabled=false;}
  }

  nav.addEventListener("click",()=>load());
  window.firebase?.auth?.().onAuthStateChanged(u=>{if(u)setTimeout(load,150);else forceForms();});
})();