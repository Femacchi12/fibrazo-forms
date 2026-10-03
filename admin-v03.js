(() => {
  const $=id=>document.getElementById(id);
  const nav=$("adminNavButton"),view=$("adminView"),host=$("adminForms"),globalHost=$("adminGlobal"),status=$("adminStatus");
  let items=[],admins=[],openId=null,adminMeta={baseAdmin:false,canCreateForms:false,canManageUsers:false};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const current=()=>window.firebase?.auth?.().currentUser||null;
  async function tok(){const u=current();if(!u)throw new Error("AUTH_REQUIRED");return u.getIdToken();}
  function msg(t,type=""){status.textContent=t;status.className="save-status"+(type?" "+type:"");}
  function normalizeDomain(v){let d=String(v||"").trim().toLowerCase();if(!d)return"";return d.startsWith("@")?d:"@"+d;}
  function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());}

  function forceForms(){
    nav.hidden=true;view.hidden=true;host.innerHTML="";if(globalHost)globalHost.innerHTML="";
    items=[];admins=[];openId=null;adminMeta={baseAdmin:false,canCreateForms:false,canManageUsers:false};
    if(window.FIBRAZO_SET_VIEW)window.FIBRAZO_SET_VIEW("forms");
  }

  async function load(){
    try{
      const r=await fetch("/api/admin",{headers:{Authorization:"Bearer "+await tok()},cache:"no-store"});
      if(r.status===403){forceForms();return;}
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo cargar administración.");
      nav.hidden=false;items=j.forms||[];admins=j.admins||[];adminMeta={baseAdmin:!!j.baseAdmin,canCreateForms:!!j.canCreateForms,canManageUsers:!!j.canManageUsers};renderGlobal();renderForms();
    }catch(_){forceForms();}
  }

  function renderGlobal(){
    if(!globalHost)return;
    if(!adminMeta.canManageUsers){
      globalHost.hidden=true;globalHost.innerHTML="";return;
    }
    globalHost.hidden=false;
    const rows=admins.map(a=>{
      const permissionMap=Object.fromEntries((a.permissions||[]).map(p=>[p.formId,p]));
      const formRows=items.map(f=>{
        const p=permissionMap[f.id]||{canView:false,canEditForm:false,canManagePermissions:false,canViewDatabase:false};
        const disabled=a.base?" disabled":"";
        return '<div class="admin-permission-row" data-permission-row data-email="'+esc(a.email)+'" data-form-id="'+esc(f.id)+'">'+
          '<div class="admin-permission-form"><strong>'+esc(f.name)+'</strong><small>'+esc(f.id)+'</small></div>'+
          '<label title="Puede ver y abrir este formulario"><input type="checkbox" data-perm="canView" '+(p.canView?"checked ":"")+disabled+'> Ver</label>'+
          '<label title="Puede editar estado, experiencia y evidencia del formulario; no modifica las preguntas."><input type="checkbox" data-perm="canEditForm" '+(p.canEditForm?"checked ":"")+disabled+'> Editar configuración</label>'+
          '<label title="Puede modificar accesos, publicación y permisos del formulario"><input type="checkbox" data-perm="canManagePermissions" '+(p.canManagePermissions?"checked ":"")+disabled+'> Permisos</label>'+
          '<label title="Puede abrir directamente la hoja donde se guardan las respuestas"><input type="checkbox" data-perm="canViewDatabase" '+(p.canViewDatabase?"checked ":"")+disabled+'> Base</label>'+
        '</div>';
      }).join("");
      return '<details class="admin-person-permissions" '+(a.base?"":"")+'>'+
        '<summary><div><strong>'+esc(a.email)+'</strong><small>'+(a.base?"Administrador base":"Administrador por permisos")+'</small></div>'+
          (a.base?'<span class="base-badge">BASE</span>':'<span class="count-badge">'+(a.permissions||[]).filter(p=>p.canView).length+' formularios</span>')+
        '</summary>'+
        '<div class="admin-person-permission-body">'+
          '<label class="compact-toggle-row admin-create-toggle"><div><strong>Crear formularios</strong><small>Habilita la creación de nuevos formularios desde el dashboard cuando el constructor esté disponible.</small></div><span class="switch"><input type="checkbox" data-user-create="'+esc(a.email)+'" '+(a.canCreateForms?"checked ":"")+(a.base?"disabled":"")+'><i></i></span></label>'+
          '<div class="admin-permission-grid">'+formRows+'</div>'+
          (a.base?"":'<button type="button" class="icon-action danger" data-remove-admin="'+esc(a.email)+'">Quitar administrador</button>')+
        '</div>'+
      '</details>';
    }).join("");

    globalHost.innerHTML=
      '<details class="admin-system-card" open>'+
        '<summary><div><span>ADMINISTRADORES</span><strong>Permisos por formulario</strong></div><div class="summary-right"><b>'+admins.length+' activos</b><i>⌄</i></div></summary>'+
        '<div class="admin-system-body">'+
          '<div class="admin-list-compact admin-permission-list">'+rows+'</div>'+
          '<div class="compact-add-row"><input id="newAdminEmail" type="email" placeholder="nuevo.admin@empresa.com"><button id="addAdminButton" type="button" class="secondary-button compact">Agregar administrador</button></div>'+
          '<small>Agregar un administrador no le otorga acceso automático. Después eliges formulario por formulario qué puede ver, editar en la configuración, administrar y si puede abrir la base de datos.</small>'+
        '</div>'+
      '</details>';

    globalHost.querySelector("#addAdminButton")?.addEventListener("click",addAdmin);
    globalHost.querySelector("#newAdminEmail")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addAdmin();}});
    globalHost.querySelectorAll("[data-remove-admin]").forEach(btn=>btn.addEventListener("click",()=>removeAdmin(btn.dataset.removeAdmin)));
    globalHost.querySelectorAll("[data-user-create]").forEach(input=>input.addEventListener("change",()=>updateUserSetting(input.dataset.userCreate,input.checked)));
    globalHost.querySelectorAll("[data-permission-row] input[data-perm]").forEach(input=>input.addEventListener("change",()=>updateFormPermission(input.closest("[data-permission-row]"))));
  }
  async function adminMutation(action,email){
    const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({adminAction:action,email})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo actualizar administradores.");
    admins=j.admins||[];renderGlobal();
  }
  async function updateUserSetting(email,canCreateForms){
    const currentAdmin=admins.find(a=>a.email===email);
    msg("Actualizando permisos de usuario…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        userSettingsAction:"set",email,canCreateForms,canManageUsers:!!currentAdmin?.canManageUsers
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo actualizar el usuario.");
      admins=j.admins||[];renderGlobal();msg("Permiso global actualizado.","success");
    }catch(e){msg(e.message||"No se pudo actualizar.","error");renderGlobal();}
  }

  async function updateFormPermission(row){
    if(!row)return;
    const email=row.dataset.email,formId=row.dataset.formId;
    const read=key=>!!row.querySelector('[data-perm="'+key+'"]')?.checked;
    let canView=read("canView"),canEditForm=read("canEditForm"),canManagePermissions=read("canManagePermissions"),canViewDatabase=read("canViewDatabase");
    if(canEditForm||canManagePermissions||canViewDatabase)canView=true;
    if(canManagePermissions)canViewDatabase=true;
    msg("Actualizando permiso de "+formId+"…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        permissionAction:"set",email,formId,canView,canEditForm,canManagePermissions,canViewDatabase
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo actualizar el permiso.");
      admins=j.admins||[];renderGlobal();msg("Permisos de "+formId+" actualizados.","success");
    }catch(e){msg(e.message||"No se pudo actualizar.","error");renderGlobal();}
  }

  async function addAdmin(){
    const input=globalHost?.querySelector("#newAdminEmail"),email=String(input?.value||"").trim().toLowerCase();
    if(!validEmail(email)){msg("Ingresa un correo válido para el nuevo administrador.","error");return;}
    msg("Agregando administrador…");
    try{await adminMutation("add",email);msg("Administrador agregado correctamente.","success");}
    catch(e){msg(e.message||"No se pudo agregar.","error");}
  }
  async function removeAdmin(email){
    msg("Actualizando administradores…");
    try{await adminMutation("remove",email);msg("Administrador desactivado.","success");}
    catch(e){msg(e.message||"No se pudo quitar.","error");}
  }

  function accessSummary(f){
    const parts=[];
    if(f.domains?.length)parts.push(f.domains.length+" dominio"+(f.domains.length===1?"":"s"));
    if(f.allowedEmails?.length)parts.push(f.allowedEmails.length+" correo"+(f.allowedEmails.length===1?"":"s"));
    if(f.publicEnabled)parts.push("público");
    if(!parts.length)parts.push("solo administradores");
    return parts.join(" · ");
  }
  function experienceSummary(f){
    const parts=[f.collectEmail?"correo verificado":"anónimo"];
    if(f.shuffleQuestions)parts.push("orden aleatorio");
    if(f.showProgress)parts.push("progreso");
    return parts.join(" · ");
  }

  function renderForms(){
    host.innerHTML=
      '<details class="admin-status-group active-group" open><summary><div><span>FORMULARIOS</span><strong>Activos</strong></div><b data-active-count></b></summary><div class="admin-status-list" data-active-list></div></details>'+
      '<details class="admin-status-group inactive-group"><summary><div><span>FORMULARIOS</span><strong>Inactivos</strong></div><b data-inactive-count></b></summary><div class="admin-status-list" data-inactive-list></div></details>';
    const activeList=host.querySelector("[data-active-list]");
    const inactiveList=host.querySelector("[data-inactive-list]");
    const activeItems=items.filter(f=>String(f.status).toLowerCase()==="activo");
    const inactiveItems=items.filter(f=>String(f.status).toLowerCase()!=="activo");
    host.querySelector("[data-active-count]").textContent=activeItems.length+" activo"+(activeItems.length===1?"":"s");
    host.querySelector("[data-inactive-count]").textContent=inactiveItems.length+" inactivo"+(inactiveItems.length===1?"":"s");

    items.forEach(f=>{
      const card=document.createElement("article");card.className="admin-form-card accordion compact";card.dataset.formId=f.id;
      card._domains=[...(f.domains||[])];card._emails=[...(f.allowedEmails||[])];card.dataset.savedPublic=String(!!f.publicEnabled);
      const publicUrl=location.origin+"/form/"+f.slug;
      const databaseHtml=f.canViewDatabase&&f.databaseUrl?'<a class="secondary-button compact admin-db-link" href="'+esc(f.databaseUrl)+'" target="_blank" rel="noopener">↗ Base de datos</a>':"";
      const isActive=String(f.status).toLowerCase()==="activo";
      card.dataset.savedStatus=isActive?"activo":"inactivo";
      card.innerHTML=
        '<button type="button" class="admin-accordion-head compact-head" data-toggle>'+
          '<div><span>'+esc(f.id)+'</span><h3>'+esc(f.name)+'</h3><div class="admin-summary-chips"><span class="form-status-chip '+(isActive?"active":"inactive")+'">'+(isActive?"Activo":"Inactivo")+'</span><span>'+esc(accessSummary(f))+'</span><span>'+esc(experienceSummary(f))+'</span></div></div>'+
          '<b class="accordion-chevron">⌄</b>'+
        '</button>'+
        '<div class="admin-accordion-body compact-body" hidden>'+
          '<div class="form-status-control" data-admin-scope="edit"><div><span>ESTADO</span><strong>Formulario '+(isActive?"activo":"inactivo")+'</strong><small>'+(isActive?"Acepta respuestas según los permisos configurados.":"Bloqueado para todos: usuarios, enlace público y administradores.")+'</small></div><label class="switch status-switch" title="Activar o desactivar formulario"><input type="checkbox" data-field="formActive" '+(isActive?"checked":"")+'><i></i></label></div>'+
          '<details class="admin-compact-section" data-admin-scope="permissions">'+
            '<summary><div><span>ACCESOS</span><strong>Dominios y correos autorizados</strong></div><b data-access-summary>'+esc(accessSummary(f).replace(" · público",""))+'</b></summary>'+
            '<div class="compact-section-body access-columns">'+
              '<div class="compact-permission-box"><div class="compact-box-head"><div><strong>Dominios autorizados</strong><small>Quien tenga un correo de estos dominios podrá entrar al dashboard y a este formulario.</small></div><span class="count-badge" data-domain-count>'+card._domains.length+'</span></div><div class="domain-list compact-list" data-domain-list></div><div class="compact-add-row"><input data-domain-input type="text" placeholder="@fibrazo.com"><button type="button" class="secondary-button compact" data-add-domain>Agregar</button></div></div>'+
              '<div class="compact-permission-box"><div class="compact-box-head"><div><strong>Correos específicos</strong><small>Autoriza personas puntuales sin habilitar todo su dominio.</small></div><span class="count-badge" data-email-count>'+card._emails.length+'</span></div><div class="email-chip-list compact-list" data-email-list></div><div class="compact-add-row"><input data-email-input type="email" placeholder="persona@empresa.com"><button type="button" class="secondary-button compact" data-add-email>Agregar</button></div></div>'+
            '</div>'+
          '</details>'+

          '<details class="admin-compact-section public-section" data-admin-scope="permissions">'+
            '<summary><div><span>PUBLICACIÓN</span><strong>Acceso por enlace</strong></div><b class="section-status" data-public-status></b></summary>'+
            '<div class="compact-section-body">'+
              '<label class="compact-toggle-row"><div><strong>Permitir acceso por enlace</strong><small>Usa siempre este mismo enlace. Si habilitas acceso público, cualquiera con el enlace podrá responder; si lo deshabilitas, exigirá inicio de sesión y permisos.</small></div><span class="switch"><input type="checkbox" data-field="publicEnabled" '+(f.publicEnabled?"checked":"")+'><i></i></span></label>'+
              '<div class="compact-public-row" data-public-details><input readonly value="'+esc(publicUrl)+'"><button type="button" class="secondary-button compact" data-copy>Copiar</button><label><span>Límite / 10 min</span><input data-field="rateLimit" type="number" min="1" max="100" value="'+esc(f.rateLimit)+'"></label></div>'+
              '<div class="public-link-state compact-state"></div>'+
            '</div>'+
          '</details>'+

          '<details class="admin-compact-section" data-admin-scope="edit">'+
            '<summary><div><span>EXPERIENCIA</span><strong>Presentación y comportamiento</strong></div><b>'+esc(experienceSummary(f))+'</b></summary>'+
            '<div class="compact-section-body">'+
              '<details class="nested-config"><summary>Mensajes de la encuesta</summary><div class="message-grid compact-messages"><label><span>Mensaje inicial</span><textarea data-field="introMessage" placeholder="Mensaje opcional al iniciar">'+esc(f.introMessage||"")+'</textarea></label><label><span>Mensaje final</span><textarea data-field="completionMessage" placeholder="Mensaje después de enviar">'+esc(f.completionMessage||"")+'</textarea></label></div></details>'+
              '<div class="compact-toggle-grid">'+
                toggleRow("collectEmail","Recopilar correo verificado","Muestra y guarda el correo de Google.",!!f.collectEmail)+
                toggleRow("shuffleQuestions","Aleatorizar preguntas","Cambia el orden dentro de cada sección.",!!f.shuffleQuestions)+
                toggleRow("showProgress","Mostrar progreso","Muestra etapas y avance.",!!f.showProgress)+
                toggleRow("allowMultipleResponses","Múltiples respuestas","Permite responder más de una vez con la misma cuenta.",!!f.allowMultipleResponses)+
              '</div>'+
            '</div>'+
          '</details>'+

          '<details class="admin-compact-section" data-admin-scope="edit">'+
            '<summary><div><span>EVIDENCIA</span><strong>Fotos y archivos</strong></div><b data-evidence-summary>'+photoSummary(f.maxPhotos,f.maxPhotoMb)+'</b></summary>'+
            '<div class="compact-section-body evidence-row"><label><span>Máximo de fotos</span><input data-field="maxPhotos" type="number" min="0" max="3" value="'+esc(Number.isFinite(f.maxPhotos)?f.maxPhotos:3)+'"><small data-photo-state></small></label><label data-photo-size><span>Máximo por foto (MB)</span><input data-field="maxPhotoMb" type="number" min=".25" max="2" step=".25" value="'+esc(f.maxPhotoMb)+'"></label></div>'+
          '</details>'+

          '<div class="admin-card-actions compact-actions"><small>Última actualización: '+esc(f.updatedAt||"—")+(f.updatedBy?" · "+esc(f.updatedBy):"")+'</small>'+databaseHtml+'<button type="button" class="primary-button compact-save" data-save>Guardar cambios</button></div>'+
        '</div>';

      card.querySelectorAll('[data-admin-scope="permissions"]').forEach(el=>{el.hidden=!f.canManagePermissions;});
      card.querySelectorAll('[data-admin-scope="edit"]').forEach(el=>{el.hidden=!f.canEditForm;});
      const saveButton=card.querySelector("[data-save]");
      if(saveButton)saveButton.hidden=!(f.canEditForm||f.canManagePermissions);
      card.querySelector("[data-toggle]").addEventListener("click",()=>toggleCard(card));
      card.querySelectorAll('input[data-field],textarea[data-field]').forEach(el=>el.addEventListener("input",()=>{markDirty(card);refresh(card);}));
      card.querySelectorAll('input[type="checkbox"][data-field]').forEach(el=>el.addEventListener("change",()=>{markDirty(card);refresh(card);}));
      card.querySelector("[data-add-domain]").addEventListener("click",()=>addDomain(card));
      card.querySelector("[data-domain-input]").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addDomain(card);}});
      card.querySelector("[data-add-email]").addEventListener("click",()=>addEmail(card));
      card.querySelector("[data-email-input]").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addEmail(card);}});
      card.querySelector("[data-copy]").addEventListener("click",()=>copyLink(card));
      card.querySelector("[data-save]").addEventListener("click",()=>save(card));
      renderDomains(card);renderEmails(card);refresh(card);
      (isActive?activeList:inactiveList).appendChild(card);
      if(openId===f.id){
        openCard(card);
        (isActive?host.querySelector(".active-group"):host.querySelector(".inactive-group")).open=true;
      }
    });
  }

  function toggleRow(key,title,copy,checked){
    return '<label class="compact-toggle-row"><div><strong>'+esc(title)+'</strong><small>'+esc(copy)+'</small></div><span class="switch"><input type="checkbox" data-field="'+key+'" '+(checked?"checked":"")+'><i></i></span></label>';
  }
  function photoSummary(count,mb){
    const n=Number(count||0);return n===0?"Fotos desactivadas":n+" foto"+(n===1?"":"s")+" · "+String(mb||1.5).replace(".",",")+" MB";
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
    card._domains.forEach(domain=>{
      const chip=document.createElement("span");chip.className="domain-chip";
      chip.innerHTML='<b>'+esc(domain)+'</b><button type="button" aria-label="Quitar '+esc(domain)+'">×</button>';
      chip.querySelector("button").addEventListener("click",()=>{card._domains=card._domains.filter(d=>d!==domain);renderDomains(card);markDirty(card);refresh(card);});
      list.appendChild(chip);
    });
    if(!card._domains.length)list.innerHTML='<span class="domain-empty">Sin dominios autorizados.</span>';
    const count=card.querySelector("[data-domain-count]");if(count)count.textContent=String(card._domains.length);
  }
  function renderEmails(card){
    const list=card.querySelector("[data-email-list]");list.innerHTML="";
    card._emails.forEach(email=>{
      const chip=document.createElement("span");chip.className="domain-chip email-chip";
      chip.innerHTML='<b>'+esc(email)+'</b><button type="button" aria-label="Quitar '+esc(email)+'">×</button>';
      chip.querySelector("button").addEventListener("click",()=>{card._emails=card._emails.filter(v=>v!==email);renderEmails(card);markDirty(card);refresh(card);});
      list.appendChild(chip);
    });
    if(!card._emails.length)list.innerHTML='<span class="domain-empty">Sin correos específicos.</span>';
    const count=card.querySelector("[data-email-count]");if(count)count.textContent=String(card._emails.length);
  }
  function addDomain(card){
    const input=card.querySelector("[data-domain-input]"),d=normalizeDomain(input.value);
    if(!d)return;
    if(!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)){msg("Ingresa un dominio válido, por ejemplo @fibrazo.com.","error");return;}
    if(!card._domains.includes(d))card._domains.push(d);
    input.value="";renderDomains(card);markDirty(card);refresh(card);
  }
  function addEmail(card){
    const input=card.querySelector("[data-email-input]"),email=String(input.value||"").trim().toLowerCase();
    if(!validEmail(email)){msg("Ingresa un correo válido.","error");return;}
    if(!card._emails.includes(email))card._emails.push(email);
    input.value="";renderEmails(card);markDirty(card);refresh(card);
  }
  function markDirty(card){card.classList.add("dirty");}

  function refresh(card){
    const activeNow=!!card.querySelector('[data-field="formActive"]')?.checked;
    const savedActive=card.dataset.savedStatus==="activo";
    const statusBox=card.querySelector(".form-status-control");
    if(statusBox){
      statusBox.classList.toggle("inactive",!activeNow);
      const strong=statusBox.querySelector("strong"),small=statusBox.querySelector("small");
      if(strong)strong.textContent=activeNow?"Formulario activo":"Formulario inactivo";
      if(small)small.textContent=activeNow
        ?(savedActive?"Acepta respuestas según los permisos configurados.":"Se activará cuando guardes los cambios.")
        :(savedActive?"Seguirá activo hasta que guardes este cambio.":"Bloqueado para todos: usuarios, enlace público y administradores.");
    }

    const publicOn=!!card.querySelector('[data-field="publicEnabled"]')?.checked;
    const saved=card.dataset.savedPublic==="true";
    const statusEl=card.querySelector("[data-public-status]");
    const state=card.querySelector(".public-link-state");
    const details=card.querySelector("[data-public-details]");
    if(statusEl){
      if(!activeNow){
        statusEl.textContent=publicOn?"Configurado · formulario inactivo":"Desactivado";
        statusEl.className="section-status inactive";
      }else{
        statusEl.textContent=saved?(publicOn?"Activo":"Activo · cambio pendiente"):(publicOn?"Pendiente":"Desactivado");
        statusEl.className="section-status "+(saved?"active":publicOn?"pending":"");
      }
    }
    if(state){
      if(!activeNow&&publicOn)state.textContent="El enlace está configurado, pero no acepta respuestas mientras el formulario esté inactivo.";
      else if(saved&&publicOn)state.textContent="El enlace está activo y acepta respuestas.";
      else if(saved&&!publicOn)state.textContent="El enlace sigue activo hasta que guardes este cambio.";
      else if(!saved&&publicOn)state.textContent="El enlace se activará al guardar.";
      else state.textContent="El enlace público está desactivado.";
    }
    if(details)details.classList.toggle("muted",!saved&&!publicOn);
    card.querySelector("[data-copy]").disabled=!saved;

    const access=card.querySelector("[data-access-summary]");
    if(access){
      const p=[];if(card._domains.length)p.push(card._domains.length+" dominio"+(card._domains.length===1?"":"s"));
      if(card._emails.length)p.push(card._emails.length+" correo"+(card._emails.length===1?"":"s"));
      access.textContent=p.length?p.join(" · "):"Sin accesos autorizados";
    }

    const collect=!!card.querySelector('[data-field="collectEmail"]')?.checked;
    const multiple=card.querySelector('[data-field="allowMultipleResponses"]');
    if(multiple)multiple.closest(".compact-toggle-row").classList.toggle("not-applicable",!collect);

    const photoInput=card.querySelector('[data-field="maxPhotos"]');
    const photoSize=card.querySelector("[data-photo-size]");
    const photoState=card.querySelector("[data-photo-state]");
    const evidence=card.querySelector("[data-evidence-summary]");
    const count=Math.max(0,Math.min(3,Number(photoInput?.value||0)));
    const mb=card.querySelector('[data-field="maxPhotoMb"]')?.value||1.5;
    if(photoSize)photoSize.hidden=count===0;
    if(photoState)photoState.textContent=count===0?"Fotos desactivadas.":"Hasta "+count+" foto"+(count===1?"":"s")+".";
    if(evidence)evidence.textContent=photoSummary(count,mb);
  }

  async function copyLink(card){
    if(card.dataset.savedPublic!=="true")return;
    const input=card.querySelector(".compact-public-row input");
    try{await navigator.clipboard.writeText(input.value);msg("Enlace público copiado.","success");}
    catch(_){input.select();document.execCommand("copy");}
  }

  async function save(card){
    const checkbox=k=>!!card.querySelector('[data-field="'+k+'"]')?.checked;
    const value=k=>card.querySelector('[data-field="'+k+'"]')?.value??"";
    const btn=card.querySelector("[data-save]");btn.disabled=true;msg("Guardando configuración…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        formId:card.dataset.formId,status:checkbox("formActive")?"Activo":"Inactivo",publicEnabled:checkbox("publicEnabled"),domains:card._domains,allowedEmails:card._emails,
        introMessage:value("introMessage"),completionMessage:value("completionMessage"),collectEmail:checkbox("collectEmail"),
        shuffleQuestions:checkbox("shuffleQuestions"),showProgress:checkbox("showProgress"),allowMultipleResponses:checkbox("allowMultipleResponses"),
        rateLimit:value("rateLimit"),maxPhotos:value("maxPhotos"),maxPhotoMb:value("maxPhotoMb")
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo guardar.");
      const i=items.findIndex(x=>x.id===j.form.id);if(i>=0)items[i]=j.form;
      openId=card.dataset.formId;renderForms();msg("Configuración guardada correctamente.","success");
    }catch(e){msg(e.message||"No se pudo guardar.","error");}
    finally{btn.disabled=false;}
  }

  nav.addEventListener("click",()=>load());
  window.firebase?.auth?.().onAuthStateChanged(u=>{if(u)setTimeout(load,150);else forceForms();});
})();