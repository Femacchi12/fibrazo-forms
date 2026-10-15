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
    menu.className="map-typeahead-options";menu.setAttribute("role","listbox");menu.setAttribute("aria-multiselectable","true");menu.hidden=true;
    const selections=document.createElement("div");
    selections.className="map-typeahead-selections";selections.setAttribute("aria-live","polite");
    select.before(wrap);wrap.append(heading,selections,input,menu,select);
    select.classList.add("map-native-select-hidden");
    select.tabIndex=-1;
    select._searchInput=input;
    let active=0;
    const values=()=>[...select.selectedOptions].map(option=>option.value).filter(value=>value&&value!=="all");
    const close=()=>{menu.hidden=true;input.setAttribute("aria-expanded","false");input.value="";};
    const sync=()=>{
      wrap.hidden=select.hidden;
      const chosen=values();
      selections.replaceChildren(...chosen.map(value=>{
        const option=[...select.options].find(item=>item.value===value);
        const chip=document.createElement("button");
        chip.type="button";chip.dataset.removeValue=value;
        chip.setAttribute("aria-label","Quitar "+(option?.textContent||value));
        chip.textContent=(option?.textContent||value)+" ×";
        return chip;
      }));
      selections.hidden=chosen.length===0;
      input.placeholder=chosen.length?"Agregar otra opción…":"Escribe para buscar…";
      if(menu.hidden)input.value="";
    };
    const choose=value=>{
      const option=[...select.options].find(item=>item.value===value);
      if(!option)return;
      if(value==="all"){
        for(const item of select.options)item.selected=item.value==="all";
      }else{
        option.selected=!option.selected;
        const all=[...select.options].find(item=>item.value==="all");
        if(all)all.selected=false;
        if(!values().length&&all)all.selected=true;
      }
      input.value="";sync();draw();
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
        button.setAttribute("aria-selected",String(opt.selected));
        menu.appendChild(button);
      });
      if(!opts.length){const msg=document.createElement("p");msg.textContent="No hay coincidencias";menu.appendChild(msg);}
      active=0;menu.hidden=false;input.setAttribute("aria-expanded","true");
    };
    input.addEventListener("focus",()=>{input.value="";draw();});
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
    selections.addEventListener("click",event=>{
      const button=event.target.closest("button[data-remove-value]");
      if(button)choose(button.dataset.removeValue);
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
    // Las capas se agrupan como desplegables multiselección. Los botones
    // originales siguen siendo la fuente única del estado, pero no se duplican.
    const switches=panels.layers?.querySelector(".map-layer-switches");
    if(switches&&!switches.dataset.grouped){
      switches.dataset.grouped="1";
      for(const [key,title,controlId] of [["barrios","Barrios","mapBarrioControls"],["estratos","Estratos","mapEstratoControls"]]){
        const toggle=$(key==="barrios"?"mapLayerBarrios":"mapLayerEstratos");
        const content=$(controlId);if(!toggle||!content)continue;
        const disclosure=document.createElement("details");disclosure.className="map-layer-disclosure";
        const summary=document.createElement("summary");
        const label=document.createElement("span");label.textContent=title;
        const count=document.createElement("small");count.textContent="0 seleccionados";
        summary.append(label,count);
        toggle.hidden=true;toggle.setAttribute("aria-hidden","true");toggle.tabIndex=-1;
        disclosure.append(summary,toggle,content);
        switches.appendChild(disclosure);
        const updateCount=()=>{
          const fromState=Number(content.dataset.selectedCount);
          const selected=Number.isFinite(fromState)?fromState:content.querySelectorAll('input[data-layer-option]:checked').length;
          count.textContent=selected+" seleccionado"+(selected===1?"":"s");
        };
        disclosure.addEventListener("toggle",()=>{
          if(disclosure.open&&toggle.getAttribute("aria-pressed")!=="true")toggle.click();
          updateCount();
        });
        content.addEventListener("change",updateCount);
        new MutationObserver(updateCount).observe(content,{childList:true,subtree:true});
        updateCount();
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
    const content=$("mapFloatingContent"),minimize=$("mapFloatingMinimize");
    const openButton=document.createElement("button");
    openButton.id="mapFloatingOpen";openButton.type="button";openButton.textContent="☰";
    openButton.setAttribute("aria-label","Abrir controles del mapa");
    openButton.hidden=true;
    handle.prepend(openButton);
    function setCollapsed(collapsed){
      content.hidden=collapsed;
      panel.classList.toggle("is-collapsed",collapsed);
      openButton.hidden=!collapsed;
      minimize.hidden=collapsed;
      minimize.setAttribute("aria-expanded",String(!collapsed));
      if(collapsed){handle.querySelector("span").hidden=true;}
      else {handle.querySelector("span").hidden=false;minimize.textContent="−";}
    }
    minimize?.addEventListener("click",()=>setCollapsed(true));
    openButton.addEventListener("click",()=>setCollapsed(false));
    setCollapsed(false);
    $("mapFiltersToggle")?.addEventListener("click",()=>show("filters"));
    $("mapLayersToggle")?.addEventListener("click",()=>show("layers"));
    // Panel de mapa anclado a la esquina superior izquierda: no se arrastra.
    // FO-CHG-034: navegación compacta superpuesta al mapa.
    const canvas=$("mapCanvasWrap"),search=document.querySelector(".map-search-shell");
    const locate=$("mapLocateMe"),route=document.querySelector(".map-location-toolbar");
    if(canvas&&search){
      const dock=document.createElement("div");dock.className="map-search-dock";
      const toggle=document.createElement("button");toggle.type="button";toggle.className="map-dock-icon";toggle.textContent="⌕";toggle.setAttribute("aria-label","Buscar ubicación");
      search.hidden=true;dock.append(toggle,search);canvas.appendChild(dock);
      toggle.addEventListener("click",()=>{search.hidden=!search.hidden;toggle.setAttribute("aria-expanded",String(!search.hidden));if(!search.hidden)$("mapSearchInput")?.focus();});
    }
    if(canvas&&locate&&route){
      const dock=document.createElement("div");dock.className="map-tools-dock";
      locate.textContent="⊙";locate.className="map-dock-icon";locate.setAttribute("aria-label","Mi ubicación");locate.title="Mi ubicación";
      const more=document.createElement("details");more.className="map-route-disclosure";
      const summary=document.createElement("summary");summary.textContent="⋮";summary.setAttribute("aria-label","Controles de recorrido");summary.title="Controles de recorrido";
      more.append(summary,route);
      dock.append(locate,more);canvas.appendChild(dock);
    }
    // FO-CHG-036: acompasar la lupa a la apertura del panel y exponer recorrido.
    if(canvas){
      const floating=$("mapFloatingTools"),searchDock=canvas.querySelector(".map-search-dock");
      const locationDock=canvas.querySelector(".map-tools-dock");
      const syncMapDocks=()=>{
        const collapsed=floating?.classList.contains("is-collapsed");
        if(searchDock)searchDock.classList.toggle("beside-panel",!collapsed);
        if(locationDock)locationDock.classList.toggle("below-search",!collapsed);
      };
      const observer=new MutationObserver(syncMapDocks);
      if(floating)observer.observe(floating,{attributes:true,attributeFilter:["class"]});
      syncMapDocks();
      const routeDetails=locationDock?.querySelector(".map-route-disclosure");
      if(routeDetails){
        const button=routeDetails.querySelector("summary");
        if(button){button.textContent="☷";button.title="Iniciar, limpiar o seguir recorrido";button.setAttribute("aria-label","Abrir controles de recorrido");}
      }
    }
    document.querySelectorAll("#mapRefresh,#mapFitPoints").forEach(button=>button.hidden=true);
    show("filters");
  }
  function init(){
    ids.forEach(id=>searchable($(id)));
    floatingPanel();
    for(const id of ["mapClearFilters","mapQuickReset"]){
      $(id)?.addEventListener("click",()=>ids.forEach(key=>{
        const select=$(key);
        if(select?._searchInput)select._searchInput.value="";
      }));
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
