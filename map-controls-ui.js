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
    const heading=document.createElement("label");
    heading.className="map-search-label";
    heading.textContent=select.getAttribute("aria-label")||"Filtrar";
    const input=document.createElement("input");
    const uniqueId="search-"+select.id;
    input.id=uniqueId;
    heading.htmlFor=uniqueId;
    input.type="search"; input.autocomplete="off";
    input.placeholder="Escribe para buscar…";
    input.setAttribute("aria-label",select.getAttribute("aria-label")||"Buscar opción del filtro");
    input.setAttribute("aria-haspopup","listbox");
    input.setAttribute("aria-expanded","false");
    const menu=document.createElement("div");
    menu.className="map-typeahead-options"; menu.setAttribute("role","listbox");menu.hidden=true;
    select.before(wrap);wrap.append(heading,input,menu,select);
    select.classList.add("map-native-select-hidden");
    select.tabIndex=-1;
    select._searchInput=input;
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
    input.addEventListener("focus",()=>{input.select();draw();});
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
    // Las opciones secundarias se pueden plegar sin duplicar controles.
    const filters=panels.filters?.querySelector(".map-filters");
    if(filters&&!filters.querySelector(".map-extra-filters")){
      const section=document.createElement("details");
      section.className="map-extra-filters";
      const title=document.createElement("summary");title.textContent="Opciones adicionales · fotos, QA y fechas";
      const body=document.createElement("div");body.className="map-extra-content";
      for(const id of ["mapPhotosFilter","mapShowTests"]){
        const input=$(id);
        if(input?.parentElement)body.appendChild(input.parentElement);
      }
      for(const [id,label] of [["mapDateFrom","Desde"],["mapDateTo","Hasta"]]){
        const input=$(id);if(!input)continue;
        const wrap=document.createElement("label");wrap.className="map-extra-date";
        wrap.append(document.createTextNode(label),input);body.appendChild(wrap);
      }
      section.append(title,body);filters.appendChild(section);
    }
    // Las capas se agrupan como listas desplegables; sus botones siguen siendo
    // los mismos controles y mantienen aria-pressed / estado de mapa.
    const switches=panels.layers?.querySelector(".map-layer-switches");
    if(switches&&!switches.dataset.grouped){
      switches.dataset.grouped="1";
      for(const [key,title,controlId] of [["barrios","Barrios","mapBarrioControls"],["estratos","Estratos","mapEstratoControls"]]){
        const toggle=$(key==="barrios"?"mapLayerBarrios":"mapLayerEstratos");
        const content=$(controlId);if(!toggle||!content)continue;
        const disclosure=document.createElement("details");disclosure.className="map-layer-disclosure";
        const summary=document.createElement("summary");summary.textContent=title+" · ver opciones";
        disclosure.append(summary,toggle,content);
        switches.appendChild(disclosure);
        toggle.addEventListener("click",()=>{disclosure.open=true;});
      }
    }
    // Referencia solo en su pestaña: no ocupa espacio en filtros ni capas.
    const strata=document.createElement("details");
    strata.className="map-reference-group map-strata-index";
    strata.setAttribute("aria-label","Índice de estratos");
    const strataSummary=document.createElement("summary");
    strataSummary.innerHTML="<span>Índice de estratos</span><small>6 colores</small>";
    const strataList=document.createElement("div");
    strataList.className="map-reference-list";
    const colors=window.FIBRAZO_MAP_ESTRATO_COLORS||{};
    for(const key of ["1","2","3","4","5","6"]){
      const item=document.createElement("div"),swatch=document.createElement("i");
      item.className="map-reference-row";
      swatch.style.background=colors[key]||"#888";
      item.append(swatch,document.createTextNode("Estrato "+key));
      strataList.appendChild(item);
    }
    strata.append(strataSummary,strataList);
    panels.legend?.prepend(strata);

    function show(which){
      Object.entries(panels).forEach(([name,element])=>{if(element)element.hidden=name!==which;});
      if(which==="legend"&&$("mapPointLegendPanel"))$("mapPointLegendPanel").hidden=false;
      panel.querySelectorAll("[data-floating-tab]").forEach(button=>{
        const selected=button.dataset.floatingTab===which;
        button.classList.toggle("active",selected);
        button.setAttribute("aria-selected",String(selected));
      });
      panel.dataset.activeTab=which;
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
      const top=Math.min(Math.max(4,start.top+event.clientY-start.y),Math.max(4,bounds.clientHeight-panel.offsetHeight-4));
      panel.style.left=left+"px";panel.style.top=top+"px";panel.style.right="auto";panel.style.bottom="auto";
      panel.style.maxHeight=Math.max(120,bounds.clientHeight-top-4)+"px";
    });
    for(const type of ["pointerup","pointercancel"])handle.addEventListener(type,()=>start=null);
    show("filters");
  }
  function init(){
    ids.forEach(id=>searchable($(id)));
    floatingPanel();
    for(const id of ["mapClearFilters","mapQuickReset"]){
      $(id)?.addEventListener("click",()=>ids.forEach(key=>{
        const select=$(key);
        if(select?._searchInput)select._searchInput.value=select.selectedOptions?.[0]?.textContent||"";
      }));
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
