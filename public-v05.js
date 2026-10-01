(() => {
  const firebaseConfig={
    apiKey:"AIzaSyDBmVNRqmjy_bt2UovRtmZVNpKrCTyNjLU",
    authDomain:"dashboards-fibrazo.firebaseapp.com",
    projectId:"dashboards-fibrazo",
    storageBucket:"dashboards-fibrazo.firebasestorage.app",
    messagingSenderId:"926517595208",
    appId:"1:926517595208:web:a9bbaacedd0ca1dfd51c7d"
  };
  const $=id=>document.getElementById(id);
  let policy=null,auth=null,authBusy=false;

  function fail(message){
    $("publicLoading").hidden=true;$("publicAuth").hidden=true;$("publicError").hidden=false;
    $("publicErrorText").textContent=message;
  }
  function prefersRedirect(){
    const ua=navigator.userAgent||"";
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)||window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true;
  }
  function showAuth(){
    $("publicLoading").hidden=true;$("publicError").hidden=true;$("publicAuth").hidden=false;
    $("publicAuthText").textContent="Este formulario recopila correo verificado. Inicia sesión con Google para continuar.";
  }
  function startForm(user){
    window.FIBRAZO_PUBLIC_USER=user||{email:""};
    window.FIBRAZO_PUBLIC_POLICY=policy;
    $("publicLoading").hidden=true;$("publicError").hidden=true;$("publicAuth").hidden=true;
    document.title="FIBRAZO · "+policy.name;
    if(typeof window.FIBRAZO_UX_OPEN_FORM!=="function")return fail("No se pudo iniciar el formulario.");
    window.FIBRAZO_UX_OPEN_FORM(policy.id);
  }
  async function signIn(){
    if(authBusy||!auth)return;authBusy=true;
    const btn=$("publicGoogleSignIn");btn.disabled=true;btn.textContent="Abriendo Google…";$("publicAuthError").textContent="";
    const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});
    if(prefersRedirect()){
      auth.signInWithRedirect(provider).catch(e=>{authBusy=false;btn.disabled=false;btn.textContent="Continuar con Google";$("publicAuthError").textContent=e.message||"No se pudo iniciar sesión.";});
      return;
    }
    auth.signInWithPopup(provider).catch(e=>{
      const code=String(e?.code||"");
      if(code==="auth/popup-blocked")return auth.signInWithRedirect(provider);
      $("publicAuthError").textContent=e.message||"No se pudo iniciar sesión.";
    }).finally(()=>{authBusy=false;btn.disabled=false;btn.textContent="Continuar con Google";});
  }

  async function boot(){
    const slug=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"").toLowerCase();
    if(!slug)return fail("El enlace del formulario no es válido.");
    try{
      const response=await fetch("/api/public?slug="+encodeURIComponent(slug),{cache:"no-store"});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Formulario no disponible.");
      policy=result.form;
      if(!window.FIBRAZO_FORMS?.[policy.id])throw new Error("La definición del formulario no está disponible.");

      if(!policy.collectEmail){startForm({email:""});return;}
      if(!window.firebase)throw new Error("No se pudo cargar el acceso con Google.");
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      auth=firebase.auth();
      $("publicGoogleSignIn").addEventListener("click",signIn);
      auth.onAuthStateChanged(user=>{
        if(user&&user.emailVerified)startForm(user);
        else showAuth();
      });
      auth.getRedirectResult().catch(e=>{$("publicAuthError").textContent=e.message||"No se pudo completar el acceso con Google.";showAuth();});
    }catch(error){fail(error.message||"Este formulario no está disponible.");}
  }
  boot();
})();