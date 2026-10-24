(() => {
  const scope=typeof window!=="undefined"?window:globalThis;
  const backgroundMode=typeof document==="undefined";
  const DB_NAME="fibrazoFormsOffline";
  const DB_VERSION=1;
  const LEASE_STORE="queue";
  const ownerId="worker-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
  const LEASE_MS=90000;
  let retryTimer=null;
  const STORE="queue";
  const $=id=>backgroundMode?null:document.getElementById(id);
  let installPrompt=null;
  let syncing=false,activeRun=null,restartRequested=false,syncProgress="";
  const requests=new Set();

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
      req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
      req.onblocked=()=>reject(new Error("Cierra otras pestañas antiguas de Forms y vuelve a guardar."));
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

  async function lease(acquire=true){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction(LEASE_STORE,"readwrite"),store=transaction.objectStore(LEASE_STORE);
      let granted=false;
      const req=store.get("__FIBRAZO_QUEUE_LEASE__");
      req.onsuccess=()=>{
        const old=req.result,now=Date.now();
        if(acquire&&(!old||old.owner===ownerId||old.expires<=now)){store.put({clientSubmissionId:"__FIBRAZO_QUEUE_LEASE__",kind:"lease",owner:ownerId,expires:now+LEASE_MS});granted=true;}
        if(!acquire&&old?.owner===ownerId)store.delete("__FIBRAZO_QUEUE_LEASE__");
      };
      transaction.oncomplete=()=>{db.close();resolve(granted);};
      transaction.onerror=transaction.onabort=()=>{db.close();reject(transaction.error||new Error("QUEUE_LOCK_FAILED"));};
    });
  }

  async function get(id){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,"readonly"),req=t.objectStore(STORE).get(id);
      req.onsuccess=()=>{db.close();resolve(req.result);};
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  async function completion(id){
    const r=await get(id);
    if(!r||r.userEmail!==currentEmail())return null;
    if(!["sent","sent_master_pending","sent_competition_pending"].includes(r.status))return null;
    return {ok:true,id:r.serverId||r.clientSubmissionId,queued:false,masterSync:r.masterSync,territorialPending:r.status==="sent_master_pending",competitionPending:r.status==="sent_competition_pending",isTest:r.payload.isTest===true};
  }

  function notifyRecord(record,result=null){
    if(backgroundMode){scope.clients?.matchAll({type:"window"}).then(clients=>clients.forEach(client=>client.postMessage({type:"FIBRAZO_QUEUE_CHANGED",id:record.clientSubmissionId,status:record.status}))).catch(()=>{});return;}
    scope.dispatchEvent(new CustomEvent("fibrazo:queue-change",{detail:{id:record.clientSubmissionId,status:record.status,lastError:record.lastError,result}}));
  }

  async function timedFetch(url,options,timeout=45000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    requests.add(controller);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      // Keep the deadline through body download, not just response headers.
      let body={};try{body=await response.json();}catch(error){if(controller.signal.aborted)throw error;}
      return {ok:response.ok,status:response.status,json:async()=>body};
    }finally{clearTimeout(timer);requests.delete(controller);}
  }

  async function enrichPayload(payload){
    const policy=scope.FIBRAZO_BACKGROUND_TERRITORY;
    if(!policy?.needsLookup(payload))return payload;
    const user=scope.firebase?.auth?.().currentUser;
    if(!user)throw new Error("AUTH_REQUIRED");
    const token=await idToken(user),point=payload.backgroundTerritory.point;
    const hint=payload.backgroundTerritory.cityHint||payload.data?.municipio||payload.location?.cityDetected||"";
    const response=await timedFetch("/api/exploration?lat="+encodeURIComponent(point.lat)+"&lng="+encodeURIComponent(point.lng)+"&city="+encodeURIComponent(hint),{headers:{Authorization:"Bearer "+token},cache:"no-store"},5000);
    const data=await response.json();
    if(!response.ok){const e=new Error(data.error||"No se completó la consulta territorial.");e.httpStatus=response.status;throw e;}
    return policy.applyResult(payload,data,scope.FIBRAZO_QA_STRATUM_POLICY);
  }

  function requestBackgroundSync(){
    if(backgroundMode||!navigator.serviceWorker||!currentEmail())return;
    all().then(records=>{if(records.some(r=>r.userEmail===currentEmail()&&!["sent","error"].includes(r.status)))return navigator.serviceWorker.ready.then(reg=>reg.sync?.register("fibrazo-queue-v1"));}).catch(()=>{});
  }

  async function idToken(user){
    let timer;
    try{return await Promise.race([user.getIdToken(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("AUTH_NETWORK_TIMEOUT")),12000);})]);}
    finally{clearTimeout(timer);}
  }

  async function scheduleRetry(){
    if(backgroundMode)return;
    clearTimeout(retryTimer);
    if(!navigator.onLine||!currentEmail())return;
    const pending=(await all()).filter(r=>r.userEmail===currentEmail()&&!["sent","error"].includes(r.status));
    if(!pending.length)return;
    const due=Math.min(...pending.map(r=>Number(r.nextAttemptAt)||0));
    retryTimer=setTimeout(()=>syncAll(),Math.min(60000,Math.max(1500,due-Date.now())));
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
      req.onsuccess=()=>{db.close();resolve((req.result||[]).filter(r=>r.kind!=="lease"));};
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  function currentEmail(){
    return String(scope.firebase?.auth?.().currentUser?.email||"").trim().toLowerCase();
  }

  function createSubmissionId(formId){
    const random=(crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-zA-Z0-9]/g,"").slice(0,10).toUpperCase();
    return "LOCAL-"+String(formId||"FORM").toUpperCase()+"-"+Date.now()+"-"+random;
  }

  function isTemporaryHttp(status){
    return status>=500 || status===408 || status===429;
  }

  async function postPayload(payload,expectedEmail=currentEmail()){
    const user=scope.firebase?.auth?.().currentUser;
    if(!user) throw new Error("AUTH_REQUIRED");
    if(String(user.email||"").trim().toLowerCase()!==expectedEmail)throw new Error("AUTH_CHANGED");
    const token=await idToken(user);
    if(currentEmail()!==expectedEmail)throw new Error("AUTH_CHANGED");
    const response=await timedFetch("/api/submissions",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
      body:JSON.stringify({...payload,deferCompetition:true})
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

  async function checkReceipt(payload,email){
    const user=scope.firebase?.auth?.().currentUser;
    if(!user||currentEmail()!==email)throw new Error("AUTH_CHANGED");
    const token=await idToken(user);
    if(currentEmail()!==email||restartRequested)throw new Error("AUTH_CHANGED");
    const response=await timedFetch("/api/submissions?form="+encodeURIComponent(payload.formId)+"&receipt="+encodeURIComponent(payload.clientSubmissionId),{headers:{Authorization:"Bearer "+token},cache:"no-store"},8000);
    const body=await response.json();
    if(currentEmail()!==email||restartRequested)throw new Error("AUTH_CHANGED");
    if(!response.ok)throw Object.assign(new Error(body.error||"RECEIPT_CHECK_FAILED"),{httpStatus:response.status});
    if(body.found===true&&body.ok===true&&body.id===payload.clientSubmissionId)return body;
    return null;
  }
  async function sendOrRecover(payload,checkFirst=false){
    // An edit targets an existing ID; its existence does not prove that this
    // particular edit was applied. Keep the existing edit idempotency flow.
    if(payload.editId)return postPayload(payload);
    const email=currentEmail();let receipt=null;
    if(checkFirst){try{receipt=await checkReceipt(payload,email);}catch(error){if(error.httpStatus===401||error.httpStatus===403||currentEmail()!==email||restartRequested)throw error;}}
    if(receipt&&receipt.masterSync?.ok!==false)return receipt;
    try{return await postPayload(receipt?{...payload,photos:[]}:payload,email);}
    catch(error){
      if(restartRequested||currentEmail()!==email||!navigator.onLine||(error.httpStatus&&!isTemporaryHttp(error.httpStatus)))throw error;
      try{const recovered=await checkReceipt(payload,email);if(recovered)return recovered;}catch(checkError){if(checkError.httpStatus===401||checkError.httpStatus===403)throw checkError;}
      throw error;
    }
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

  async function addQueuedRecord(record){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,"readwrite"),store=t.objectStore(STORE);let conflict=null;
      const req=store.getAll();
      req.onsuccess=()=>{
        if(record.payload?.editId&&(req.result||[]).some(old=>old.kind!=="lease"&&old.userEmail===record.userEmail&&old.payload?.editId===record.payload.editId&&old.status!=="sent")){
          conflict=new Error("Ya hay una edición pendiente de este registro. Sincronízala antes de guardar otra edición.");t.abort();return;
        }
        store.add(record);
      };
      t.oncomplete=()=>{db.close();resolve();};
      t.onerror=t.onabort=()=>{db.close();reject(conflict||t.error||new Error("QUEUE_WRITE_FAILED"));};
    });
  }

  async function queuePayload(payload,lastError=""){
    const email=currentEmail();
    if(!email) throw new Error("No hay una sesión activa para asociar esta respuesta.");
    payload=JSON.parse(JSON.stringify(payload));
    const existing=await get(payload.clientSubmissionId);
    if(existing){if(existing.userEmail!==email)throw new Error("QUEUE_OWNER_MISMATCH");return {ok:true,id:existing.clientSubmissionId,queued:existing.status!=="sent",territorialPending:scope.FIBRAZO_BACKGROUND_TERRITORY?.needsLookup(existing.payload)};}
    await ensureSpace(payload);
    const record={
      clientSubmissionId:payload.clientSubmissionId,
      formId:payload.formId,
      payload,
      userEmail:email,
      createdAt:new Date().toISOString(),
      status:scope.FIBRAZO_BACKGROUND_TERRITORY?.needsLookup(payload)?"territorial_pending":"pending",
      nextAttemptAt:0,
      attempts:0,
      lastError:String(lastError||"").slice(0,250)
    };
    try{await addQueuedRecord(record);}catch(error){if(error?.name!=="ConstraintError")throw error;const old=await get(record.clientSubmissionId);if(!old||old.userEmail!==email)throw error;}
    requestBackgroundSync();
    await refreshUi();
    return {ok:true,id:payload.clientSubmissionId,queued:true,territorialPending:record.status==="territorial_pending"};
  }

  async function submit(payload){
    if(!payload.clientSubmissionId) payload.clientSubmissionId=createSubmissionId(payload.formId);
    const result=await queuePayload(payload,navigator.onLine?"En cola de envío":"Sin conexión");
    if(result.queued===false)return result;
    if(navigator.onLine)setTimeout(()=>syncAll(),0);
    return {...result,queued:true,background:true};
  }

  function syncAll(options={}){
    if(activeRun){if(options.manual)showSyncMessage("Ya hay un envío en curso. Puedes seguir su estado en la lista.");return Promise.resolve({busy:true});}
    activeRun=runSyncAll(options).finally(()=>{activeRun=null;});
    return activeRun;
  }
  async function restartSync(){
    if(restartRequested)return {busy:true};
    restartRequested=true;
    const button=$("restartSyncButton");if(button)button.disabled=true;
    clearTimeout(retryTimer);
    showSyncMessage("Reiniciando el intento. Los registros y fotos se conservan…");
    try{
      for(const controller of requests)controller.abort();
      if(activeRun)await activeRun;
    }finally{restartRequested=false;if(button)button.disabled=false;}
    const result=await syncAll({manual:true});
    if(result?.busy)showSyncMessage("Otro proceso está enviando. Espera a que termine; no se borró ningún registro.");
    return result;
  }
  async function runSyncAll({manual=false,background=false}={}){
    if(syncing)return {busy:true};
    if(!navigator.onLine||!currentEmail()){await refreshUi();return {authRequired:!currentEmail()};}
    syncing=true;
    let locked=false,heartbeat=null,synced=0,failed=0;
    const deadline=Date.now()+25000,receivedIds=new Set();let processed=0;
    try{
      locked=await lease();
      if(!locked){if(manual)showSyncMessage("Otro proceso está enviando. Se reintentará automáticamente; tus datos se conservan.");return {busy:true};}
      heartbeat=setInterval(()=>lease().then(held=>{if(!held)for(const controller of requests)controller.abort();}).catch(()=>{for(const controller of requests)controller.abort();}),20000);
      renderSyncing(true);
      const email=currentEmail();
      const records=(await all()).filter(r=>r.userEmail===email&&!["sent"].includes(r.status)&&(manual||r.status!=="error")&&(manual||!r.nextAttemptAt||r.nextAttemptAt<=Date.now())).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
      for(let record of records){
        if(background&&(processed>=3||Date.now()>=deadline))break;
        if(record.status==="sent_competition_pending")continue;
        processed++;syncProgress=processed+" / "+records.length;renderSyncing(true);
        if(restartRequested||!navigator.onLine||currentEmail()!==email)break;
        try{
          record={...record,attempts:(record.attempts||0)+1,lastError:"",status:record.status!=="sent_master_pending"&&scope.FIBRAZO_BACKGROUND_TERRITORY?.needsLookup(record.payload)?"enriching":"syncing"};
          await put(record);notifyRecord(record);await refreshUi();
          if(record.status==="enriching"){
            let payload=record.payload;
            try{payload=await enrichPayload(record.payload);}catch(error){
              // The authenticated submission endpoint resolves the original GPS
              // again. A failed optional lookup must not block raw receipt.
              if(error.httpStatus===401||error.httpStatus===403)throw error;
              if(currentEmail()!==email||restartRequested||!navigator.onLine)throw error;
            }
            if(currentEmail()!==email)throw new Error("AUTH_CHANGED");
            if(restartRequested)throw new Error("SYNC_RESTART_REQUESTED");
            record={...record,payload,status:"pending",lastError:""};
            await put(record); // Durable enriched snapshot before any POST.
          }
          if(currentEmail()!==email)throw new Error("AUTH_CHANGED");
            if(restartRequested)throw new Error("SYNC_RESTART_REQUESTED");
          record={...record,status:"syncing"};await put(record);notifyRecord(record);
          if(!await lease())throw new Error("QUEUE_LEASE_LOST");
          const serverResult=await sendOrRecover(record.payload,record.attempts>1);
          if(currentEmail()!==email||restartRequested)throw new Error("SYNC_RESTART_REQUESTED");
          if(!serverResult?.ok||!serverResult.id)throw new Error("El servidor no confirmó la respuesta.");
          const territorialForm=scope.FIBRAZO_BACKGROUND_TERRITORY?.FORMS.includes(record.formId);
          const masterPending=!!serverResult.territorialError||((record.formId==="EXPLORACION"||record.formId==="EXPLORACION_PRESENCIAL")&&serverResult?.masterSync?.ok!==true);
          const competitionPending=serverResult.competitionSync?.ok===false;
          record={...record,payload:masterPending?record.payload:{...record.payload,photos:[]},status:masterPending?"sent_master_pending":competitionPending?"sent_competition_pending":"sent",masterSync:serverResult.masterSync||null,syncedAt:new Date().toISOString(),serverId:serverResult.id,nextAttemptAt:masterPending?Date.now()+60000:competitionPending?Date.now():0,lastError:masterPending?"Respuesta recibida; falta conciliación territorial en servidor.":competitionPending?"Forms recibido. La consolidación de competencia se reintentará automáticamente.":""};
          await put(record);notifyRecord(record,{...serverResult,queued:false,territorialPending:masterPending,competitionPending,isTest:record.payload.isTest===true});
          if(!masterPending&&territorialForm)scope.dispatchEvent(new CustomEvent("fibrazo:submission-saved",{detail:{formId:record.formId,id:serverResult.id}}));
          synced++;receivedIds.add(record.clientSubmissionId);
        }catch(error){
          const permanent=error.httpStatus&&error.httpStatus!==401&&!isTemporaryHttp(error.httpStatus);
          record={...record,status:permanent?"error":scope.FIBRAZO_BACKGROUND_TERRITORY?.needsLookup(record.payload)?"territorial_pending":"pending",nextAttemptAt:Date.now()+Math.min(60000,5000*2**Math.min(record.attempts||1,4)),lastError:String(restartRequested?"Intento reiniciado; respuesta conservada.":error.name==="AbortError"?"La conexión tardó demasiado. Se reintentará.":error.message==="Failed to fetch"?"No se recibió confirmación del servidor. Se comprobará antes de reenviar; respuesta y fotos conservadas.":error.message||"Error").slice(0,250)};
          await put(record);notifyRecord(record);failed++;
        }
      }
      // One consolidation for the received batch, not one full spreadsheet
      // materialization per photographed point. This phase is durable in IDB.
      const pending=(await all()).filter(r=>r.userEmail===email&&r.status==="sent_competition_pending"&&(manual||!r.nextAttemptAt||r.nextAttemptAt<=Date.now()));
      if(pending.length&&!restartRequested&&navigator.onLine&&currentEmail()===email&&(!background||Date.now()<deadline)){
        try{
          const token=await idToken(scope.firebase.auth().currentUser);
          if(currentEmail()!==email)throw new Error("AUTH_CHANGED");
          const response=await timedFetch("/api/competition-sync",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({receivedBatch:true})});
          const body=await response.json();
          if(!response.ok||body.ok!==true)throw new Error(body.error||body.reason||"COMPETITION_SYNC_PENDING");
          if(currentEmail()!==email||restartRequested||!await lease())throw new Error("QUEUE_LEASE_LOST");
          for(const original of pending){const current=await get(original.clientSubmissionId);if(current?.status!=="sent_competition_pending"||current.userEmail!==email)continue;const done={...current,status:"sent",nextAttemptAt:0,lastError:""};await put(done);notifyRecord(done);if(!receivedIds.has(done.clientSubmissionId))synced++;}
        }catch(error){
          failed++;
          for(const original of pending){const current=await get(original.clientSubmissionId);if(current?.status!=="sent_competition_pending"||current.userEmail!==email)continue;await put({...current,nextAttemptAt:Date.now()+60000,lastError:"Forms recibido. Consolidación pendiente; se reintentará automáticamente."});}
        }
      }
    }catch(error){
      console.error("OFFLINE_QUEUE_ERROR",error?.message||"QUEUE_FAILED");
      if(background)throw error;
    }finally{
      clearInterval(heartbeat);
      if(locked)await lease(false).catch(()=>{});
      syncing=false;syncProgress="";renderSyncing(false);
      await refreshUi().catch(()=>{});
      await scheduleRetry().catch(()=>{});
    }
    const remaining=(await all()).filter(r=>r.userEmail===currentEmail()&&!["sent","error"].includes(r.status)).length;
    if(remaining)requestBackgroundSync();
    if(manual)showSyncMessage(synced?"Sincronizadas: "+synced+(failed?" · con error: "+failed:""):failed?"No se pudo sincronizar. Revisa los pendientes.":"No hay respuestas pendientes.");
    return {synced,failed,remaining};
  }

  function formReference(record){
    const d=record.payload?.data||{};
    if(record.formId==="CHURN") return (d.ciudad||"")+" · Cliente "+(d.cliente_id||"—");
    return (record.payload?.editId?"Edición · ":"")+(d.municipio||d.ciudad||record.payload?.location?.cityDetected||"")+" · "+(d.sector_barrio||"Sin sector");
  }

  function formatTime(value){
    try{return new Date(value).toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}catch(_){return value||"";}
  }

  async function refreshUi(){
    if(backgroundMode)return;
    const email=currentEmail();
    const records=(await all()).filter(item=>!email || item.userEmail===email);
    const active=records.filter(item=>item.status!=="sent"&&item.status!=="sent_master_pending");
    const masterPending=records.filter(item=>item.status==="sent_master_pending").length;
    const pending=active.filter(item=>item.status!=="error").length;
    const errors=active.filter(item=>item.status==="error").length;
    const notice=$("backgroundSyncNotice");
    if(notice){notice.hidden=pending===0;notice.textContent=pending?"Guardado en este teléfono. Se reintenta con conexión; si Android lo aplaza, abre la app.":"";}
    const online=navigator.onLine;
    const btn=$("networkToggle");
    const label=$("networkLabel");
    const count=$("networkCount");
    const formStatus=$("formNetworkStatus");
    if(btn){
      btn.classList.toggle("offline",!online);
      btn.classList.toggle("has-pending",pending>0||errors>0||masterPending>0);
      btn.title=online?"Estado de sincronización":"Sin conexión";
    }
    if(label) label.textContent=online?(pending||errors?"Pendientes":masterPending?"Revisión territorial":"En línea"):"Sin conexión";
    if(count){count.textContent=String(pending+errors+masterPending);count.hidden=(pending+errors+masterPending)===0;}
    if(formStatus) formStatus.textContent=online?(pending+errors?"🟡 "+(pending+errors)+" envío(s) pendiente(s)":masterPending?"🟡 "+masterPending+" registro(s) por conciliar":"🟢 En línea"):"🟠 Sin conexión · "+(pending+errors)+" envío(s) pendiente(s)";
    const state=$("syncState");
    if(state) state.textContent=online?"Con conexión":"Sin conexión";
    const list=$("offlineQueueList");
    if(list){
      const visible=[...active,...records.filter(item=>item.status==="sent_master_pending")];
      list.innerHTML=visible.length?visible.map(record=>
        '<article class="offline-item '+(record.status==="error"?"error":"")+'">'+
        '<div><strong>'+escapeHtml(record.formId)+'</strong><p>'+escapeHtml(formReference(record))+'</p><small>'+escapeHtml(formatTime(record.createdAt))+'</small></div>'+
        '<span>'+escapeHtml(statusLabel(record.status))+'</span>'+
        (record.lastError?'<small class="offline-error">'+escapeHtml(record.lastError)+'</small>':"")+
        '</article>'
      ).join(""):'<div class="pending-empty">No hay respuestas pendientes.</div>';
    }
    const syncBtn=$("syncNowButton");
    if(syncBtn) syncBtn.disabled=!online||syncing||(active.length===0&&!records.some(r=>r.status==="sent_master_pending"));
    renderFormHistory(records);
  }

  function statusLabel(status){return status==="sent_competition_pending"?"Recibido · competencia pendiente":status==="sent_master_pending"?"Recibido · revisión territorial":status==="sent"?"Sincronizado":status==="syncing"?"Enviando":status==="enriching"?"Buscando barrio / estrato":status==="territorial_pending"?"Datos territoriales pendientes":status==="error"?"Error · reintentar":"Pendiente de envío";}
  function renderFormHistory(records){
    const host=$("formHistoryList");if(!host)return;
    const formId=String(scope.FIBRAZO_ACTIVE_FORM_ID||"");
    if(formId==="INTELIGENCIA_OPERADOR")return;
    const items=(records||[]).filter(r=>!formId||r.formId===formId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,20);
    host.innerHTML=items.length?items.map(r=>'<article class="history-item '+escapeHtml(r.status||"pending")+'"><div><strong>'+escapeHtml(formReference(r))+'</strong><small>'+escapeHtml(formatTime(r.createdAt))+'</small></div><span>'+escapeHtml(statusLabel(r.status))+'</span></article>').join(""):'<div class="pending-empty">Todavía no hay respuestas de este formulario en este dispositivo.</div>';
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
    if(show){scope.dispatchEvent(new CustomEvent("fibrazo:popover-open",{detail:{id:"network"}}));refreshUi();}
  }

  function renderSyncing(active){
    const btn=$("syncNowButton");
    if(btn) btn.textContent=active?"Sincronizando…"+(syncProgress?" "+syncProgress:""):"Sincronizar ahora";
  }

  function showSyncMessage(message){
    const el=$("syncMessage");
    if(!el)return;
    el.textContent=message;
    clearTimeout(showSyncMessage.t);
    showSyncMessage.t=setTimeout(()=>{el.textContent="";},4500);
  }

  scope.FIBRAZO_OFFLINE={submit,syncAll,restartSync,createSubmissionId,refreshUi,list:all,statusLabel,completion,territoryEnabled:!!scope.FIBRAZO_BACKGROUND_TERRITORY};
  if(backgroundMode)return;

  $("networkToggle")?.addEventListener("click",e=>{e.stopPropagation();togglePanel();});
  $("networkClose")?.addEventListener("click",()=>togglePanel(false));
  scope.addEventListener("fibrazo:popover-open",event=>{if(event.detail?.id!=="network")togglePanel(false);});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("networkPopover")?.hidden){togglePanel(false);$("networkToggle")?.focus();}});
  $("competitionSyncButton")?.addEventListener("click",async()=>{
    const btn=$("competitionSyncButton"),message=$("competitionSyncMessage");btn.disabled=true;message.textContent="Conciliando Forms con Competencia…";
    try{const user=scope.firebase.auth().currentUser,token=await idToken(user);const r=await timedFetch("/api/competition-sync",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:"{}"},60000);const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||data.reason||"No se completó la conciliación");message.textContent="Conciliación completa: "+data.records+" registros revisados; "+data.changedRows+" filas actualizadas. GPS pendiente: "+data.pendingCoordinates+".";}catch(e){message.textContent="Forms se conserva. No se completó Competencia: "+e.message;}finally{btn.disabled=false;}
  });
  $("restartSyncButton")?.addEventListener("click",()=>restartSync().catch(()=>showSyncMessage("No se completó el reinicio. Tus respuestas se conservan.")));
  $("syncNowButton")?.addEventListener("click",()=>syncAll({manual:true}));
  document.addEventListener("click",e=>{if(!e.target.closest(".network-hub"))togglePanel(false);});

  scope.addEventListener("online",()=>{requestBackgroundSync();refreshUi();setTimeout(()=>syncAll(),350);});
  scope.addEventListener("offline",refreshUi);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){requestBackgroundSync();refreshUi();if(navigator.onLine)syncAll();}});

  scope.addEventListener("beforeinstallprompt",event=>{
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
  scope.addEventListener("appinstalled",()=>{$("installAppButton") && ($("installAppButton").hidden=true);});

  if("serviceWorker" in navigator && location.protocol==="https:"){
    navigator.serviceWorker.register("/service-worker.js").then(reg=>{requestBackgroundSync();reg.update().catch(()=>{});}).catch(()=>{});
    navigator.serviceWorker.addEventListener("message",async event=>{
      if(event.data?.type!=="FIBRAZO_QUEUE_CHANGED")return;
      await refreshUi();const result=await completion(event.data.id);
      scope.dispatchEvent(new CustomEvent("fibrazo:queue-change",{detail:{id:event.data.id,status:event.data.status,result}}));
    });
    scope.addEventListener("pagehide",requestBackgroundSync);
  }

  scope.firebase?.auth?.().onAuthStateChanged(user=>{
    if($("competitionSyncButton"))$("competitionSyncButton").hidden=String(user?.email||"").toLowerCase()!=="eduardo@fibrazo.com";
    setTimeout(refreshUi,120);
    if(user&&navigator.onLine)setTimeout(()=>syncAll(),700);
  });

  scope.addEventListener("focus",()=>{requestBackgroundSync();if(navigator.onLine)syncAll();});
  setTimeout(refreshUi,200);
  setInterval(()=>{if(navigator.onLine&&document.visibilityState==="visible")syncAll();},60000);


})();
