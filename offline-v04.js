(() => {
  const DB_NAME="fibrazoFormsOffline";
  const DB_VERSION=1;
  const STORE="queue";
  const $=id=>document.getElementById(id);
  let installPrompt=null;
  let syncing=false;

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:"clientSubmissionId"});
          store.createIndex("userEmail","userEmail",{unique:false});
          store.createIndex("createdAt","createdAt",{unique:false});
          store.createIndex("status","status",{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function tx(mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,mode);
      const store=t.objectStore(STORE);
      let value;
      try{value=fn(store);}catch(e){db.close();reject(e);return;}
      t.oncomplete=()=>{db.close();resolve(value);};
      t.onerror=()=>{db.close();reject(t.error);};
      t.onabort=()=>{db.close();reject(t.error||new Error("Transacción cancelada"));};
    });
  }

  async function put(record){
    return tx("readwrite",store=>store.put(record));
  }
  async function remove(id){
    return tx("readwrite",store=>store.delete(id));
  }
  async function all(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,"readonly");
      const req=t.objectStore(STORE).getAll();
      req.onsuccess=()=>{db.close();resolve(req.result||[]);};
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  function currentEmail(){
    return String(window.firebase?.auth?.().currentUser?.email||"").trim().toLowerCase();
  }

  function createSubmissionId(formId){
    const random=(crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-zA-Z0-9]/g,"").slice(0,10).toUpperCase();
    return "LOCAL-"+String(formId||"FORM").toUpperCase()+"-"+Date.now()+"-"+random;
  }

  function isTemporaryHttp(status){
    return status>=500 || status===408 || status===429;
  }

  async function postPayload(payload){
    const user=window.firebase?.auth?.().currentUser;
    if(!user) throw new Error("AUTH_REQUIRED");
    const token=await user.getIdToken();
    const response=await fetch("/api/submissions",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
      body:JSON.stringify(payload)
    });
    let body={};
    try{body=await response.json();}catch(_){}
    if(!response.ok){
      const storageUnavailable=body.error==="PHOTO_STORAGE_TEMPORARILY_UNAVAILABLE";
      const error=new Error(storageUnavailable
        ?"La foto quedó pendiente de sincronización porque el almacenamiento de evidencias no está disponible temporalmente."
        :(body.error||"No se pudo enviar la respuesta."));
      error.httpStatus=response.status;
      error.code=storageUnavailable?"PHOTO_STORAGE_TEMPORARILY_UNAVAILABLE":"";
      throw error;
    }
    return body;
  }

  async function ensureSpace(payload){
    const bytes=new Blob([JSON.stringify(payload)]).size;
    if(bytes>12*1024*1024) throw new Error("La respuesta es demasiado grande para guardarse sin conexión.");
    if(navigator.storage?.estimate){
      const estimate=await navigator.storage.estimate();
      const usage=Number(estimate.usage||0),quota=Number(estimate.quota||0);
      if(quota && usage+bytes>quota*0.88) throw new Error("No hay suficiente espacio local para guardar esta respuesta y sus fotos.");
    }
    try{await navigator.storage?.persist?.();}catch(_){}
    return bytes;
  }

  async function queuePayload(payload,lastError=""){
    const email=currentEmail();
    if(!email) throw new Error("No hay una sesión activa para asociar esta respuesta.");
    await ensureSpace(payload);
    const record={
      clientSubmissionId:payload.clientSubmissionId,
      formId:payload.formId,
      payload,
      userEmail:email,
      createdAt:new Date().toISOString(),
      status:"pending",
      attempts:0,
      lastError:String(lastError||"").slice(0,250)
    };
    await put(record);
    await refreshUi();
    return {ok:true,id:payload.clientSubmissionId,queued:true};
  }

  async function submit(payload){
    if(!payload.clientSubmissionId) payload.clientSubmissionId=createSubmissionId(payload.formId);
    if(!navigator.onLine) return queuePayload(payload,"Sin conexión");
    try{
      const result=await postPayload(payload);
      await refreshUi();
      return {...result,queued:false};
    }catch(error){
      if(error.httpStatus && !isTemporaryHttp(error.httpStatus)) throw error;
      return queuePayload(payload,error.message||"Error de red");
    }
  }

  async function syncAll({manual=false}={}){
    if(syncing) return;
    if(!navigator.onLine){await refreshUi();return;}
    const user=window.firebase?.auth?.().currentUser;
    if(!user){await refreshUi();return;}
    syncing=true;
    renderSyncing(true);
    const email=currentEmail();
    const records=(await all()).filter(item=>item.userEmail===email).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    let synced=0,failed=0;
    for(const record of records){
      try{
        await put({...record,status:"syncing",attempts:(record.attempts||0)+1,lastError:""});
        await postPayload(record.payload);
        await remove(record.clientSubmissionId);
        synced++;
      }catch(error){
        const permanent=error.httpStatus && !isTemporaryHttp(error.httpStatus);
        await put({...record,status:permanent?"error":"pending",attempts:(record.attempts||0)+1,lastError:String(error.message||"Error").slice(0,250)});
        failed++;
        if(!navigator.onLine) break;
      }
    }
    syncing=false;
    renderSyncing(false);
    await refreshUi();
    if(manual){
      showSyncMessage(synced ? "Sincronizadas: "+synced+(failed?" · con error: "+failed:"") : failed ? "No se pudo sincronizar. Revisa los pendientes." : "No hay respuestas pendientes.");
    }
  }

  function formReference(record){
    const d=record.payload?.data||{};
    if(record.formId==="CHURN") return (d.ciudad||"")+" · Cliente "+(d.cliente_id||"—");
    return (d.ciudad||"")+" · "+(d.sector_barrio||"Sin sector");
  }

  function formatTime(value){
    try{return new Date(value).toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}catch(_){return value||"";}
  }

  async function refreshUi(){
    const email=currentEmail();
    const records=(await all()).filter(item=>!email || item.userEmail===email);
    const pending=records.filter(item=>item.status!=="error").length;
    const errors=records.filter(item=>item.status==="error").length;
    const online=navigator.onLine;
    const btn=$("networkToggle");
    const label=$("networkLabel");
    const count=$("networkCount");
    const formStatus=$("formNetworkStatus");
    if(btn){
      btn.classList.toggle("offline",!online);
      btn.classList.toggle("has-pending",pending>0||errors>0);
      btn.title=online?"Estado de sincronización":"Sin conexión";
    }
    if(label) label.textContent=online?(pending||errors?"Pendientes":"En línea"):"Sin conexión";
    if(count){count.textContent=String(pending+errors);count.hidden=(pending+errors)===0;}
    if(formStatus) formStatus.textContent=online?(pending+errors?"🟡 "+(pending+errors)+" pendiente"+((pending+errors)===1?"":"s"):"🟢 En línea"):"🟠 Sin conexión · "+(pending+errors)+" pendiente"+((pending+errors)===1?"":"s");
    const state=$("syncState");
    if(state) state.textContent=online?"Con conexión":"Sin conexión";
    const list=$("offlineQueueList");
    if(list){
      list.innerHTML=records.length?records.map(record=>
        '<article class="offline-item '+(record.status==="error"?"error":"")+'">'+
        '<div><strong>'+escapeHtml(record.formId)+'</strong><p>'+escapeHtml(formReference(record))+'</p><small>'+escapeHtml(formatTime(record.createdAt))+'</small></div>'+
        '<span>'+escapeHtml(record.status==="error"?"Error":record.status==="syncing"?"Sincronizando":"Pendiente")+'</span>'+
        (record.lastError?'<small class="offline-error">'+escapeHtml(record.lastError)+'</small>':"")+
        '</article>'
      ).join(""):'<div class="pending-empty">No hay respuestas pendientes.</div>';
    }
    const syncBtn=$("syncNowButton");
    if(syncBtn) syncBtn.disabled=!online||syncing||records.length===0;
  }

  function escapeHtml(value){
    return String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }

  function togglePanel(force){
    const panel=$("networkPopover"),btn=$("networkToggle");
    if(!panel||!btn)return;
    const show=typeof force==="boolean"?force:panel.hidden;
    panel.hidden=!show;
    btn.setAttribute("aria-expanded",String(show));
    if(show) refreshUi();
  }

  function renderSyncing(active){
    const btn=$("syncNowButton");
    if(btn) btn.textContent=active?"Sincronizando…":"Sincronizar ahora";
  }

  function showSyncMessage(message){
    const el=$("syncMessage");
    if(!el)return;
    el.textContent=message;
    clearTimeout(showSyncMessage.t);
    showSyncMessage.t=setTimeout(()=>{el.textContent="";},4500);
  }

  $("networkToggle")?.addEventListener("click",e=>{e.stopPropagation();togglePanel();});
  $("networkClose")?.addEventListener("click",()=>togglePanel(false));
  $("syncNowButton")?.addEventListener("click",()=>syncAll({manual:true}));
  document.addEventListener("click",e=>{if(!e.target.closest(".network-hub"))togglePanel(false);});

  window.addEventListener("online",()=>{refreshUi();setTimeout(()=>syncAll(),350);});
  window.addEventListener("offline",refreshUi);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){refreshUi();if(navigator.onLine)syncAll();}});

  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    installPrompt=event;
    const btn=$("installAppButton");
    if(btn) btn.hidden=false;
  });
  $("installAppButton")?.addEventListener("click",async()=>{
    if(!installPrompt)return;
    installPrompt.prompt();
    try{await installPrompt.userChoice;}catch(_){}
    installPrompt=null;
    $("installAppButton").hidden=true;
  });
  window.addEventListener("appinstalled",()=>{$("installAppButton") && ($("installAppButton").hidden=true);});

  if("serviceWorker" in navigator && location.protocol==="https:"){
    window.addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(()=>{}));
  }

  window.firebase?.auth?.().onAuthStateChanged(user=>{
    setTimeout(refreshUi,120);
    if(user&&navigator.onLine)setTimeout(()=>syncAll(),700);
  });

  setTimeout(refreshUi,200);

  window.FIBRAZO_OFFLINE={submit,syncAll,createSubmissionId,refreshUi,list:all};
})();