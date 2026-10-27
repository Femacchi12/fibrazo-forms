/* MAP-109: presentation only. Keep existing authenticated controls and IDs. */
(()=>{
  const $=id=>document.getElementById(id);
  function init(){
    const header=document.querySelector('.hero-header'),session=$('authSession');
    if(!header||!session)return;
    document.body.classList.add('executive-shell');
    const menu=document.createElement('details');menu.className='user-menu';
    const summary=document.createElement('summary');summary.setAttribute('aria-label','Abrir menú de usuario');
    const avatar=document.createElement('span');avatar.className='user-avatar';avatar.textContent='F';
    summary.append(avatar,document.createTextNode('⌄'));menu.append(summary);
    const card=document.createElement('div');card.className='user-menu-card';
    const title=document.createElement('strong');title.textContent='Mi cuenta';card.append(title);
    const metrics=document.querySelector('.update-cards');if(metrics)card.append(metrics);
    card.append(session);const pending=document.querySelector('.pending-hub');if(pending)card.append(pending);
    menu.append(card);header.append(menu);
    const email=$('signedInEmail');const update=()=>{avatar.textContent=(email?.textContent.trim()[0]||'F').toUpperCase();summary.title=email?.textContent||'Mi cuenta';};
    if(email)new MutationObserver(update).observe(email,{childList:true,subtree:true,characterData:true});update();
    document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;summary.focus();}});
    const nav=document.querySelector('.view-switch');
    const reports=nav?.querySelector('[data-view="results"]');if(reports){reports.textContent='Reportes';reports.setAttribute('aria-label','Resultados y reportes');}
    if(nav){const link=document.createElement('a');link.href='https://femacchi12.github.io/dashboard-competencia-fibrazo/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Competencia ↗';nav.append(link);}
    const quick=document.querySelector('.map-quick-actions');
    if(quick){const only=$('mapOnlyView'),share=$('mapShareOnly');if(only)quick.prepend(only);if(share)quick.append(share);}
    const controls=$('mapFloatingContent'),headActions=document.querySelector('.map-head-actions');
    if(controls&&headActions){headActions.classList.add('executive-secondary-actions');controls.append(headActions);}
    // Stable form IDs provide visual identity only; no business classification changes.
    const identities={
      CHURN:['churn','<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>'],
      EXPLORACION:['virtual','<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>'],
      EXPLORACION_PRESENCIAL:['field','<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'],
      INTELIGENCIA_OPERADOR:['operator','<path d="M5 17a10 10 0 0 1 14 0M2 12a15 15 0 0 1 20 0M8 21a6 6 0 0 1 8 0"/>']
    };
    function decorateCards(){
      document.querySelectorAll('#formCards .form-card,#adminForms .admin-form-card').forEach(card=>{
        const identity=identities[card.dataset.formId];if(!identity)return;
        card.dataset.designKind=identity[0];
        const title=card.querySelector('.form-card-title,.admin-accordion-head h3');
        if(!title||title.querySelector('.form-identity-icon'))return;
        const icon=document.createElement('span');icon.className='form-identity-icon';icon.setAttribute('aria-hidden','true');
        icon.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+identity[1]+'</svg>';
        title.prepend(icon);
      });
    }
    ['formCards','adminForms'].forEach(id=>{const host=$(id);if(host)new MutationObserver(decorateCards).observe(host,{childList:true,subtree:true});});decorateCards();
    const view=$('mapView'),wrap=$('mapCanvasWrap');
    const layout=()=>document.body.classList.toggle('executive-map-view',!!view&&!view.hidden);
    window.addEventListener('fibrazo:view-change',layout);if(view)new MutationObserver(layout).observe(view,{attributes:true,attributeFilter:['hidden']});layout();
    const panel=$('mapFloatingTools');if(panel&&wrap){const dock=()=>{wrap.classList.toggle('map-sidebar-open',!panel.classList.contains('is-collapsed'));window.dispatchEvent(new Event('resize'));};new MutationObserver(dock).observe(panel,{attributes:true,attributeFilter:['class']});dock();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
