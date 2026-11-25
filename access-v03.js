// FO-CHG-171: la autorización proviene exclusivamente de /api/access, cargada por app.js.
// Este módulo solo representa las autorizaciones; no descarga ni restaura cachés por separado.
(() => {
  const forms=window.FIBRAZO_FORMS||{};
  function annotate(){
    const rules=window.FIBRAZO_ACCESS||{};
    const hasRules=Object.keys(rules).length>0;
    let count=0;
    document.querySelectorAll(".form-card[data-form-id]").forEach(card=>{
      const form=forms[card.dataset.formId];
      if(!form)return;
      const button=card.querySelector(".form-open-button");
      if(!button)return;
      const allowed=hasRules&&rules[form.id]===true;
      // Dejar visible la ficha para que la falta de permiso sea diagnosticable.
      card.hidden=false;
      card.classList.toggle("form-card-locked",!allowed);
      button.disabled=!allowed;
      button.textContent=allowed?"Abrir →":"🔒 Sin acceso";
      button.setAttribute("aria-label",(allowed?"Abrir ":"Sin acceso a ")+form.name);
      if(allowed)count++;
    });
    const badge=document.getElementById("activeFormsCount");
    if(badge&&hasRules)badge.textContent=String(count);
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest(".form-card[data-form-id] .form-open-button");
    if(!button)return;
    const id=button.closest(".form-card")?.dataset.formId;
    if(!id||window.FIBRAZO_ACCESS?.[id]!==true){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  window.addEventListener("fibrazo:access-ready",annotate);
  window.addEventListener("fibrazo:access-cleared",annotate);
})();
