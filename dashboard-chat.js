// Shared read-only widget. Firebase session stays on the current dashboard's origin.
(()=>{'use strict';
 const script=document.currentScript,base=new URL(script.src).origin,scope=script.dataset.scope||'exploration';
 const endpoint=base+'/api/access?chat=1&scope='+scope;
 const css=document.createElement('link');css.rel='stylesheet';css.href=base+'/dashboard-chat.css?v=107';document.head.append(css);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
 const trigger=el('button','fbz-chat-launch','Consultar datos');trigger.type='button';trigger.hidden=true;trigger.setAttribute('aria-haspopup','dialog');document.body.append(trigger);
 const overlay=el('div','fbz-chat-overlay');overlay.hidden=true;
 const panel=el('section','fbz-chat-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','fbz-chat-title');overlay.append(panel);
 const header=el('header','fbz-chat-header');const title=el('h2','',scope==='competition'?'Asistente de competencia':'Asistente de exploración');title.id='fbz-chat-title';
 const close=el('button','fbz-chat-close','Cerrar ×');close.type='button';header.append(title,close);panel.append(header);
 panel.append(el('p','fbz-chat-intro','Consulta los datos recibidos. Las respuestas muestran sus fuentes y fecha de lectura.'));
 const context=el('div','fbz-chat-context'),label=el('label','','Ciudad de contexto');label.htmlFor='fbz-chat-city';const city=el('select','');city.id='fbz-chat-city';context.append(label,city);panel.append(context);
 const shortcuts=el('div','fbz-chat-shortcuts');panel.append(shortcuts);
 const log=el('div','fbz-chat-log');log.setAttribute('role','log');log.setAttribute('aria-label','Conversación');log.setAttribute('aria-live','polite');panel.append(log);
 const form=el('form','fbz-chat-form'),input=el('textarea','');input.rows=2;input.maxLength=1200;input.placeholder='Ej.: ¿Qué operadores aparecen en estrato 1 en Neiva?';input.setAttribute('aria-label','Tu pregunta');
 const send=el('button','','Consultar');send.type='submit';form.append(input,send);panel.append(form);
 const status=el('p','fbz-chat-status','');status.setAttribute('role','status');panel.append(status);document.body.append(overlay);
 let catalog=null,busy=false,controller=null,epoch=0,email='',lastContext=null,opener=null;
 function clear(){epoch++;controller?.abort();busy=false;catalog=null;lastContext=null;log.replaceChildren();city.replaceChildren();input.value='';send.disabled=false;status.textContent='';}
 function hide(){overlay.hidden=true;opener?.focus();}
 close.onclick=hide;overlay.onclick=e=>{if(e.target===overlay)hide();};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hide();}if(e.key==='Tab'){const items=[...panel.querySelectorAll('button,select,textarea,a')].filter(n=>!n.disabled&&!n.hidden);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 function auth(){return window.firebase?.auth?.().currentUser;}
 async function request(body){
  const user=auth();if(!user||user.email!==email)throw Error('Inicia sesión para consultar.');
  controller=new AbortController();const active=controller;let timer;
  const job=(async()=>{const token=await user.getIdToken();if(active.signal.aborted||auth()?.uid!==user.uid)throw Error('La sesión cambió.');
   const response=await fetch(endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({...body,scope})}:{}),signal:active.signal,cache:'no-store'});
   const result=await response.json();if(!response.ok)throw Error(result.error||'No fue posible consultar.');return result;})();
  try{return await Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>{active.abort();reject(Error('La consulta tardó demasiado. Intenta nuevamente.'));},35000);})]);}finally{clearTimeout(timer);}
 }
 const append=(tag,cls,text)=>{const n=el(tag,cls,text);log.append(n);return n;};
 function answer(a){
  const block=append('article','fbz-chat-answer');block.append(el('h3','',a.title),el('p','fbz-chat-text',a.text));
  for(const table of a.tables||[]){block.append(el('h4','',table.title));const wrap=el('div','fbz-chat-table-wrap');wrap.tabIndex=0;wrap.setAttribute('aria-label',table.title);const t=el('table','');const head=el('thead',''),hr=el('tr','');for(const col of table.columns)hr.append(el('th','',col));head.append(hr);t.append(head);const body=el('tbody','');for(const row of table.rows){const tr=el('tr','');for(const value of row)tr.append(el('td','',value));body.append(tr);}t.append(body);wrap.append(t);block.append(wrap);}
  if(a.notes?.length){const list=el('ul','fbz-chat-notes');for(const note of a.notes)list.append(el('li','',note));block.append(list);}
  const sources=el('div','fbz-chat-sources');for(const source of a.sources||[]){try{const url=new URL(source.url);if(url.protocol!=='https:'||url.hostname!=='docs.google.com')continue;const link=el('a','',source.label+' ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';sources.append(link);}catch(_){}}
  block.append(sources,el('p','fbz-chat-meta',`${a.mode==='ai'?'Consulta interpretada con IA':'Consulta básica'} · Datos leídos: ${new Date(a.updatedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'})}`));
  if(a.notice)block.append(el('p','fbz-chat-notice',a.notice));
  while(log.children.length>16)log.firstChild.remove();block.scrollIntoView({block:'nearest'});
 }
 async function ask(question,query){
  if(busy||!catalog)return;const run=epoch;busy=true;send.disabled=true;status.textContent='Consultando los datos…';append('p','fbz-chat-question',question);
  const context={cities:city.value?[city.value]:lastContext?.cities||[],period:lastContext?.period||''};
  try{const a=await request({question,context,...(query?{query:{...query,cities:context.cities,period:context.period}}:{})});if(run!==epoch)return;answer(a);lastContext=a.query;status.textContent='';input.value='';}
  catch(e){if(run===epoch){append('p','fbz-chat-error',e.message||'No hay conexión. Intenta nuevamente.');status.textContent='';}}
  finally{if(run===epoch){busy=false;send.disabled=false;}}
 }
 const shortcutsList=scope==='competition'?[['Competencia de la ciudad','summary'],['Menor precio de Internet','prices'],['Operadores por estrato','strata']]:[['Resumen de operadores','summary'],['Operadores por estrato','strata']];
 for(const [text,intent]of shortcutsList){const b=el('button','',text);b.type='button';b.onclick=()=>ask(text,{intent,operator:'',stratum:'',priceKind:'regular',service:'internet'});shortcuts.append(b);}
 form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(q)ask(q);};
 city.onchange=()=>{lastContext=null;};
 trigger.onclick=async()=>{
  opener=document.activeElement;overlay.hidden=false;close.focus();if(catalog)return;const run=epoch;status.textContent='Cargando ciudades…';
  try{const a=await request();if(run!==epoch)return;catalog=a;city.append(new Option('Indica una ciudad en tu pregunta',''));for(const name of a.cities)city.append(new Option(name,name));
   let selected=[];if(scope==='competition')selected=[...(window.FZ?.state?.filters?.city||[])];else selected=[...(document.getElementById('mapCityFilter')?.selectedOptions||[])].map(o=>o.textContent.trim());
   if(selected.length===1){const match=a.cities.find(c=>c.toLocaleLowerCase()===selected[0].toLocaleLowerCase());if(match)city.value=match;}
   status.textContent=a.aiAvailable?'Puedes escribir una pregunta o usar una consulta básica.':'Consultas básicas disponibles. La conexión de IA aún no está activada.';
  }catch(e){if(run===epoch)status.textContent=e.message;}
 };
 if(window.firebase?.apps?.length)firebase.auth().onAuthStateChanged(user=>{clear();email=user?.email||'';trigger.hidden=!user;overlay.hidden=true;});
})();
