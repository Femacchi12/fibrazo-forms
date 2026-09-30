(() => {
  const $=id=>document.getElementById(id), nav=$("adminNavButton"), view=$("adminView"), host=$("adminForms"), status=$("adminStatus");
  let items=[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const labels={PRIVADO:"Privado",CORREOS:"Correos específicos",DOMINIO:"Dominio FIBRAZO",PUBLICO:"Público"};
  const current=()=>window.firebase?.auth?.().currentUser||null;
  async function tok(){const u=current();if(!u)throw new Error("AUTH_REQUIRED");return u.getIdToken();}
  function msg(t,type=""){status.textContent=t;status.className="save-status"+(type?" "+type:"");}

  async function load(){
    try{
      const r=await fetch("/api/admin",{headers:{Authorization:"Bearer "+await tok()}});
      if(r.status===403){nav.hidden=true;return;}
      const j=await r.json(); if(!r.ok)throw new Error(j.error||"No se pudo cargar administración.");
      nav.hidden=false; items=j.forms||[]; render();
    }catch(_){nav.hidden=true;}
  }

  function option(mode,selected){return '<option value="'+mode+'" '+(selected===mode?"selected":"")+'>'+esc(labels[mode])+'</option>';}

  function render(){
    host.innerHTML="";
    items.forEach(f=>{
      const card=document.createElement("article"); card.className="admin-form-card"; card.dataset.formId=f.id;
      const publicUrl=location.origin+"/f/"+f.slug;
      card.innerHTML=
        '<div class="admin-form-title"><div><span>'+esc(f.id)+'</span><h3>'+esc(f.name)+'</h3><p>'+esc(f.description)+'</p></div>'+
        '<div class="access-pill access-'+esc(f.access.toLowerCase())+'">'+esc(labels[f.access]||f.access)+'</div></div>'+
        '<div class="admin-grid">'+
          '<label><span>Tipo de acceso</span><select data-field="access">'+["PRIVADO","CORREOS","DOMINIO","PUBLICO"].map(m=>option(m,f.access)).join("")+'</select></label>'+
          '<label class="admin-domain"><span>Dominio permitido</span><input data-field="domain" type="text" value="'+esc(f.domain||"@fibrazo.com")+'"></label>'+
          '<label class="admin-emails full"><span>Correos permitidos</span><textarea data-field="allowedEmails">'+esc((f.allowedEmails||[]).join(", "))+'</textarea><small>Separa los correos con comas.</small></label>'+
          '<label><span>Límite público / 10 min</span><input data-field="rateLimit" type="number" min="1" max="100" value="'+esc(f.rateLimit)+'"></label>'+
          '<label><span>Máximo de fotos</span><input data-field="maxPhotos" type="number" min="0" max="3" value="'+esc(f.maxPhotos)+'"></label>'+
          '<label><span>Máximo por foto (MB)</span><input data-field="maxPhotoMb" type="number" min=".25" max="2" step=".25" value="'+esc(f.maxPhotoMb)+'"></label>'+
        '</div>'+
        '<div class="admin-public-link"><span>Enlace público</span><div><input readonly value="'+esc(publicUrl)+'"><button type="button" class="secondary-button compact" data-copy>Copiar</button></div></div>'+
        '<div class="admin-card-actions"><small>Actualizado: '+esc(f.updatedAt||"—")+(f.updatedBy?" · "+esc(f.updatedBy):"")+'</small><button type="button" class="primary-button" data-save>Guardar permisos</button></div>';
      card.querySelector('[data-field="access"]').addEventListener("change",()=>refresh(card));
      card.querySelector("[data-save]").addEventListener("click",()=>save(card));
      card.querySelector("[data-copy]").addEventListener("click",async()=>{
        const input=card.querySelector(".admin-public-link input");
        try{await navigator.clipboard.writeText(input.value);msg("Enlace copiado.","success");}
        catch(_){input.select();document.execCommand("copy");}
      });
      refresh(card); host.appendChild(card);
    });
  }

  function refresh(card){
    const mode=card.querySelector('[data-field="access"]').value;
    card.querySelector(".admin-emails").hidden=mode!=="CORREOS";
    card.querySelector(".admin-domain").hidden=mode!=="DOMINIO";
    card.querySelector(".admin-public-link").hidden=mode!=="PUBLICO";
    const pill=card.querySelector(".access-pill"); pill.className="access-pill access-"+mode.toLowerCase(); pill.textContent=labels[mode];
  }

  async function save(card){
    const btn=card.querySelector("[data-save]"), val=n=>card.querySelector('[data-field="'+n+'"]')?.value??"";
    btn.disabled=true;msg("Guardando permisos…");
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({
        formId:card.dataset.formId,access:val("access"),domain:val("domain"),allowedEmails:val("allowedEmails"),
        rateLimit:val("rateLimit"),maxPhotos:val("maxPhotos"),maxPhotoMb:val("maxPhotoMb")
      })});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo guardar.");
      const i=items.findIndex(x=>x.id===j.form.id);if(i>=0)items[i]=j.form;render();msg("Permisos actualizados correctamente.","success");
    }catch(e){msg(e.message||"No se pudo guardar.","error");}
    finally{btn.disabled=false;}
  }

  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{view.hidden=b.dataset.view!=="admin";if(b.dataset.view==="admin")load();}));
  window.firebase?.auth?.().onAuthStateChanged(u=>{if(u)setTimeout(load,150);else nav.hidden=true;});
})();