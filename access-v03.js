(() => {
  const forms=window.FIBRAZO_FORMS||{};
  window.FIBRAZO_ACCESS={};

  function current(){return window.firebase?.auth?.().currentUser||null;}
  function annotate(){
    document.querySelectorAll(".form-card").forEach(card=>{
      const title=card.querySelector("h3")?.textContent?.trim();
      const form=Object.values(forms).find(item=>item.name===title);
      if(!form)return;
      const rule=window.FIBRAZO_ACCESS[form.id];
      const button=card.querySelector("button");
      card.classList.toggle("form-card-locked",rule===false);
      if(rule===false){button.disabled=true;button.textContent="🔒 Sin acceso";}
      else if(button.disabled&&button.textContent.includes("Sin acceso")){button.disabled=false;button.textContent="Abrir formulario →";}
    });
  }

  async function load(){
    const user=current();if(!user)return;
    try{
      const token=await user.getIdToken();
      const r=await fetch("/api/access",{headers:{Authorization:"Bearer "+token}});
      const j=await r.json();if(!r.ok)return;
      window.FIBRAZO_ACCESS=Object.fromEntries((j.forms||[]).map(item=>[item.id,item.canAccess]));
      setTimeout(annotate,50);
      setTimeout(annotate,500);
    }catch(_){}
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest(".form-card button");if(!button)return;
    const title=button.closest(".form-card")?.querySelector("h3")?.textContent?.trim();
    const form=Object.values(forms).find(item=>item.name===title);
    if(form&&window.FIBRAZO_ACCESS[form.id]===false){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);

  const observer=new MutationObserver(()=>annotate());
  const host=document.getElementById("formCards");if(host)observer.observe(host,{childList:true});
  window.firebase?.auth?.().onAuthStateChanged(user=>{if(user)setTimeout(load,120);});
})();