(() => {
  "use strict";
  // FO-PEN-007/009: los selectores se conservan como fuente única del valor.
  const $=id=>document.getElementById(id);
  const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const ids=["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter"];
  function searchable(select){
    if(!select||select.dataset.typeaheadReady)return;
    select.dataset.typeaheadReady="1";
    const wrap=document.createElement("div");
    wrap.className="map-typeahead";
    const input=document.createElement("input");
    input.type="search"; input.autocomplete="off";
    input.placeholder="Escribí para buscar…";
    input.setAttribute("aria-label",select.getAttribute("aria-label")||"Buscar opción del filtro");
    input.setAttribute("aria-haspopup","listbox");
    input.setAttribute("aria-expanded","false");
    const menu=document.createElement("div");
    menu.className="map-typeahead-options"; menu.setAttribute("role","listbox");menu.hidden=true;
    select.before(wrap);wrap.append(input,menu,select);
    select.classList.add("map-native-select-hidden");
    let active=0;
    const close=()=>{menu.hidden=true;input.setAttribute("aria-expanded","false");};
    const sync=()=>{
      wrap.hidden=select.hidden;
      if(menu.hidden)input.value=select.selectedOptions?.[0]?.textContent||"";
    };
    const choose=value=>{
      if(![...select.options].some(option=>option.value===value))return;
      select.value=value;close();sync();
      select.dispatchEvent(new Event("change",{bubbles:true}));
    };
    const draw=()=>{
      const query=norm(input.value);
      const opts=[...select.options].filter(o=>norm(o.textContent).includes(query)).slice(0,100);
      menu.replaceChildren();
      opts.forEach(opt=>{
        const button=document.createElement("button");
        button.type="button";button.dataset.value=opt.value;
        button.textContent=opt.textContent;
        button.setAttribute("role","option");
        button.setAttribute("aria-selected",String(opt.value===select.value));
        menu.appendChild(button);
      });
      if(!opts.length){const msg=document.createElement("p");msg.textContent="No hay coincidencias";menu.appendChild(msg);}
      active=0;menu.hidden=false;input.setAttribute("aria-expanded","true");
    };
    input.addEventListener("focus",draw);
    input.addEventListener("input",draw);
    input.addEventListener("keydown",event=>{
      const buttons=[...menu.querySelectorAll("button")];
      if(event.key==="Escape"){close();sync();return;}
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        event.preventDefault();
        if(menu.hidden)draw();
        active=Math.max(0,Math.min(buttons.length-1,active+(event.key==="ArrowDown"?1:-1)));
        buttons[active]?.scrollIntoView({block:"nearest"});return;
      }
      if(event.key==="Enter"&&!menu.hidden){
        event.preventDefault();
        if(buttons[active])choose(buttons[active].dataset.value);
      }
    });
    menu.addEventListener("pointerdown",event=>event.preventDefault());
    menu.addEventListener("click",event=>{
      const button=event.target.closest("button[data-value]");
      if(button)choose(button.dataset.value);
    });
    input.addEventListener("blur",()=>setTimeout(()=>{close();sync();},130));
    select.addEventListener("change",sync);
    new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
    sync();
  }
  function floatingPanel(){
    const panel=$("mapFloatingTools"),host=$("mapFloatingHost"),handle=$("mapFloatingHandle");
    if(!panel||!host||!handle)return;
    const panels={
      filters:$("mapFiltersPanel"),
      layers:$("mapLayersPanel"),
      legend:document.querySelector(".map-point-legend-card")
    };
    for(const child of Object.values(panels))if(child)host.appendChild(child);
    // Referencia constante; comparte colores con los polígonos del mapa.
    const mini=document.createElement("div");
    mini.className="map-mini-legend";
    mini.setAttribute("aria-label","Referencias de estratos");
    const colors=window.FIBRAZO_MAP_ESTRATO_COLORS||{};
    for(const key of ["1","2","3","4","5","6"]){
      const item=document.createElement("span"),swatch=document.createElement("i");
      swatch.style.background=colors[key]||"#888";
      item.append(swatch,document.createTextNode("Estrato "+key));
      mini.appendChild(item);
    }
    panel.querySelector(".map-floating-tabs")?.after(mini);

    function show(which){
      Object.entries(panels).forEach(([name,element])=>{if(element)element.hidden=name!==which;});
      if(which==="legend"&&$("mapPointLegendPanel"))$("mapPointLegendPanel").hidden=false;
      panel.querySelectorAll("[data-floating-tab]").forEach(button=>button.classList.toggle("active",button.dataset.floatingTab===which));
    }
    panel.querySelectorAll("[data-floating-tab]").forEach(button=>button.addEventListener("click",()=>show(button.dataset.floatingTab)));
    $("mapFloatingMinimize")?.addEventListener("click",()=>{
      const content=$("mapFloatingContent");
      content.hidden=!content.hidden;
      $("mapFloatingMinimize").textContent=content.hidden?"+":"−";
      $("mapFloatingMinimize").setAttribute("aria-expanded",String(!content.hidden));
    });
    $("mapFiltersToggle")?.addEventListener("click",()=>show("filters"));
    $("mapLayersToggle")?.addEventListener("click",()=>show("layers"));
    let start=null;
    handle.addEventListener("pointerdown",event=>{
      if(event.target.closest("button")||(event.pointerType==="touch"&&window.innerWidth<700))return;
      start={x:event.clientX,y:event.clientY,left:panel.offsetLeft,top:panel.offsetTop};
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove",event=>{
      if(!start)return;
      const bounds=panel.parentElement;
      const left=Math.min(Math.max(4,start.left+event.clientX-start.x),Math.max(4,bounds.clientWidth-panel.offsetWidth-4));
      const top=Math.min(Math.max(4,start.top+event.clientY-start.y),Math.max(4,bounds.clientHeight-80));
      panel.style.left=left+"px";panel.style.top=top+"px";panel.style.right="auto";
    });
    for(const type of ["pointerup","pointercancel"])handle.addEventListener(type,()=>start=null);
    show("filters");
  }
  function init(){ids.forEach(id=>searchable($(id)));floatingPanel();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();