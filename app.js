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

  const $ = (id) => document.getElementById(id);

  $("activeFormsCount").textContent = Object.keys(forms).length;
  $("previewBadge").hidden = !isGitHubPreview;

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
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
      window.FIBRAZO_ACCESS_META={admin:!!result.admin,email};
      window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL=email;
      try{localStorage.setItem("fibrazoFormsAccessCache",JSON.stringify({email,access,policies,updatedAt:Date.now()}));}catch(_){}
      return {ok:true};
    }catch(_){
      if(!navigator.onLine){
        const cached=cachedAccessFor(email);
        if(cached){
          window.FIBRAZO_ACCESS=cached.access;
          window.FIBRAZO_FORM_POLICIES=cached.policies||{};
          window.FIBRAZO_ACCESS_BOOTSTRAPPED_EMAIL=email;
          return {ok:true,offline:true};
        }
      }
      return {ok:false,network:true};
    }
  }

  function setView(view="forms") {
    const target=["forms","results","admin"].includes(view)?view:"forms";
    document.querySelectorAll("[data-view]").forEach((b)=>b.classList.toggle("active",b.dataset.view===target));
    if ($("formsView")) $("formsView").hidden=target!=="forms";
    if ($("resultsView")) $("resultsView").hidden=target!=="results";
    if ($("adminView")) $("adminView").hidden=target!=="admin";
    if (target==="results" && state.user) loadResults();
  }
  window.FIBRAZO_SET_VIEW=setView;

  function resetPrivateUi() {
    setView("forms");
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
    state.user = user;
    $("signedInEmail").textContent = user.email || "";
    document.body.classList.remove("auth-pending");
    $("authGate").hidden = true;
    $("authSession").hidden = false;
    $("authError").textContent = "";
    renderCards();
    window.dispatchEvent(new CustomEvent("fibrazo:access-ready"));
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

  auth.getRedirectResult().catch(()=>{ setAuthInFlight(false); });

  auth.onAuthStateChanged(async (user) => {
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
      await auth.signOut();
      showGate(
        authorization.denied
          ? "Esta cuenta no tiene acceso habilitado al dashboard."
          : "No se pudo validar el acceso. Revisa la conexión e inténtalo nuevamente.",
        true
      );
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
      card.innerHTML =
        '<div class="form-card-top">' +
          "<div><div class=\"eyebrow\">" + escapeHtml(form.eyebrow || "FORMULARIO") + "</div><h3>" + escapeHtml(form.name) + "</h3></div>" +
          '<div class="status-badge">ACTIVO</div>' +
        "</div>" +
        "<p>" + escapeHtml(form.description || "") + "</p>" +
        '<div class="form-meta">' + chips + "</div>" +
        '<button class="primary-button" type="button">Abrir formulario →</button>';
      card.querySelector("button").addEventListener("click", () => openForm(form.id));
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
  $("resultFormFilter").addEventListener("change", renderResults);

  async function loadResults() {
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
        state.rows = result.rows || [];
        $("backendState").textContent = "CONECTADO";
        $("backendDetail").textContent = "Google Sheets + Drive";
      }

      renderResults();
    } catch (error) {
      $("backendState").textContent = "ERROR";
      $("backendDetail").textContent = error.message || "sin conexión";
      state.rows = [];
      renderResults();
    }
  }

  function renderResults() {
    const rows = state.rows || [];
    const churn = rows.filter((row) => row.formId === "CHURN").length;
    const exploration = rows.filter((row) => row.formId === "EXPLORACION").length;

    $("churnCount").textContent = churn;
    $("explorationCount").textContent = exploration;
    $("totalCount").textContent = rows.length;

    const filter = $("resultFormFilter").value;
    const filtered = filter === "all" ? rows : rows.filter((row) => row.formId === filter);
    const body = $("resultsBody");
    body.innerHTML = "";

    filtered.forEach((row) => {
      const data = row.data || {};
      const reference = row.formId === "CHURN" ? (data.cliente_id || "—") : (data.sector_barrio || "—");
      let detail = "—";

      if (row.formId === "CHURN") {
        detail = data.motivo_principal || "—";
      } else {
        detail = [
          data.tigo_hfc === "Sí" ? "TIGO HFC" : null,
          data.claro_hfc === "Sí" ? "CLARO HFC" : null,
          data.movistar === "Sí" ? "Movistar" : null
        ].filter(Boolean).join(", ") || "—";
      }

      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + escapeHtml(formatDate(row.clientTimestamp || row.timestamp)) + "</td>" +
        "<td>" + escapeHtml(row.formId || "—") + "</td>" +
        "<td>" + escapeHtml(data.ciudad || "—") + "</td>" +
        "<td>" + escapeHtml(reference) + "</td>" +
        "<td>" + escapeHtml(detail) + "</td>" +
        "<td>" + escapeHtml((row.user && row.user.email) || row.user || "—") + "</td>";

      body.appendChild(tr);
    });

    $("resultsEmpty").hidden = filtered.length > 0;
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