(() => {
  const forms = window.FIBRAZO_FORMS || {};
  const $ = (id) => document.getElementById(id);
  const state = { form:null, sectionIndex:0, gps:null, photos:[] };

  function user() {
    return window.firebase?.auth?.().currentUser || null;
  }

  function formByKey() {
    return Object.fromEntries((state.form?.fields || []).map((field) => [field.key, field]));
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".form-card button");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const title = button.closest(".form-card")?.querySelector("h3")?.textContent?.trim();
    const form = Object.values(forms).find((item) => item.name === title);
    if (form) openForm(form.id);
  }, true);

  $("dynamicForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  $("closeForm")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    exitForm();
  }, true);

  $("backToForms")?.addEventListener("click", exitForm);
  $("prevSection")?.addEventListener("click", previousSection);
  $("nextSection")?.addEventListener("click", nextSection);
  $("reviewForm")?.addEventListener("click", reviewForm);
  $("editForm")?.addEventListener("click", returnToEdit);
  $("editFormBottom")?.addEventListener("click", returnToEdit);
  $("confirmSubmit")?.addEventListener("click", submitConfirmedForm);
  $("newResponse")?.addEventListener("click", () => {
    const id = state.form?.id;
    if (id) openForm(id);
  });

  function openForm(id) {
    const form = forms[id];
    if (!form) return;
    state.form = form;
    state.sectionIndex = 0;
    state.gps = null;
    state.photos = [];

    document.body.classList.add("form-mode");
    $("formTitle").textContent = form.name;
    $("formDescription").textContent = form.description || "";
    $("formEyebrow").textContent = form.eyebrow || "FORMULARIO";
    $("formUserEmail").textContent = user()?.email || "";
    $("reviewUserEmail").textContent = user()?.email || "";
    $("dynamicFields").innerHTML = "";
    clearValidation();

    form.fields.forEach((field) => $("dynamicFields").appendChild(renderField(field)));
    $("formWorkspace").hidden = false;
    $("reviewWorkspace").hidden = true;
    $("successWorkspace").hidden = true;
    renderSection();
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function exitForm() {
    document.body.classList.remove("form-mode");
    $("formWorkspace").hidden = true;
    $("reviewWorkspace").hidden = true;
    $("successWorkspace").hidden = true;
    state.form = null;
    state.gps = null;
    state.photos = [];
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function renderField(field) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (field.full ? " full" : "");
    wrap.dataset.key = field.key;
    wrap.dataset.section = field.section || "default";

    const label = document.createElement("label");
    label.className = "field-label";
    label.innerHTML = escapeHtml(field.label) + (field.required ? '<span class="required">*</span>' : "");
    wrap.appendChild(label);

    if (field.help) {
      const help = document.createElement("span");
      help.className = "field-help field-help-top";
      help.textContent = field.help;
      wrap.appendChild(help);
    }

    if (field.type === "text") {
      wrap.appendChild(textInput(field));
    } else if (field.type === "numeric" || field.type === "currency") {
      wrap.appendChild(numericInput(field));
    } else if (field.type === "date-flex") {
      wrap.appendChild(dateInput(field));
    } else if (field.type === "select") {
      wrap.appendChild(selectInput(field));
    } else if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.name = field.key;
      textarea.addEventListener("input", () => clearFieldError(field.key));
      wrap.appendChild(textarea);
    } else if (field.type === "radio" || field.type === "checkbox") {
      wrap.appendChild(choiceInput(field));
    } else if (field.type === "gps") {
      wrap.appendChild(gpsInput(field));
    } else if (field.type === "photos") {
      wrap.appendChild(photoInput(field));
    }

    const error = document.createElement("div");
    error.className = "field-error";
    error.dataset.errorFor = field.key;
    error.hidden = true;
    wrap.appendChild(error);

    if (field.default !== undefined) {
      queueMicrotask(() => {
        const node = document.querySelector('[name="' + cssEscape(field.key) + '"]');
        if (node && !node.value) node.value = String(field.default);
      });
    }
    return wrap;
  }

  function textInput(field) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = field.key;
    input.addEventListener("input", () => {
      clearFieldError(field.key);
      updateVisibility();
    });
    return input;
  }

  function numericInput(field) {
    const shell = document.createElement("div");
    shell.className = "input-affix";

    if (field.type === "currency") {
      const prefix = document.createElement("span");
      prefix.className = "input-prefix";
      prefix.textContent = "$";
      shell.appendChild(prefix);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.name = field.key;
    input.inputMode = "numeric";
    input.autocomplete = "off";
    if (field.maxLength) input.maxLength = field.maxLength;
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
      clearFieldError(field.key);
      updateVisibility();
    });
    shell.appendChild(input);

    if (field.suffix) {
      const suffix = document.createElement("span");
      suffix.className = "input-suffix";
      suffix.textContent = field.suffix;
      shell.appendChild(suffix);
    }
    return shell;
  }

  function dateInput(field) {
    const holder = document.createElement("div");
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = field.key;

    const shell = document.createElement("div");
    shell.className = "date-flex";

    const pickerGroup = document.createElement("div");
    pickerGroup.className = "date-option";
    const pickerLabel = document.createElement("small");
    pickerLabel.textContent = "Calendario";
    const picker = document.createElement("input");
    picker.type = "date";

    const manualGroup = document.createElement("div");
    manualGroup.className = "date-option";
    const manualLabel = document.createElement("small");
    manualLabel.textContent = "Escribir fecha";
    const manual = document.createElement("input");
    manual.type = "text";
    manual.inputMode = "numeric";
    manual.placeholder = "DD/MM/AAAA";
    manual.maxLength = 10;

    picker.addEventListener("change", () => {
      hidden.value = picker.value;
      manual.value = picker.value ? isoToDmy(picker.value) : "";
      clearFieldError(field.key);
    });

    manual.addEventListener("input", () => {
      manual.value = maskDate(manual.value);
      const iso = dmyToIso(manual.value);
      hidden.value = iso || "";
      picker.value = iso || "";
      clearFieldError(field.key);
    });

    pickerGroup.append(pickerLabel, picker);
    manualGroup.append(manualLabel, manual);
    shell.append(pickerGroup, manualGroup);
    holder.append(hidden, shell);
    return holder;
  }

  function selectInput(field) {
    const select = document.createElement("select");
    select.name = field.key;
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
    select.addEventListener("change", () => {
      clearFieldError(field.key);
      updateVisibility();
    });
    return select;
  }

  function choiceInput(field) {
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    (field.options || []).forEach((option) => {
      const choice = document.createElement("label");
      choice.className = "choice";
      const input = document.createElement("input");
      input.type = field.type;
      input.name = field.key;
      input.value = option;
      input.addEventListener("change", () => {
        clearFieldError(field.key);
        updateVisibility();
      });
      choice.append(input, document.createTextNode(option));
      grid.appendChild(choice);
    });
    return grid;
  }

  function gpsInput(field) {
    const box = document.createElement("div");
    box.className = "gps-box";
    const value = document.createElement("div");
    value.className = "gps-value";
    value.textContent = "Ubicación pendiente";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "Tomar coordenadas";
    button.addEventListener("click", () => captureGps(value, button, field.key));
    box.append(value, button);
    return box;
  }

  function photoInput(field) {
    const holder = document.createElement("div");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.capture = "environment";
    input.className = "photo-input";
    const preview = document.createElement("div");
    preview.className = "photo-preview";
    input.addEventListener("change", async () => {
      const selected = Array.from(input.files || []).slice(0,3);
      state.photos = [];
      preview.innerHTML = "";
      for (const file of selected) {
        try {
          const compressed = await compressImage(file,1280,.72);
          state.photos.push({ name:file.name || "foto.jpg", data:compressed });
          const image = document.createElement("img");
          image.src = compressed;
          image.alt = file.name || "Foto seleccionada";
          preview.appendChild(image);
        } catch (_) {}
      }
      clearFieldError(field.key);
    });
    holder.append(input, preview);
    return holder;
  }

  function currentSection() {
    return state.form?.sections?.[state.sectionIndex] || null;
  }

  function renderSection() {
    const section = currentSection();
    if (!section) return;
    $("sectionTitle").textContent = section.title;
    $("sectionDescription").textContent = section.description || "";
    $("sectionEyebrow").textContent = "SECCIÓN " + (state.sectionIndex + 1);
    $("formStepCounter").textContent = (state.sectionIndex + 1) + " de " + state.form.sections.length;

    const stepper = $("sectionStepper");
    stepper.innerHTML = "";
    state.form.sections.forEach((item,index) => {
      const step = document.createElement("div");
      step.className = "step" + (index === state.sectionIndex ? " active" : index < state.sectionIndex ? " complete" : "");
      step.innerHTML = "<span>" + (index+1) + "</span><small>" + escapeHtml(item.title) + "</small>";
      stepper.appendChild(step);
    });

    $("prevSection").hidden = state.sectionIndex === 0;
    const last = state.sectionIndex === state.form.sections.length - 1;
    $("nextSection").hidden = last;
    $("reviewForm").hidden = !last;
    clearValidation();
    updateVisibility();
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function fieldValue(key) {
    const nodes = Array.from(document.querySelectorAll('[name="' + cssEscape(key) + '"]'));
    if (!nodes.length) return "";
    if (nodes[0].type === "radio") return nodes.find((node) => node.checked)?.value || "";
    if (nodes[0].type === "checkbox") return nodes.filter((node) => node.checked).map((node) => node.value);
    return nodes[0].value;
  }

  function conditionMet(field) {
    if (!field.showWhen) return true;
    const current = fieldValue(field.showWhen.field);
    return Array.isArray(current) ? current.includes(field.showWhen.equals) : current === field.showWhen.equals;
  }

  function updateVisibility() {
    const sectionId = currentSection()?.id;
    const fields = formByKey();
    document.querySelectorAll("#dynamicFields .field").forEach((element) => {
      const field = fields[element.dataset.key];
      element.hidden = !(field && field.section === sectionId && conditionMet(field));
    });
  }

  function previousSection() {
    if (state.sectionIndex > 0) {
      state.sectionIndex -= 1;
      renderSection();
    }
  }

  function nextSection() {
    const errors = validateSection(state.sectionIndex);
    if (errors.length) return showValidation(errors);
    state.sectionIndex += 1;
    renderSection();
  }

  function reviewForm() {
    const errors = validateAll();
    if (errors.length) {
      const first = errors[0].field;
      const index = state.form.sections.findIndex((section) => section.id === first.section);
      if (index >= 0) state.sectionIndex = index;
      renderSection();
      showValidation(errors.filter((item) => item.field.section === currentSection().id));
      return;
    }
    $("formWorkspace").hidden = true;
    $("reviewWorkspace").hidden = false;
    $("successWorkspace").hidden = true;
    $("reviewUserEmail").textContent = user()?.email || "";
    $("saveStatus").textContent = "";
    $("saveStatus").className = "save-status";
    buildReview();
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function validateAll() {
    return state.form.sections.flatMap((_,index) => validateSection(index,false));
  }

  function validateSection(index, paint=true) {
    const section = state.form.sections[index];
    const errors = [];
    state.form.fields.filter((field) => field.section === section.id && conditionMet(field)).forEach((field) => {
      const message = validateField(field);
      if (message) {
        errors.push({ field, message });
        if (paint) setFieldError(field.key,message);
      } else if (paint) clearFieldError(field.key);
    });
    return errors;
  }

  function validateField(field) {
    if (field.type === "gps") {
      if (field.required && !state.gps) return "Debes tomar la ubicación antes de continuar.";
      return "";
    }
    if (field.type === "photos") return "";
    const value = fieldValue(field.key);
    const empty = Array.isArray(value) ? value.length === 0 : String(value || "").trim() === "";
    if (field.required && empty) return "Este campo es obligatorio.";
    if (!empty && (field.type === "numeric" || field.type === "currency") && !/^\d+$/.test(String(value))) return "Ingresa únicamente números.";
    if (field.type === "date-flex" && !empty && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return "Ingresa una fecha válida.";
    return "";
  }

  function setFieldError(key,message) {
    const field = document.querySelector('[data-key="' + cssEscape(key) + '"]');
    const error = document.querySelector('[data-error-for="' + cssEscape(key) + '"]');
    field?.classList.add("invalid");
    if (error) { error.textContent = message; error.hidden = false; }
  }

  function clearFieldError(key) {
    const field = document.querySelector('[data-key="' + cssEscape(key) + '"]');
    const error = document.querySelector('[data-error-for="' + cssEscape(key) + '"]');
    field?.classList.remove("invalid");
    if (error) { error.textContent = ""; error.hidden = true; }
  }

  function clearValidation() {
    $("validationSummary").hidden = true;
    $("validationList").innerHTML = "";
    document.querySelectorAll("#dynamicFields .field").forEach((field) => field.classList.remove("invalid"));
    document.querySelectorAll("#dynamicFields .field-error").forEach((error) => { error.hidden = true; error.textContent = ""; });
  }

  function showValidation(errors) {
    const list = $("validationList");
    list.innerHTML = "";
    errors.forEach(({field,message}) => {
      setFieldError(field.key,message);
      const item = document.createElement("li");
      item.textContent = field.label + ": " + message;
      list.appendChild(item);
    });
    $("validationSummary").hidden = false;
    document.querySelector("#dynamicFields .field.invalid:not([hidden])")?.scrollIntoView({ behavior:"smooth", block:"center" });
  }

  function buildReview() {
    const host = $("reviewContent");
    host.innerHTML = "";
    state.form.sections.forEach((section) => {
      const visible = state.form.fields.filter((field) => field.section === section.id && conditionMet(field));
      if (!visible.length) return;
      const card = document.createElement("section");
      card.className = "review-section";
      const rows = visible.map((field) =>
        '<div class="review-row"><span>' + escapeHtml(field.label) + '</span><strong>' + escapeHtml(reviewValue(field)) + '</strong></div>'
      ).join("");
      card.innerHTML = '<div class="review-section-head"><span>SECCIÓN</span><h2>' + escapeHtml(section.title) + "</h2></div>" + rows;
      host.appendChild(card);
    });
  }

  function reviewValue(field) {
    if (field.type === "gps") return state.gps ? state.gps.lat.toFixed(6) + ", " + state.gps.lng.toFixed(6) + " · ±" + Math.round(state.gps.accuracy) + " m" : "—";
    if (field.type === "photos") return state.photos.length ? state.photos.length + " foto" + (state.photos.length === 1 ? "" : "s") : "—";
    const value = fieldValue(field.key);
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    if (!value) return "—";
    if (field.type === "currency") return "$ " + Number(value).toLocaleString("es-CO");
    if (field.type === "date-flex") return isoToDmy(value);
    if (field.suffix) return value + " " + field.suffix;
    return String(value);
  }

  function returnToEdit() {
    $("reviewWorkspace").hidden = true;
    $("formWorkspace").hidden = false;
    renderSection();
  }

  async function submitConfirmedForm() {
    const currentUser = user();
    if (!state.form || !currentUser) return;
    const button = $("confirmSubmit");
    button.disabled = true;
    setSaveStatus("Guardando respuesta…","");

    const payload = {
      formId:state.form.id,
      data:collectData(),
      location:state.gps,
      photos:state.photos,
      user:{ email:currentUser.email },
      clientTimestamp:new Date().toISOString()
    };

    try {
      let result;
      if (location.hostname.endsWith("github.io")) {
        const id = "PREVIEW-" + Date.now();
        const saved = JSON.parse(localStorage.getItem("fibrazoFormsPreview") || "[]");
        saved.unshift({ id, ...payload });
        localStorage.setItem("fibrazoFormsPreview", JSON.stringify(saved.slice(0,100)));
        result = { id };
      } else {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/submissions", {
          method:"POST",
          headers:{ "Content-Type":"application/json", Authorization:"Bearer " + token },
          body:JSON.stringify(payload)
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo guardar la respuesta.");
      }
      $("reviewWorkspace").hidden = true;
      $("formWorkspace").hidden = true;
      $("successWorkspace").hidden = false;
      $("successId").textContent = result.id || "—";
      $("successEmail").textContent = currentUser.email || "";
      window.scrollTo({ top:0, behavior:"smooth" });
    } catch (error) {
      setSaveStatus(error.message || "No se pudo guardar la respuesta.","error");
    } finally {
      button.disabled = false;
    }
  }

  function collectData() {
    const data = {};
    state.form.fields.forEach((field) => {
      if (field.type === "gps" || field.type === "photos" || !conditionMet(field)) return;
      data[field.key] = fieldValue(field.key);
    });
    return data;
  }

  function setSaveStatus(message,type) {
    $("saveStatus").textContent = message;
    $("saveStatus").className = "save-status" + (type ? " " + type : "");
  }

  function captureGps(valueElement,button,fieldKey) {
    if (!navigator.geolocation) { valueElement.textContent = "GPS no disponible en este navegador."; return; }
    button.disabled = true;
    button.textContent = "Obteniendo…";
    navigator.geolocation.getCurrentPosition((position) => {
      state.gps = { lat:position.coords.latitude, lng:position.coords.longitude, accuracy:position.coords.accuracy };
      valueElement.textContent = state.gps.lat.toFixed(6) + ", " + state.gps.lng.toFixed(6) + " · ±" + Math.round(state.gps.accuracy) + " m";
      button.disabled = false;
      button.textContent = "Actualizar ubicación";
      clearFieldError(fieldKey);
    },() => {
      valueElement.textContent = "No se pudo obtener la ubicación. Revisa el permiso del navegador.";
      button.disabled = false;
      button.textContent = "Reintentar";
    },{ enableHighAccuracy:true, timeout:12000, maximumAge:0 });
  }

  function compressImage(file,maxWidth,quality) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1,maxWidth/image.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width*scale);
          canvas.height = Math.round(image.height*scale);
          canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL("image/jpeg",quality));
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function maskDate(value) {
    const digits = String(value || "").replace(/\D/g,"").slice(0,8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0,2) + "/" + digits.slice(2);
    return digits.slice(0,2) + "/" + digits.slice(2,4) + "/" + digits.slice(4);
  }

  function dmyToIso(value) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const dd=match[1],mm=match[2],yyyy=match[3];
    const date = new Date(yyyy + "-" + mm + "-" + dd + "T00:00:00");
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(yyyy) || date.getMonth()+1 !== Number(mm) || date.getDate() !== Number(dd)) return "";
    return yyyy + "-" + mm + "-" + dd;
  }

  function isoToDmy(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + "/" + match[2] + "/" + match[1] : String(value || "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g,(char) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[char]);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/["\\]/g,"\\$&");
  }
})();