(() => {
  "use strict";
  // FO-PEN-007/009: los selectores se conservan como fuente única del valor.
  const $=id=>document.getElementById(id);
  const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const ids=["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter"];
  const selectedCityCount=()=>[...($("mapCityFilter")?.selectedOptions||[])].filter(option=>option.value&&option.value!=="all").length;
  const cityLockMessage=()=>selectedCityCount()>1?
    "Debe dejar seleccionada una sola ciudad.":
    "Debe seleccionar al menos una ciudad.";
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
      const locked=select.disabled||select.dataset.cityScope==="locked";
      wrap.classList.toggle("is-locked",locked);
      input.disabled=locked;
      input.title=locked?cityLockMessage():"";
      if(locked)close();
      const chosen=values();
      selections.replaceChildren(...chosen.map(value=>{
        const option=[...select.options].find(item=>item.value===value);
        const chip=document.createElement("button");
        chip.type="button";chip.dataset.removeValue=value;
        chip.setAttribute("aria-label","Quitar "+(option?.textContent||value));
        chip.textContent=(option?.textContent||value)+" ×";
        return chip;
      }));
      const compactCity=select.id==="mapCityFilter";
      selections.hidden=chosen.length===0||compactCity;
      input.placeholder=compactCity?"Escribe para buscar…":chosen.length?"Agregar otra opción…":"Escribe para buscar…";
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
      if(select.disabled||select.dataset.cityScope==="locked")return;
      const query=norm(input.value);
      const opts=[...select.options].filter(o=>!o.disabled&&!o.hidden&&norm(o.textContent).includes(query)).slice(0,100);
      menu.replaceChildren();
      opts.forEach(opt=>{
        const button=document.createElement("button");
        button.type="button";button.dataset.value=opt.value;
        button.innerHTML="";
        const tick=document.createElement("input");tick.type="checkbox";tick.tabIndex=-1;tick.checked=opt.selected;tick.setAttribute("aria-hidden","true");
        const name=document.createElement("span");name.textContent=opt.textContent;
        button.append(tick,name);
        button.setAttribute("role","option");
        button.setAttribute("aria-selected",String(opt.selected));
        menu.appendChild(button);
      });
      if(!opts.length){const msg=document.createElement("p");msg.textContent="No hay coincidencias";menu.appendChild(msg);}
      active=0;menu.hidden=false;input.setAttribute("aria-expanded","true");
    };
    input.addEventListener("focus",()=>{if(input.disabled)return;input.value="";draw();});
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
    select._typeaheadOpen=()=>{if(input.disabled)return;input.value="";draw();};
    select._typeaheadClose=()=>{close();sync();};
    select.addEventListener("change",()=>{sync();if(!menu.hidden)draw();});
    new MutationObserver(()=>{sync();if(!menu.hidden)draw();}).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","disabled","data-city-scope"]});
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
      for(const [key,title,controlId] of [["estratos","Estratos","mapEstratoControls"],["barrios","Barrios","mapBarrioControls"],["troncales","Troncales","mapTroncalControls"]]){
        const toggle=$(key==="barrios"?"mapLayerBarrios":key==="estratos"?"mapLayerEstratos":"mapLayerTroncales");
        const content=$(controlId);if(!toggle||!content)continue;
        const disclosure=document.createElement("details");disclosure.className="map-layer-disclosure";
        const summary=document.createElement("summary");
        const label=document.createElement("span");label.className="map-control-label";label.textContent=title;
        const count=document.createElement("small");count.className="map-control-count";count.textContent="0 seleccionados";
        const action=$(key==="barrios"?"mapSelectAllBarrios":key==="estratos"?"mapClearEstratos":"mapToggleAllTroncales");
        if(action){
          action.classList.add("map-layer-eye-action");
          action.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();});
          summary.append(action,label,count);
        }else summary.append(label,count);
        toggle.hidden=true;toggle.setAttribute("aria-hidden","true");toggle.tabIndex=-1;
        disclosure.append(summary,toggle,content);
        switches.appendChild(disclosure);
        const updateCount=()=>{
          const ready=content.dataset.cityScope==="ready";
          const fromState=Number(content.dataset.selectedCount);
          const selected=ready?(Number.isFinite(fromState)?fromState:content.querySelectorAll('input[data-layer-option]:checked').length):0;
          count.textContent=selected+" seleccionado"+(selected===1?"":"s");
          disclosure.classList.toggle("territorial-ready",ready);
          disclosure.classList.toggle("territorial-locked",!ready);
          const lockedMessage=ready?"":cityLockMessage();
          summary.title=lockedMessage;
          if(lockedMessage)summary.dataset.lockMessage=lockedMessage;
          else delete summary.dataset.lockMessage;
          count.title=lockedMessage;
          summary.setAttribute("aria-disabled",String(!ready));
          if(action){
            action.disabled=!ready;
            action.title=lockedMessage;
          }
        };
        summary.addEventListener("click",event=>{
          if(content.dataset.cityScope!=="ready"){
            event.preventDefault();
            disclosure.open=false;
          }
        });
        disclosure.addEventListener("toggle",()=>{
          if(disclosure.open&&content.dataset.cityScope!=="ready"){disclosure.open=false;updateCount();return;}
          if(disclosure.open&&toggle.getAttribute("aria-pressed")!=="true")toggle.click();
          updateCount();
        });
        content.addEventListener("change",updateCount);
        new MutationObserver(updateCount).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:["data-selected-count","data-city-scope"]});
        updateCount();
      }
    }
    // Diferenciar la cobertura del catálogo de ciudades y las capas disponibles.
    const cityFilter=$("mapCityFilter"),layersHeader=panels.layers?.querySelector(".map-layers-head");
    if(cityFilter&&layersHeader){
      const notice=document.createElement("small");
      notice.className="map-layer-city-coverage";
      layersHeader.after(notice);
      const normCity=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
      const qaEstratos=new Set(["neiva","villavicencio","ibague"]);
      const refresh=()=>{
        const cities=[...cityFilter.selectedOptions].map(o=>o.value).filter(v=>v&&v!=="all");
        if(cities.length!==1){notice.hidden=true;return;}
        const city=normCity(cities[0]);
        notice.hidden=city==="bucaramanga-amb";
        if(qaEstratos.has(city))notice.textContent="Estratos disponibles en QA. Barrios y troncales de esta ciudad todavía están pendientes.";
        else if(city==="cartagena")notice.textContent="ATENCIÓN: estratos históricos de 2022 disponibles únicamente como referencia visual QA. No utilizar para decisiones ni clasificación operativa.";
        else notice.textContent="Esta ciudad aún no tiene capas territoriales de estratos validadas para el mapa.";
      };
      cityFilter.addEventListener("change",refresh);
      refresh();
    }

    // FO-CHG-039: menú de recorrido desplegado hacia el interior del mapa.
    const routeDock=document.querySelector(".map-tools-dock");
    const routeDisclosure=routeDock?.querySelector(".map-route-disclosure");
    if(routeDisclosure){
      routeDisclosure.addEventListener("toggle",()=>{
        routeDock.classList.toggle("route-open",routeDisclosure.open);
      });
    }
    // Referencia solo en su pestaña: no ocupa espacio en filtros ni capas.
    // FO-CHG-036: filtros con el mismo patrón de acordeón que Capas.
    const filterHost=panels.filters?.querySelector(".map-filters");
    if(filterHost&&!filterHost.dataset.grouped){
      filterHost.dataset.grouped="1";
      const names={
        mapCityFilter:{title:"Ciudades",all:"Todas",one:"seleccionada",many:"seleccionadas"},
        mapTypeFilter:{title:"Tipo de formulario",all:"Todos",one:"seleccionado",many:"seleccionados"},
        mapOperatorFilter:{title:"Operadores",all:"Todos",one:"seleccionado",many:"seleccionados"},
        mapUserFilter:{title:"Usuarios",all:"Todos",one:"seleccionado",many:"seleccionados"}
      };
      for(const [id,meta] of Object.entries(names)){
        const control=$(id);
        const box=control?.closest(".map-searchable")||control?._searchInput?.parentElement||control?.parentElement;
        if(!control||!box||box===filterHost)continue;
        const group=document.createElement("details");group.className="map-filter-disclosure";
        group.dataset.control=id;
        const summary=document.createElement("summary");
        const eyeEnabled=id==="mapCityFilter"||id==="mapOperatorFilter";
        const leading=document.createElement(eyeEnabled?"button":"span");
        leading.className=eyeEnabled?"map-layer-eye-action map-filter-eye-action":"map-control-leading map-control-filter-leading";
        if(eyeEnabled){
          leading.type="button";leading.textContent="👁";
        }else{
          leading.setAttribute("aria-hidden","true");leading.textContent="⌕";
        }
        const label=document.createElement("span");label.className="map-control-label";label.textContent=meta.title;
        const count=document.createElement("small");count.className="map-control-count";
        summary.append(leading,label,count);
        group.append(summary);
        filterHost.insertBefore(group,box);
        group.appendChild(box);
        const updateCount=()=>{
          const selected=[...control.selectedOptions].filter(option=>option.value&&option.value!=="all").length;
          const locked=id==="mapOperatorFilter"&&control.dataset.cityScope!=="ready";
          count.textContent=locked?"0 seleccionados":selected?selected+" "+(selected===1?meta.one:meta.many):meta.all;
          group.classList.toggle("has-selection",selected>0);
          group.classList.toggle("filter-locked",locked);
          const lockedMessage=locked?cityLockMessage():"";
          summary.title=lockedMessage;
          if(lockedMessage)summary.dataset.lockMessage=lockedMessage;
          else delete summary.dataset.lockMessage;
          count.title=lockedMessage;
          summary.setAttribute("aria-disabled",String(locked));
          if(eyeEnabled){
            if(selected)group.dataset.savedValues=[...control.selectedOptions].filter(option=>option.value&&option.value!=="all").map(option=>option.value).join("|");
            leading.classList.toggle("eye-hidden",selected>0);
            leading.disabled=locked;
            leading.title=locked?lockedMessage:selected?"Apagar este filtro":group.dataset.savedValues?"Restaurar este filtro":"Selecciona opciones para activar el filtro";
            leading.setAttribute("aria-label",leading.title);
          }
        };
        if(eyeEnabled)leading.addEventListener("click",event=>{
          event.preventDefault();event.stopPropagation();
          if(id==="mapOperatorFilter"&&control.dataset.cityScope!=="ready")return;
          const selected=[...control.selectedOptions].filter(option=>option.value&&option.value!=="all");
          const saved=(group.dataset.savedValues||"").split("|").filter(Boolean);
          if(selected.length){
            for(const option of control.options)option.selected=option.value==="all";
          }else if(saved.length){
            const wanted=new Set(saved);
            let restored=0;
            for(const option of control.options){option.selected=option.value!=="all"&&wanted.has(option.value);if(option.selected)restored++;}
            const all=[...control.options].find(option=>option.value==="all");if(all)all.selected=restored===0;
          }else{
            group.open=true;control._typeaheadOpen?.();return;
          }
          control.dispatchEvent(new Event("change",{bubbles:true}));
        });
        control.addEventListener("change",updateCount);
        new MutationObserver(updateCount).observe(control,{childList:true,subtree:true,attributes:true,attributeFilter:["selected","disabled","data-city-scope"]});
        updateCount();
        summary.addEventListener("click",event=>{
          if(id==="mapOperatorFilter"&&control.dataset.cityScope!=="ready"){
            event.preventDefault();
            group.open=false;
          }
        });
        group.addEventListener("toggle",()=>{
          if(group.open&&id==="mapOperatorFilter"&&control.dataset.cityScope!=="ready"){
            group.open=false;updateCount();return;
          }
          if(group.open)control._typeaheadOpen?.();
          else control._typeaheadClose?.();
        });
        if(id==="mapCityFilter")group.open=true;
      }
    }
    // FO-CHG-042: one unified filter/layer panel; retain original select and layer logic.
    const unified=panels.filters;
    if(unified&&panels.layers){
      const filterHost=unified.querySelector(".map-filters");
      const layerSwitches=panels.layers.querySelector(".map-layer-switches");
      const extra=filterHost?.querySelector(".map-extra-filters");
      const bySummary=label=>[...(filterHost?.querySelectorAll(".map-filter-disclosure")||[])].find(e=>e.querySelector(".map-control-label")?.textContent?.trim()===label);
      const byLayer=label=>[...(layerSwitches?.querySelectorAll(".map-layer-disclosure")||[])].find(e=>e.querySelector("summary>span")?.textContent?.trim()===label);
      if(filterHost&&layerSwitches){
        const secondary=document.createElement("details");
        secondary.className="map-extra-filters map-unified-extra";
        const extraTitle=document.createElement("summary");
        extraTitle.textContent="Más filtros";
        const extraBody=document.createElement("div");
        extraBody.className="map-extra-content";
        secondary.append(extraTitle,extraBody);
        for(const item of [bySummary("Ciudades"),bySummary("Operadores"),byLayer("Estratos"),byLayer("Barrios"),byLayer("Troncales")]){
          if(item){filterHost.appendChild(item);item.open=false;}
        }
        for(const item of [bySummary("Tipo de formulario"),bySummary("Usuarios")])if(item)extraBody.appendChild(item);
        if(extra)extraBody.appendChild(extra);
        filterHost.appendChild(secondary);
        panels.layers.hidden=true;
        panels.layers.dataset.unified="true";
      }
      const tabs=panel.querySelector(".map-floating-tabs");
      const layerTab=tabs?.querySelector('[data-floating-tab="layers"]');
      if(layerTab)layerTab.remove();
      const filterTab=tabs?.querySelector('[data-floating-tab="filters"]');
      if(filterTab)filterTab.textContent="Filtros/Capas";
    }
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
