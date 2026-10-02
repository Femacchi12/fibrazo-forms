(() => {
  const firebaseConfig={
    apiKey:"AIzaSyDBmVNRqmjy_bt2UovRtmZVNpKrCTyNjLU",
    authDomain:location.hostname==="fibrazo-forms.vercel.app"?"fibrazo-forms.vercel.app":"dashboards-fibrazo.firebaseapp.com",
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
    if(authBusy||!auth)return;
    authBusy=true;
    const btn=$("publicGoogleSignIn");
    btn.disabled=true;btn.textContent="Abriendo Google…";$("publicAuthError").textContent="";
    try{await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);}catch(_){}
    const provider=new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e=>{
      const code=String(e?.code||"");
      if(code==="auth/popup-blocked"){
        $("publicAuthError").textContent="Chrome bloqueó la ventana de Google. Habilita ventanas emergentes para este sitio.";
      }else if(code==="auth/cancelled-popup-request"){
        $("publicAuthError").textContent="Ya había un acceso de Google en curso.";
      }else if(code==="auth/popup-closed-by-user"){
        $("publicAuthError").textContent="Se cerró Google antes de completar el acceso.";
      }else{
        $("publicAuthError").textContent=e.message||"No se pudo iniciar sesión.";
      }
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
    }catch(error){fail(error.message||"Este formulario no está disponible.");}
  }
  boot();
})();