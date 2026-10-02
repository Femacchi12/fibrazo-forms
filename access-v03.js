(() => {
  const forms=window.FIBRAZO_FORMS||{};
  const ACCESS_CACHE_KEY="fibrazoFormsAccessCache";
  window.FIBRAZO_ACCESS=window.FIBRAZO_ACCESS||{};
  window.FIBRAZO_FORM_POLICIES=window.FIBRAZO_FORM_POLICIES||{};

  function current(){return window.firebase?.auth?.().currentUser||null;}

  function annotate(){
    const hasRules=Object.keys(window.FIBRAZO_ACCESS||{}).length>0;
    let allowedCount=0;
    document.querySelectorAll(".form-card").forEach(card=>{
      const title=card.querySelector("h3")?.textContent?.trim();
      const form=Object.values(forms).find(item=>item.name===title);
      if(!form)return;
      const allowed=window.FIBRAZO_ACCESS[form.id]===true;
      const button=card.querySelector("button");
      card.hidden=hasRules&&!allowed;
      card.classList.toggle("form-card-locked",hasRules&&!allowed);
      if(!allowed&&hasRules){
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
  }

  function hydrate(payload,email){
    const items=payload.forms||[];
    window.FIBRAZO_ACCESS=Object.fromEntries(items.map(item=>[item.id,item.canAccess]));
    window.FIBRAZO_FORM_POLICIES=Object.fromEntries(items.map(item=>[item.id,item]));
    window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL=email;
    try{
      localStorage.setItem(ACCESS_CACHE_KEY,JSON.stringify({
        email,access:window.FIBRAZO_ACCESS,policies:window.FIBRAZO_FORM_POLICIES,updatedAt:Date.now()
      }));
    }catch(_){}
    annotate();
  }

  function loadCached(){
    try{
      const cached=JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY)||"null");
      const email=String(current()?.email||"").toLowerCase();
      if(!cached||cached.email!==email||!cached.access)return false;
      window.FIBRAZO_ACCESS=cached.access;
      window.FIBRAZO_FORM_POLICIES=cached.policies||{};
      annotate();return true;
    }catch(_){return false;}
  }

  async function load(){
    const user=current();if(!user)return;
    const email=String(user.email||"").toLowerCase();
    if(window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL===email&&Object.keys(window.FIBRAZO_ACCESS||{}).length){annotate();return;}
    loadCached();
    if(!navigator.onLine)return;
    try{
      const token=await user.getIdToken();
      const r=await fetch("/api/access",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const j=await r.json();if(!r.ok)return;
      hydrate(j,email);
    }catch(_){loadCached();}
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest(".form-card .form-open-button");if(!button)return;
    const title=button.closest(".form-card")?.querySelector("h3")?.textContent?.trim();
    const form=Object.values(forms).find(item=>item.name===title);if(!form)return;
    if(window.FIBRAZO_ACCESS[form.id]!==true){event.preventDefault();event.stopImmediatePropagation();}
  },true);

  window.addEventListener("fibrazo:access-ready",()=>annotate());
  window.addEventListener("online",()=>setTimeout(load,100));
  window.firebase?.auth?.().onAuthStateChanged(user=>{
    if(user){loadCached();setTimeout(load,120);}
    else{
      window.FIBRAZO_ACCESS={};window.FIBRAZO_FORM_POLICIES={};window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL="";
    }
  });
})();