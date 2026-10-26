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
    if(nav){const link=document.createElement('a');link.href='https://femacchi12.github.io/dashboard-competencia-fibrazo/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Competencia ↗';nav.append(link);}
    const quick=document.querySelector('.map-quick-actions');
    if(quick){const only=$('mapOnlyView'),share=$('mapShareOnly');if(only)quick.prepend(only);if(share)quick.append(share);}
    const controls=$('mapFloatingContent'),headActions=document.querySelector('.map-head-actions');
    if(controls&&headActions){headActions.classList.add('executive-secondary-actions');controls.append(headActions);}
    const view=$('mapView'),wrap=$('mapCanvasWrap');
    const layout=()=>document.body.classList.toggle('executive-map-view',!!view&&!view.hidden);
    window.addEventListener('fibrazo:view-change',layout);if(view)new MutationObserver(layout).observe(view,{attributes:true,attributeFilter:['hidden']});layout();
    const panel=$('mapFloatingTools');if(panel&&wrap){const dock=()=>{wrap.classList.toggle('map-sidebar-open',!panel.classList.contains('is-collapsed'));window.dispatchEvent(new Event('resize'));};new MutationObserver(dock).observe(panel,{attributes:true,attributeFilter:['class']});dock();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
