(() => {
  const $=id=>document.getElementById(id),nav=$("adminNavButton"),view=$("adminView"),host=$("adminForms"),status=$("adminStatus");
  let items=[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const labels={PRIVADO:"Privado",CORREOS:"Correos específicos",DOMINIO:"Dominios",PUBLICO:"Público"};
  const descriptions={
    PRIVADO:"Solo los administradores pueden abrir y responder este formulario.",
    CORREOS:"Solo los administradores y los correos que agregues aquí pueden entrar al dashboard para este formulario.",
    DOMINIO:"Los usuarios de los dominios configurados pueden entrar al dashboard y ver este formulario. Puedes agregar más de un dominio.",
    PUBLICO:"Cualquier persona con el enlace puede responder sin login. Este modo no da acceso al dashboard ni a los resultados."
  };
  const current=()=>window.firebase?.auth?.().currentUser||null;
  async function tok(){const u=current();if(!u)throw new Error("AUTH_REQUIRED");return u.getIdToken();}
  function msg(t,type=""){status.textContent=t;status.className="save-status"+(type?" "+type:"");}
  function option(mode,selected){return '<option value="'+mode+'" '+(selected===mode?"selected":"")+'>'+esc(labels[mode])+'</option>';}
  function normalizeDomain(v){let d=String(v||"").trim().toLowerCase();if(!d)return"";return d.startsWith("@")?d:"@"+d;}

  function forceForms(){
    nav.hidden=true;
    view.hidden=true;
    host.innerHTML="";
    items=[];
    if(window.FIBRAZO_SET_VIEW)window.FIBRAZO_SET_VIEW("forms");
  }

  async function load(){
    try{
      const r=await fetch("/api/admin",{headers:{Authorization:"Bearer "+await tok()}});
      if(r.status===403){forceForms();return;}
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo cargar administración.");
      nav.hidden=false;items=j.forms||[];render();
    }catch(_){forceForms();}
  }

  function renderDomains(card){
    const list=card.querySelector("[data-domain-list]");
    list.innerHTML="";
    (card._domains||[]).forEach(domain=>{
      const chip=document.createElement("span");chip.className="domain-chip";
      chip.innerHTML='<b>'+esc(domain)+'</b><button type="button" aria-label="Quitar '+esc(domain)+'">×</button>';
      chip.querySelector("button").addEventListener("click",()=>{card._domains=card._domains.filter(d=>d!==domain);renderDomains(card);markDirty(card);});
      list.appendChild(chip);
    });
    if(!(card._domains||[]).length)list.innerHTML='<span class="domain-empty">No hay dominios cargados.</span>';
  }

  function addDomain(card){
    const input=card.querySelector("[data-domain-input]");
    const d=normalizeDomain(input.value);
    if(!d)return;
    if(!/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)){msg("Ingresa un dominio válido, por ejemplo @fibrazo.com.","error");return;}
    if(!card._domains.includes(d))card._domains.push(d);
    input.value="";renderDomains(card);markDirty(card);
  }

  function render(){
    host.innerHTML="";
    items.forEach(f=>{
      const card=document.createElement("article");card.className="admin-form-card";card.dataset.formId=f.id;card.dataset.savedAccess=f.access;
      card._domains=(f.domains?.length?f.domains:[f.domain||"@fibrazo.com"]).map(normalizeDomain).filter(Boolean);
      const publicUrl=location.origin+"/f/"+f.slug;
      card.innerHTML=
        '<div class="admin-form-title"><div><span>'+esc(f.id)+'</span><h3>'+esc(f.name)+'</h3><p>'+esc(f.description)+'</p></div>'+
        '<div class="access-pill access-'+esc(f.access.toLowerCase())+'">'+esc(labels[f.access]||f.access)+'</div></div>'+
        '<div class="admin-access-state"><div class="state-dot"></div><div><strong data-state-title></strong><p data-state-copy></p></div></div>'+
        '<div class="admin-grid">'+
          '<label class="full"><span>Tipo de acceso</span><select data-field="access">'+["PRIVADO","CORREOS","DOMINIO","PUBLICO"].map(m=>option(m,f.access)).join("")+'</select><small>Elige una sola modalidad. Los administradores siempre conservan acceso.</small></label>'+
          '<div class="admin-domain full"><span class="admin-field-label">Dominios permitidos</span><div class="domain-list" data-domain-list></div><div class="domain-add"><input data-domain-input type="text" placeholder="@empresa.com"><button type="button" class="secondary-button compact" data-add-domain>Agregar dominio</button></div><small>Puedes agregar varios dominios. Ej.: @fibrazo.com, @aliado.com.</small></div>'+
          '<label class="admin-emails full"><span>Correos permitidos</span><textarea data-field="allowedEmails">'+esc((f.allowedEmails||[]).join("\n"))+'</textarea><small>Un correo por línea o separados por comas.</small></label>'+
          '<label class="admin-rate"><span>Límite público / 10 min</span><input data-field="rateLimit" type="number" min="1" max="100" value="'+esc(f.rateLimit)+'"><small>Solo aplica cuando el formulario está Público.</small></label>'+
          '<label><span>Máximo de fotos</span><input data-field="maxPhotos" type="number" min="0" max="3" value="'+esc(f.maxPhotos)+'"></label>'+
          '<label><span>Máximo por foto (MB)</span><input data-field="maxPhotoMb" type="number" min=".25" max="2" step=".25" value="'+esc(f.maxPhotoMb)+'"></label>'+
        '</div>'+
        '<div class="admin-public-link"><div class="public-link-head"><div><span data-public-title></span><small data-public-copy></small></div><b data-public-badge></b></div><div><input readonly value="'+esc(publicUrl)+'"><button type="button" class="secondary-button compact" data-copy>Copiar</button></div></div>'+
        '<div class="admin-card-actions"><small>Última configuración guardada: '+esc(f.updatedAt||"—")+(f.updatedBy?" · "+esc(f.updatedBy):"")+'</small><button type="button" class="primary-button" data-save>Guardar cambios</button></div>';

      card.querySelector('[data-field="access"]').addEventListener("change",()=>{refresh(card);markDirty(card);});
      card.querySelectorAll('input[data-field],textarea[data-field]').forEach(el=>el.addEventListener("input",()=>markDirty(card)));
      card.querySelector("[data-add-domain]").addEventListener("click",()=>addDomain(card));
      card.querySelector("[data-domain-input]").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addDomain(card);}});
      card.querySelector("[data-save]").addEventListener("click",()=>save(card));
      card.querySelector("[data-copy]").addEventListener("click",async()=>{
        if(card.dataset.savedAccess!=="PUBLICO")return;
        const input=card.querySelector(".admin-public-link input");
        try{await navigator.clipboard.writeText(input.value);msg("Enlace público copiado.","success");}
        catch(_){input.select();document.execCommand("copy");}
      });
      renderDomains(card);refresh(card);host.appendChild(card);
    });
  }

  function markDirty(card){
    card.classList.add("dirty");
    const title=card.querySelector("[data-state-title]");
    if(title)title.textContent="Cambio pendiente de guardar";
  }

  function refresh(card){
    const selected=card.querySelector('[data-field="access"]').value;
    const saved=card.dataset.savedAccess;
    card.querySelector(".admin-emails").hidden=selected!=="CORREOS";
    card.querySelector(".admin-domain").hidden=selected!=="DOMINIO";
    card.querySelector(".admin-rate").hidden=selected!=="PUBLICO";

    const state=card.querySelector(".admin-access-state");
    state.className="admin-access-state mode-"+selected.toLowerCase()+(card.classList.contains("dirty")?" pending":"");
    card.querySelector("[data-state-title]").textContent=card.classList.contains("dirty")?"Cambio pendiente de guardar":"Configuración activa: "+labels[saved];
    card.querySelector("[data-state-copy]").textContent=descriptions[selected];

    const publicPanel=card.querySelector(".admin-public-link");
    const active=saved==="PUBLICO";
    publicPanel.classList.toggle("active",active);
    publicPanel.classList.toggle("inactive",!active);
    card.querySelector("[data-public-title]").textContent=active?"Enlace público activo":"Enlace público desactivado";
    card.querySelector("[data-public-copy]").textContent=active?"Cualquier persona con este enlace puede responder sin login.":"Este enlace no acepta respuestas mientras el acceso guardado no sea Público.";
    const badge=card.querySelector("[data-public-badge]");badge.textContent=active?"ACTIVO":"DESACTIVADO";
    card.querySelector("[data-copy]").disabled=!active;
    card.querySelector(".admin-public-link input").disabled=!active;
  }

  async function save(card){
    const btn=card.querySelector("[data-save]"),val=n=>card.querySelector('[data-field="'+n+'"]')?.value??"";
    const access=val("access");
    if(access==="DOMINIO"&&!card._domains.length){msg("Agrega al menos un dominio antes de guardar.","error");return;}
    btn.disabled=true;msg("Guardando configuración…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        formId:card.dataset.formId,access,domains:card._domains,allowedEmails:val("allowedEmails"),
        rateLimit:val("rateLimit"),maxPhotos:val("maxPhotos"),maxPhotoMb:val("maxPhotoMb")
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo guardar.");
      const i=items.findIndex(x=>x.id===j.form.id);if(i>=0)items[i]=j.form;
      render();msg("Configuración guardada correctamente.","success");
    }catch(e){msg(e.message||"No se pudo guardar.","error");}
    finally{btn.disabled=false;}
  }

  nav.addEventListener("click",()=>load());
  window.firebase?.auth?.().onAuthStateChanged(u=>{
    if(u)setTimeout(load,150);
    else forceForms();
  });
})();