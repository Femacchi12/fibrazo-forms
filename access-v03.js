(() => {
  const forms=window.FIBRAZO_FORMS||{};
  const ACCESS_CACHE_KEY="fibrazoFormsAccessCache";
  window.FIBRAZO_ACCESS={};

  function current(){return window.firebase?.auth?.().currentUser||null;}

  function annotate(){
    const hasRules=Object.keys(window.FIBRAZO_ACCESS||{}).length>0;
    let allowedCount=0;
    document.querySelectorAll(".form-card").forEach(card=>{
      const title=card.querySelector("h3")?.textContent?.trim();
      const form=Object.values(forms).find(item=>item.name===title);
      if(!form)return;
      const known=Object.prototype.hasOwnProperty.call(window.FIBRAZO_ACCESS,form.id);
      const rule=window.FIBRAZO_ACCESS[form.id];
      const allowed=known&&rule===true;
      const button=card.querySelector("button");
      card.hidden=!allowed;
      card.classList.toggle("form-card-locked",!allowed);
      if(!allowed){
        button.disabled=true;
        button.textContent="🔒 Sin acceso";
      }else{
        allowedCount++;
        button.disabled=false;
        button.textContent="Abrir formulario →";
      }
    });
    const count=document.getElementById("activeFormsCount");
    if(count&&hasRules)count.textContent=String(allowedCount);
    const intro=document.querySelector(".intro-panel .support-copy");
    if(intro&&hasRules&&allowedCount===0)intro.textContent="No tienes formularios habilitados actualmente. Contacta a un administrador de FIBRAZO Forms.";
  }

  function loadCached(){
    try{
      const raw=localStorage.getItem(ACCESS_CACHE_KEY);
      if(!raw)return false;
      const cached=JSON.parse(raw);
      const email=String(current()?.email||"").toLowerCase();
      if(!email||cached.email!==email||!cached.access)return false;
      window.FIBRAZO_ACCESS=cached.access;
      annotate();
      return true;
    }catch(_){return false;}
  }

  async function load(){
    const user=current();
    if(!user)return;
    const email=String(user.email||"").toLowerCase();
    if(window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL===email&&Object.keys(window.FIBRAZO_ACCESS||{}).length){
      annotate();return;
    }
    loadCached();
    if(!navigator.onLine)return;
    try{
      const token=await user.getIdToken();
      const r=await fetch("/api/access",{headers:{Authorization:"Bearer "+token}});
      const j=await r.json();
      if(!r.ok)return;
      window.FIBRAZO_ACCESS=Object.fromEntries((j.forms||[]).map(item=>[item.id,item.canAccess]));
      try{
        localStorage.setItem(ACCESS_CACHE_KEY,JSON.stringify({
          email:String(user.email||"").toLowerCase(),
          access:window.FIBRAZO_ACCESS,
          updatedAt:Date.now()
        }));
      }catch(_){}
      annotate();
    }catch(_){
      loadCached();
    }
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest(".form-card button");
    if(!button)return;
    const title=button.closest(".form-card")?.querySelector("h3")?.textContent?.trim();
    const form=Object.values(forms).find(item=>item.name===title);
    if(!form)return;
    if(window.FIBRAZO_ACCESS[form.id]!==true){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);

  const observer=new MutationObserver(()=>annotate());
  const host=document.getElementById("formCards");
  if(host)observer.observe(host,{childList:true});

  window.addEventListener("fibrazo:access-ready",()=>annotate());
  window.addEventListener("online",()=>setTimeout(load,100));
  window.firebase?.auth?.().onAuthStateChanged(user=>{
    if(user){
      loadCached();
      setTimeout(load,120);
    }else{
      window.FIBRAZO_ACCESS={};
      window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL="";
    }
  });
})();