(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyDBmVNRqmjy_bt2UovRtmZVNpKrCTyNjLU",
    authDomain: location.hostname==="fibrazo-forms.vercel.app" ? "fibrazo-forms.vercel.app" : "dashboards-fibrazo.firebaseapp.com",
    projectId: "dashboards-fibrazo",
    storageBucket: "dashboards-fibrazo.firebasestorage.app",
    messagingSenderId: "926517595208",
    appId: "1:926517595208:web:a9bbaacedd0ca1dfd51c7d"
  };

  const allowedException = "fernandoemacchi@gmail.com";
  const allowedDomain = "@fibrazo.com";
  const isGitHubPreview = location.hostname.endsWith("github.io");
  const apiBase = window.FIBRAZO_FORMS_API_BASE || "";
  const forms = window.FIBRAZO_FORMS || {};
  const state = { user: null, currentForm: null, gps: null, photos: [], rows: [] };
  const LAST_AUTH_EMAIL_KEY="fibrazoFormsLastAuthEmail";
  function lastAuthEmail(){try{return String(localStorage.getItem(LAST_AUTH_EMAIL_KEY)||"").trim().toLowerCase();}catch(_){return "";}}
  function rememberAuthEmail(user){const email=String(user?.email||"").trim().toLowerCase();if(!email)return;try{localStorage.setItem(LAST_AUTH_EMAIL_KEY,email);}catch(_){}}

  const $ = (id) => document.getElementById(id);

  function directFormSlug(){
    const match=location.pathname.match(/^\/form\/([^/]+)\/?$/i);
    return match?decodeURIComponent(match[1]).trim().toLowerCase():"";
  }

  function directPrivateForm(){
    const slug=directFormSlug();
    if(!slug)return null;
    return Object.values(forms).find(form=>{
      const policy=window.FIBRAZO_FORM_POLICIES?.[form.id]||{};
      return String(form.id||"").toLowerCase()===slug || String(policy.slug||"").toLowerCase()===slug;
    })||null;
  }

  async function resolveCanonicalFormRoute(){
    const slug=directFormSlug();
    if(!slug)return "private";
    try{
      const response=await fetch("/api/public?slug="+encodeURIComponent(slug),{cache:"no-store"});
      if(response.ok){
        location.replace("/f/"+encodeURIComponent(slug));
        return "public";
      }
    }catch(_){}
    return "private";
  }

  function openDirectPrivateForm(){
    const form=directPrivateForm();
    if(!form)return;
    const allowed=window.FIBRAZO_ACCESS?.[form.id]===true;
    if(!allowed)return;
    let attempts=0;
    const tryOpen=()=>{
      if(typeof window.FIBRAZO_UX_OPEN_FORM==="function"){
        window.FIBRAZO_UX_OPEN_FORM(form.id);
        return;
      }
      if(++attempts<50)setTimeout(tryOpen,100);
    };
    tryOpen();
  }

  $("activeFormsCount").textContent = Object.keys(forms).length;
  $("previewBadge").hidden = !isGitHubPreview;

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  const canonicalFormRoute=resolveCanonicalFormRoute();
  let authInFlight = false;
  let authPopupWatchdog = null;

  function setAuthInFlight(value) {
    authInFlight = !!value;
    const signIn = $("googleSignIn");
    const change = $("changeAccount");
    if (signIn) {
      signIn.disabled = authInFlight;
      signIn.textContent = authInFlight ? "Abriendo Google…" : "Continuar con Google";
    }
    if (change) change.disabled = authInFlight;
  }

  function startGoogleSignIn(changeAccount = false) {
    if (authInFlight) return;
    setAuthInFlight(true);
    $("authError").textContent = "";
    clearTimeout(authPopupWatchdog);

    const launch = async () => {
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (_) {}

      const provider = new firebase.auth.GoogleAuthProvider();
      if (changeAccount) {
        provider.setCustomParameters({ prompt: "select_account" });
      } else {
        const hint=lastAuthEmail();
        if(hint)provider.setCustomParameters({login_hint:hint});
      }

      authPopupWatchdog=setTimeout(()=>{
        if(authInFlight&&!auth.currentUser){
          setAuthInFlight(false);
          $("authError").textContent="Google tardó demasiado en responder. Vuelve a intentarlo.";
        }
      },45000);

      auth.signInWithPopup(provider)
        .catch((error) => {
          const code = String(error && error.code || "");
          if (code === "auth/popup-blocked") {
            $("authError").textContent = "Chrome bloqueó la ventana de Google. Habilita ventanas emergentes para este sitio y vuelve a intentarlo.";
          } else if (code === "auth/cancelled-popup-request") {
            $("authError").textContent = "Ya había un acceso de Google en curso. Espera unos segundos y vuelve a intentarlo.";
          } else if (code === "auth/popup-closed-by-user") {
            $("authError").textContent = "Se cerró Google antes de completar el acceso. Puedes intentarlo nuevamente.";
          } else {
            $("authError").textContent = error.message || "No se pudo iniciar sesión.";
          }
        })
        .finally(() => {clearTimeout(authPopupWatchdog);setAuthInFlight(false);});
    };

    if (changeAccount && auth.currentUser) {
      auth.signOut().then(launch).catch(() => {
        setAuthInFlight(false);
        $("authError").textContent = "No se pudo cambiar de cuenta.";
      });
      return;
    }
    launch();
  }

  function isAllowed(user) {
    return !!(user && user.emailVerified && user.email);
  }

  function cachedAccessFor(email){
    try{
      const cached=JSON.parse(localStorage.getItem("fibrazoFormsAccessCache")||"null");
      return cached&&cached.email===String(email||"").toLowerCase()&&cached.access?cached:null;
    }catch(_){return null;}
  }

  function usableCachedAccess(email,maxAgeMs=7*24*60*60*1000){
    const cached=cachedAccessFor(email);
    if(!cached)return null;
    const updatedAt=Number(cached.updatedAt||0);
    if(!updatedAt||Date.now()-updatedAt>maxAgeMs)return null;
    return cached;
  }

  async function authorizeDashboard(user){
    const email=String(user?.email||"").toLowerCase();
    try{
      const token=await user.getIdToken();
      const response=await fetch("/api/access",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const result=await response.json();
      if(!response.ok)return {ok:false,denied:response.status===403};
      const items=result.forms||[];
      const access=Object.fromEntries(items.map(item=>[item.id,item.canAccess]));
      const policies=Object.fromEntries(items.map(item=>[item.id,item]));
      window.FIBRAZO_ACCESS=access;
      window.FIBRAZO_FORM_POLICIES=policies;
      window.FIBRAZO_ACCESS_META={admin:!!result.admin,baseAdmin:!!result.baseAdmin,canCreateForms:!!result.canCreateForms,canManageUsers:!!result.canManageUsers,email};
      window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL=email;
      try{localStorage.setItem("fibrazoFormsAccessCache",JSON.stringify({email,access,policies,updatedAt:Date.now()}));}catch(_){}
      return {ok:true};
    }catch(_){
      const cached=usableCachedAccess(email);
      if(cached){
        window.FIBRAZO_ACCESS=cached.access;
        window.FIBRAZO_FORM_POLICIES=cached.policies||{};
        window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL=email;
        return {ok:true,offline:!navigator.onLine,cached:true};
      }
      return {ok:false,network:true};
    }
  }

  function viewStorageKey(){
    const email=String(state.user?.email||firebase?.auth?.().currentUser?.email||"anonimo").trim().toLowerCase();
    return "fibrazoFormsLastView:"+email;
  }
  function savedView(){
    try{
      const value=localStorage.getItem(viewStorageKey())||"forms";
      if(!["forms","results","map","admin"].includes(value))return"forms";
      if(value==="admin"&&!window.FIBRAZO_ACCESS_META?.admin&&!window.FIBRAZO_ACCESS_META?.canCreateForms&&!window.FIBRAZO_ACCESS_META?.canManageUsers)return"forms";
      return value;
    }catch(_){return"forms";}
  }
  function setView(view="forms",{persist=true}={}) {
    const target=["forms","results","map","admin"].includes(view)?view:"forms";
    document.querySelectorAll("[data-view]").forEach((b)=>b.classList.toggle("active",b.dataset.view===target));
    if ($("formsView")) $("formsView").hidden=target!=="forms";
    if ($("resultsView")) $("resultsView").hidden=target!=="results";
    if ($("mapView")) $("mapView").hidden=target!=="map";
    if ($("adminView")) $("adminView").hidden=target!=="admin";
    if(persist){try{localStorage.setItem(viewStorageKey(),target);}catch(_){}}
    if (target==="results" && state.user) loadResults();
    window.dispatchEvent(new CustomEvent("fibrazo:view-change",{detail:{view:target}}));
  }
  window.FIBRAZO_SET_VIEW=setView;

  function resetPrivateUi() {
    setView("forms",{persist:false});
    if ($("adminNavButton")) $("adminNavButton").hidden=true;
    if ($("adminView")) $("adminView").hidden=true;
    if ($("adminForms")) $("adminForms").innerHTML="";
    if ($("adminStatus")) $("adminStatus").textContent="";
    if ($("formWorkspace")) $("formWorkspace").hidden=true;
    if ($("reviewWorkspace")) $("reviewWorkspace").hidden=true;
    if ($("successWorkspace")) $("successWorkspace").hidden=true;
    state.currentForm=null;
  }

  function showDashboard(user) {
    clearTimeout(authPopupWatchdog);setAuthInFlight(false);
    rememberAuthEmail(user);
    state.user = user;
    $("signedInEmail").textContent = user.email || "";
    document.body.classList.remove("auth-pending");
    $("authGate").hidden = true;
    $("authSession").hidden = false;
    $("authError").textContent = "";
    renderCards();
    window.dispatchEvent(new CustomEvent("fibrazo:access-ready"));
    setView(savedView(),{persist:false});
    openDirectPrivateForm();
    if (isGitHubPreview) {
      $("backendState").textContent = "PREVIEW";
      $("backendDetail").textContent = "datos locales";
    }
  }

  function showGate(message, denied) {
    resetPrivateUi();
    state.user=null;
    document.body.classList.add("auth-pending");
    $("authGate").hidden = false;
    $("authSession").hidden = true;
    $("authMessage").textContent = message || "Inicia sesión con tu cuenta de Google para continuar.";
    $("authError").textContent = denied ? "Esta cuenta no está autorizada." : "";
    $("changeAccount").hidden = !denied;
  }

  $("googleSignIn").addEventListener("click", () => startGoogleSignIn(false));
  $("changeAccount").addEventListener("click", () => startGoogleSignIn(true));

  $("signOutButton").addEventListener("click", async () => {
    resetPrivateUi();
    try{await auth.signOut();}catch(_){}
  });

  auth.onAuthStateChanged(async (user) => {
    if(await canonicalFormRoute==="public")return;
    if (!user) {
      setAuthInFlight(false);
      showGate();
      return;
    }
    if (!isAllowed(user)) {
      await auth.signOut();
      showGate("Esta cuenta no tiene acceso habilitado.", true);
      return;
    }
    const authorization=await authorizeDashboard(user);
    if(!authorization.ok){
      if(authorization.denied){
        await auth.signOut();
        showGate("Esta cuenta no tiene acceso habilitado al dashboard.",true);
      }else{
        showGate("Tu sesión sigue guardada, pero no pudimos validar los permisos por un problema de conexión. Reintenta cuando vuelva la red.",false);
      }
      return;
    }
    showDashboard(user);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  function renderCards() {
    const host = $("formCards");
    host.innerHTML = "";
    Object.values(forms).forEach((form) => {
      const card = document.createElement("article");
      card.className = "form-card";
      const chips = (form.meta || []).map((x) => '<span class="meta-chip">' + escapeHtml(x) + "</span>").join("");
      const privateSlug=String(form.slug||form.id||"").toLowerCase();
      const privateUrl=location.origin+"/form/"+encodeURIComponent(privateSlug);
      const policy=window.FIBRAZO_FORM_POLICIES?.[form.id]||{};
      const databaseHtml=policy.canViewDatabase&&policy.databaseUrl
        ?'<a class="secondary-button compact form-db-link" href="'+escapeHtml(policy.databaseUrl)+'" target="_blank" rel="noopener">↗ Base de datos</a>'
        :"";
      card.innerHTML =
        '<div class="form-card-top">' +
          "<div><div class=\"eyebrow\">" + escapeHtml(form.eyebrow || "FORMULARIO") + "</div><h3>" + escapeHtml(form.name) + "</h3></div>" +
          '<div class="status-badge">ACTIVO</div>' +
        "</div>" +
        "<p>" + escapeHtml(form.description || "") + "</p>" +
        '<div class="form-meta">' + chips + "</div>" +
        '<div class="private-form-link">' +
          '<div><span>ACCESO DIRECTO PRIVADO</span><a href="'+escapeHtml(privateUrl)+'">'+escapeHtml(privateUrl)+'</a></div>' +
          '<button class="copy-private-link" type="button" aria-label="Copiar acceso directo">Copiar</button>' +
        "</div>" +
        databaseHtml+
        '<button class="primary-button form-open-button" type="button">Abrir formulario →</button>';
      card.querySelector(".form-open-button").addEventListener("click", () => openForm(form.id));
      card.querySelector(".copy-private-link").addEventListener("click",async(event)=>{
        event.preventDefault();
        event.stopPropagation();
        const button=event.currentTarget;
        try{
          await navigator.clipboard.writeText(privateUrl);
        }catch(_){
          const input=document.createElement("textarea");
          input.value=privateUrl;input.style.position="fixed";input.style.opacity="0";
          document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();
        }
        const previous=button.textContent;
        button.textContent="✓ Copiado";
        button.classList.add("copied");
        setTimeout(()=>{button.textContent=previous;button.classList.remove("copied");},1600);
      });
      host.appendChild(card);
    });
  }

  function openForm(id) {
    const form = forms[id];
    if (!form) return;

    state.currentForm = form;
    state.gps = null;
    state.photos = [];

    $("formTitle").textContent = form.name;
    $("formDescription").textContent = form.description || "";
    $("formEyebrow").textContent = form.eyebrow || "FORMULARIO";
    $("dynamicFields").innerHTML = "";
    $("saveStatus").textContent = "";
    $("saveStatus").className = "save-status";

    form.fields.forEach((field) => $("dynamicFields").appendChild(renderField(field)));
    $("formWorkspace").hidden = false;
    updateConditionalFields();
    $("formWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("closeForm").addEventListener("click", () => {
    $("formWorkspace").hidden = true;
    state.currentForm = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function renderField(field) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (field.full ? " full" : "");
    wrap.dataset.key = field.key;

    if (field.showWhen) {
      wrap.dataset.showField = field.showWhen.field;
      wrap.dataset.showEquals = field.showWhen.equals;
    }

    const label = document.createElement("label");
    label.className = "field-label";
    label.innerHTML = escapeHtml(field.label) + (field.required ? '<span class="required">*</span>' : "");
    wrap.appendChild(label);

    if (["text", "number", "date"].includes(field.type)) {
      const input = document.createElement("input");
      input.type = field.type;
      input.name = field.key;
      if (field.default !== undefined) input.value = field.default;
      if (field.required) input.required = true;
      input.addEventListener("input", updateConditionalFields);
      wrap.appendChild(input);
    } else if (field.type === "select") {
      const select = document.createElement("select");
      select.name = field.key;
      if (field.required) select.required = true;

      const first = document.createElement("option");
      first.value = "";
      first.textContent = "Seleccionar…";
      select.appendChild(first);

      (field.options || []).forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        select.appendChild(item);
      });

      select.addEventListener("change", updateConditionalFields);
      wrap.appendChild(select);
    } else if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.name = field.key;
      if (field.required) textarea.required = true;
      wrap.appendChild(textarea);
    } else if (field.type === "radio" || field.type === "checkbox") {
      const grid = document.createElement("div");
      grid.className = "choice-grid";

      (field.options || []).forEach((option, index) => {
        const choice = document.createElement("label");
        choice.className = "choice";

        const input = document.createElement("input");
        input.type = field.type;
        input.name = field.key;
        input.value = option;
        if (field.required && index === 0 && field.type === "radio") input.required = true;
        input.addEventListener("change", updateConditionalFields);

        choice.appendChild(input);
        choice.appendChild(document.createTextNode(option));
        grid.appendChild(choice);
      });

      wrap.appendChild(grid);
    } else if (field.type === "gps") {
      const box = document.createElement("div");
      box.className = "gps-box";

      const value = document.createElement("div");
      value.className = "gps-value";
      value.textContent = "Ubicación pendiente";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = "Tomar coordenadas";
      button.addEventListener("click", () => captureGps(value, button));

      box.appendChild(value);
      box.appendChild(button);
      wrap.appendChild(box);
    } else if (field.type === "photos") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      input.capture = "environment";
      input.className = "photo-input";

      const preview = document.createElement("div");
      preview.className = "photo-preview";

      input.addEventListener("change", async () => {
        const selected = Array.from(input.files || []).slice(0, 3);
        state.photos = [];
        preview.innerHTML = "";

        for (const file of selected) {
          try {
            const compressed = await compressImage(file, 1280, 0.72);
            state.photos.push({ name: file.name || "foto.jpg", data: compressed });

            const image = document.createElement("img");
            image.src = compressed;
            image.alt = file.name || "Foto seleccionada";
            preview.appendChild(image);
          } catch (_) {}
        }
      });

      wrap.appendChild(input);
      wrap.appendChild(preview);
    }

    if (field.help) {
      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = field.help;
      wrap.appendChild(help);
    }

    return wrap;
  }

  function fieldValue(key) {
    const nodes = Array.from(document.querySelectorAll('[name="' + cssEscape(key) + '"]'));
    if (!nodes.length) return "";

    if (nodes[0].type === "radio") {
      const checked = nodes.find((node) => node.checked);
      return checked ? checked.value : "";
    }

    if (nodes[0].type === "checkbox") {
      return nodes.filter((node) => node.checked).map((node) => node.value);
    }

    return nodes[0].value;
  }

  function updateConditionalFields() {
    document.querySelectorAll("[data-show-field]").forEach((element) => {
      const current = fieldValue(element.dataset.showField);
      const visible = Array.isArray(current)
        ? current.includes(element.dataset.showEquals)
        : current === element.dataset.showEquals;

      element.hidden = !visible;
      element.querySelectorAll("input,select,textarea").forEach((control) => {
        control.disabled = !visible;
      });
    });
  }

  function captureGps(valueElement, button) {
    if (!navigator.geolocation) {
      valueElement.textContent = "GPS no disponible en este navegador.";
      return;
    }

    button.disabled = true;
    button.textContent = "Obteniendo…";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.gps = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        valueElement.textContent =
          state.gps.lat.toFixed(6) + ", " +
          state.gps.lng.toFixed(6) + " · ±" +
          Math.round(state.gps.accuracy) + " m";

        button.disabled = false;
        button.textContent = "Actualizar ubicación";
      },
      () => {
        valueElement.textContent = "No se pudo obtener la ubicación. Revisa el permiso del navegador.";
        button.disabled = false;
        button.textContent = "Reintentar";
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const scale = Math.min(1, maxWidth / image.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        image.onerror = reject;
        image.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function collectData() {
    const data = {};
    if (!state.currentForm) return data;

    state.currentForm.fields.forEach((field) => {
      if (field.type === "gps" || field.type === "photos") return;

      const container = document.querySelector('[data-key="' + cssEscape(field.key) + '"]');
      if (container && container.hidden) return;

      data[field.key] = fieldValue(field.key);
    });

    return data;
  }

  $("dynamicForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentForm) return;
    if (!$("dynamicForm").reportValidity()) return;

    if (state.currentForm.id === "EXPLORACION" && !state.gps) {
      setSaveStatus("Debes tomar las coordenadas antes de guardar.", "error");
      return;
    }

    $("submitForm").disabled = true;
    setSaveStatus("Guardando respuesta…", "");

    const formId = state.currentForm.id;
    const payload = {
      formId,
      data: collectData(),
      location: state.gps,
      photos: state.photos,
      user: { email: state.user ? state.user.email : "" },
      clientTimestamp: new Date().toISOString()
    };

    try {
      if (isGitHubPreview) {
        const previewRow = Object.assign({ id: "preview-" + Date.now() }, payload);
        const saved = JSON.parse(localStorage.getItem("fibrazoFormsPreview") || "[]");
        saved.unshift(previewRow);
        localStorage.setItem("fibrazoFormsPreview", JSON.stringify(saved.slice(0, 100)));
        setSaveStatus("Guardado en vista previa local. No se envió a Google Sheets.", "success");
      } else {
        const token = await state.user.getIdToken();
        const response = await fetch(apiBase + "/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo guardar");
        setSaveStatus("Respuesta guardada · " + result.id, "success");
      }

      $("dynamicForm").reset();
      state.gps = null;
      state.photos = [];
      setTimeout(() => openForm(formId), 1000);
    } catch (error) {
      setSaveStatus(error.message || "No se pudo guardar la respuesta.", "error");
    } finally {
      $("submitForm").disabled = false;
    }
  });

  function setSaveStatus(message, type) {
    $("saveStatus").textContent = message;
    $("saveStatus").className = "save-status" + (type ? " " + type : "");
  }

  $("refreshResults").addEventListener("click", loadResults);
  ["resultFormFilter","resultUserFilter","resultCityFilter","resultStatusFilter","resultDateFrom","resultDateTo"].forEach(id=>$(id)?.addEventListener("change",renderResults));

  async function localHistoryRows() {
    if(!window.FIBRAZO_OFFLINE?.list)return[];
    const email=String(state.user?.email||"").trim().toLowerCase();
    const records=(await window.FIBRAZO_OFFLINE.list()).filter(r=>!email||r.userEmail===email);
    return records.map(r=>({
      formId:r.formId,id:r.clientSubmissionId,clientTimestamp:r.createdAt,
      data:r.payload?.data||{},user:r.userEmail||"",localStatus:r.status||"pending",local:true
    }));
  }

  async function loadResults() {
    const local=await localHistoryRows().catch(()=>[]);
    try {
      if (isGitHubPreview) {
        state.rows = JSON.parse(localStorage.getItem("fibrazoFormsPreview") || "[]");
        $("backendState").textContent = "PREVIEW";
        $("backendDetail").textContent = "datos locales";
      } else {
        const token = await state.user.getIdToken();
        const response = await fetch(apiBase + "/api/submissions?form=all&limit=100", {
          headers: { Authorization: "Bearer " + token }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Error de sincronización");
        const server=result.rows||[],serverIds=new Set(server.map(r=>String(r.id||"")));
        const localOnly=local.filter(r=>!serverIds.has(String(r.id||"")));
        state.rows=[...localOnly,...server.map(r=>({...r,localStatus:"sent"}))].sort((a,b)=>new Date(b.clientTimestamp||b.timestamp)-new Date(a.clientTimestamp||a.timestamp));
        $("backendState").textContent = localOnly.some(r=>r.localStatus!=="sent")?"PENDIENTES":"CONECTADO";
        $("backendDetail").textContent = localOnly.some(r=>r.localStatus!=="sent")?"hay respuestas locales por sincronizar":"Google Sheets + historial local";
      }
      renderResults();
    } catch (error) {
      state.rows=local;
      $("backendState").textContent = navigator.onLine?"ERROR":"SIN CONEXIÓN";
      $("backendDetail").textContent = local.length?"mostrando historial local":(error.message||"sin conexión");
      renderResults();
    }
  }

  function renderResults() {
    const rows = state.rows || [];
    const isAdmin=!!window.FIBRAZO_ACCESS_META?.admin;
    const userFilter=$("resultUserFilter"),cityFilter=$("resultCityFilter");
    if(userFilter){
      userFilter.hidden=!isAdmin;
      if(isAdmin){
        const current=userFilter.value||"all",users=[...new Set(rows.map(r=>String((r.user&&r.user.email)||r.user||"").trim()).filter(Boolean))].sort();
        userFilter.innerHTML='<option value="all">Todos los usuarios</option>'+users.map(u=>'<option value="'+escapeHtml(u)+'">'+escapeHtml(u)+'</option>').join("");
        if(users.includes(current))userFilter.value=current;
      }else userFilter.value="all";
    }
    if(cityFilter){
      const current=cityFilter.value||"all",cities=[...new Set(rows.map(r=>String(r.data?.municipio||r.data?.ciudad||r.location?.cityDetected||"").trim()).filter(Boolean))].sort();
      cityFilter.innerHTML='<option value="all">Todas las ciudades</option>'+cities.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join("");
      if(cities.includes(current))cityFilter.value=current;
    }

    const form=$("resultFormFilter")?.value||"all",user=userFilter?.value||"all",city=cityFilter?.value||"all",status=$("resultStatusFilter")?.value||"all";
    const from=$("resultDateFrom")?.value?new Date($("resultDateFrom").value+"T00:00:00"):null;
    const to=$("resultDateTo")?.value?new Date($("resultDateTo").value+"T23:59:59.999"):null;
    const filtered=rows.filter(row=>{
      const d=row.data||{},when=new Date(row.clientTimestamp||row.timestamp),rowUser=String((row.user&&row.user.email)||row.user||""),rowCity=String(d.municipio||d.ciudad||row.location?.cityDetected||""),rowStatus=row.localStatus||"sent";
      if(form!=="all"&&row.formId!==form)return false;
      if(isAdmin&&user!=="all"&&rowUser!==user)return false;
      if(city!=="all"&&rowCity!==city)return false;
      if(status!=="all"&&rowStatus!==status)return false;
      if(from&&!Number.isNaN(when)&&when<from)return false;
      if(to&&!Number.isNaN(when)&&when>to)return false;
      return true;
    });

    $("churnCount").textContent = filtered.filter(r=>r.formId==="CHURN").length;
    $("explorationCount").textContent = filtered.filter(r=>String(r.formId||"").startsWith("EXPLORACION")).length;
    $("totalCount").textContent = filtered.length;
    const body=$("resultsBody");body.innerHTML="";
    filtered.forEach(row=>{
      const data=row.data||{};
      const tr=document.createElement("tr");
      tr.innerHTML="<td>"+escapeHtml(formatDate(row.clientTimestamp||row.timestamp))+"</td>"+
        "<td>"+escapeHtml(row.formId==="EXPLORACION_PRESENCIAL"?"Exploración presencial":row.formId==="EXPLORACION"?"Exploración virtual":(row.formId||"—"))+"</td>"+
        "<td>"+escapeHtml(data.municipio||data.ciudad||row.location?.cityDetected||"—")+"</td>"+
        '<td><span class="result-status '+escapeHtml(row.localStatus||"sent")+'">'+escapeHtml(window.FIBRAZO_OFFLINE?.statusLabel?.(row.localStatus||"sent")||"Enviado")+"</span></td>"+
        "<td>"+escapeHtml((row.user&&row.user.email)||row.user||"—")+"</td>";
      body.appendChild(tr);
    });
    $("resultsEmpty").hidden=filtered.length>0;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }
})();