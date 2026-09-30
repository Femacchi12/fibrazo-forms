(() => {
  async function boot(){
    const slug=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"").toLowerCase();
    if(!slug) return fail("El enlace del formulario no es válido.");
    try{
      const response=await fetch("/api/public?slug="+encodeURIComponent(slug),{cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Formulario no disponible.");
      const form=result.form;
      window.FIBRAZO_PUBLIC_POLICY=form;
      window.FIBRAZO_PUBLIC_USER={email:""};
      if(!window.FIBRAZO_FORMS?.[form.id]) throw new Error("La definición del formulario no está disponible.");
      document.getElementById("publicLoading").hidden=true;
      document.getElementById("publicError").hidden=true;
      document.title="FIBRAZO · "+form.name;
      if(typeof window.FIBRAZO_UX_OPEN_FORM!=="function") throw new Error("No se pudo iniciar el formulario.");
      window.FIBRAZO_UX_OPEN_FORM(form.id);
    }catch(error){
      fail(error.message||"Este formulario no está disponible.");
    }
  }
  function fail(message){
    document.getElementById("publicLoading").hidden=true;
    document.getElementById("publicError").hidden=false;
    document.getElementById("publicErrorText").textContent=message;
  }
  boot();
})();