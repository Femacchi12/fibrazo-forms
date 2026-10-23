// Local-only rescue: no server credentials, submissions or private data are read here.
const crypto=require('node:crypto');
module.exports=(req,res)=>{
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const nonce=crypto.randomBytes(18).toString('base64');
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'none'; img-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
 return res.status(200).send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rescate local · FIBRAZO</title><style nonce="${nonce}">body{background:#111;color:#fff;font:18px system-ui;max-width:650px;margin:24px auto;padding:20px;line-height:1.5}h1{color:#43ffa5;font-size:28px}button{display:block;width:100%;padding:18px;margin:18px 0;border:1px solid #43ffa5;border-radius:12px;background:#18251e;color:white;font:inherit}button:disabled{opacity:.4}strong{color:#43ffa5}#status{white-space:pre-wrap;border:1px solid #555;padding:16px;border-radius:12px}</style><h1>Rescate de formularios</h1><p>Esta página lee únicamente la copia local de <strong>eduardo@fibrazo.com</strong> en este navegador. No envía datos al servidor.</p><p>No cierres la pestaña antigua. Primero descarga el respaldo y comprueba que aparezca en Descargas.</p><div id="status" role="status">Pulsa Revisar almacenamiento.</div><button id="inspect">1. Revisar almacenamiento</button><button id="backup" disabled>2. Descargar respaldo completo</button><label><input type="checkbox" id="confirmed" disabled> Ya comprobé que el archivo está en Descargas.</label><button id="repair" disabled>3. Reparar actualización</button><p>La reparación conserva los formularios, fotos, sesión y permisos locales. Solo renueva la aplicación guardada para este dominio.</p><script nonce="${nonce}">
 const EMAIL='eduardo@fibrazo.com',DB='fibrazoFormsOffline',STORE='queue';
 const $=id=>document.getElementById(id);let snapshot=null,downloaded=false;
 async function readLocalQueue(){
  if(indexedDB.databases){const dbs=await indexedDB.databases();if(!dbs.some(d=>d.name===DB))throw Error('No se encontró la base local. No cierres la pestaña antigua; informa este resultado a soporte.');}
  return new Promise((resolve,reject)=>{
   const request=indexedDB.open(DB);
   request.onupgradeneeded=()=>{request.transaction.abort();reject(Error('No se encontró una base existente. No se creó ni modificó ninguna base.'));};
   request.onblocked=()=>reject(Error('Otra pestaña bloquea la lectura. No borres datos.'));
   request.onerror=()=>reject(request.error||Error('No se pudo leer la base local.'));
   request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){db.close();reject(Error('No se encontró la cola local.'));return;}
    const tx=db.transaction(STORE,'readonly'),get=tx.objectStore(STORE).getAll();let rows;
    get.onsuccess=()=>{rows=get.result;};
    tx.oncomplete=()=>{db.close();resolve((rows||[]).filter(r=>r.kind!=='lease'&&String(r.userEmail||'').toLowerCase()===EMAIL));};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('Falló la lectura local.'));};
   };
  });
 }
 async function inspect(){
  $('inspect').disabled=true;
  try{snapshot=await readLocalQueue();const pending=snapshot.filter(r=>r.status!=='sent');
   $('status').textContent='Registros locales: '+snapshot.length+'\\nPendientes o recibidos con revisión: '+pending.length+'\\nNo se borró ni se envió ningún registro.';
   $('backup').disabled=snapshot.length===0;
   if(!snapshot.length)$('status').textContent+='\\nNo continúes con la reparación. Conserva la pestaña antigua y comunica este resultado.';
  }catch(e){$('status').textContent=e.message;}finally{$('inspect').disabled=false;}
 }
 $('inspect').onclick=inspect;
 $('backup').onclick=async()=>{
  $('backup').disabled=true;
  try{const records=await readLocalQueue();if(!records.length)throw Error('No hay registros locales para respaldar. No continúes con la reparación.');
   const data={format:'FIBRAZO_LOCAL_RESCUE_V1',exportedAt:new Date().toISOString(),origin:location.origin,owner:EMAIL,recordCount:records.length,records};
   const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='FIBRAZO_respaldo_local_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   downloaded=true;$('confirmed').disabled=false;$('status').textContent='Se inició la descarga de '+records.length+' registros con sus datos y fotos locales. Comprueba el archivo en Descargas antes de continuar. No compartas este respaldo públicamente.';
  }catch(e){$('status').textContent=e.message;}finally{$('backup').disabled=false;}
 };
 $('confirmed').onchange=()=>{$('repair').disabled=!(downloaded&&$('confirmed').checked);};
 $('repair').onclick=async()=>{
  if(!downloaded||!$('confirmed').checked)return;$('repair').disabled=true;
  try{
   const records=await readLocalQueue();if(!records.length)throw Error('La cola local cambió o quedó vacía. No se reparó la aplicación; conserva el respaldo.');
   const regs=await navigator.serviceWorker.getRegistrations();
   for(const reg of regs){const path=new URL(reg.scope).pathname;if(path==='/')await reg.unregister();}
   for(const key of await caches.keys())if(key.startsWith('fibrazo-forms-'))await caches.delete(key);
   $('status').textContent='Aplicación antigua retirada; '+records.length+' registros locales conservados. Abriendo la versión actual…';
   location.replace('/?rescate='+Date.now());
  }catch(e){$('status').textContent=e.message;$('repair').disabled=false;}
 };
 </script></html>`);
};
