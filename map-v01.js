(() => {
  const CACHE_KEY="fibrazoExplorationMapPointsV2";
  const ROUTE_KEY="fibrazoExplorationRouteV1";

  function userScopedKey(base){
    const email=String(window.firebase?.auth?.().currentUser?.email||"anonimo").trim().toLowerCase();
    return base+":"+email;
  }
  const REFRESH_MS=60000;
  const REFRESH_SLOW_MS=150000;
  // FO-CHG-031 · Caché de coordenadas con expiración y clave renovada.
  const TERRITORIAL_CACHE_KEY="fibrazoTerritorialPointCacheV2";
  const TERRITORIAL_CACHE_TTL_MS=5*60*1000;
  const CITY_NEARBY_LIMIT_M=20000;
  const BUCARAMANGA_BOUNDS=[[7.070607677,-73.172095278],[7.195892798,-73.093548025]];

  const state={
    map:null,
    surveyLayer:null,
    baseLayers:null,
    baseMode:"street",
    visibility:"own",
    polygonActive:{barrios:false,estratos:false},
    polygonGroups:null,
    polygonRenderers:{barrios:null,estratos:null},
    polygonFeatures:{barrios:[],estratos:[]},
    polygonRefs:{barrios:new Map(),estratos:new Map()},
    polygonStatus:{barrios:"",estratos:""},
    polygonControllers:{barrios:null,estratos:null},
    polygonIndexControllers:{barrios:null,estratos:null},
    polygonIndexData:{barrios:[],estratos:[]},
    polygonSelections:{barrios:new Set(),estratos:new Set(["1","2","3"])},
    barrioListMode:"all",
    barrioAllSelected:false,
    barrioExcluded:new Set(),
    polygonReloadTimer:null,
    polygonSelectionTimers:{barrios:null,estratos:null},
    polygonFilterTimer:null,
    polygonFocusUntil:0,
    polygonIndexGroups:new Map(),
    busy:new Map(),
    busySeq:0,
    selectedMarker:null,
    selectedLatLng:null,
    longPress:null,
    searchController:null,
    searchMarker:null,
    autoLocated:false,
    points:[],
    filtered:[],
    loadedOnce:false,
    refreshTimer:null,
    route:[],
    watchId:null,
    routeLine:null,
    currentMarker:null,
    accuracyCircle:null,
    follow:true,
    lastLocation:null,
    lastRefresh:null,
    viewActive:false,
    pointsLoading:false,
    lastPointsAttempt:0,
    fullscreen:false,
    mapQaAuthorized:false
  };

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
  const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  const cityLabel=value=>String(value||"").trim().toLocaleLowerCase("es-CO").replace(/(^|[\s-])([a-záéíóúüñ])/g,(_,space,letter)=>space+letter.toLocaleUpperCase("es-CO"));
  const filterValues=id=>{
    const select=$(id);
    return select?[...select.selectedOptions].map(option=>option.value).filter(value=>value&&value!=="all"):[];
  };
  const selectFilterValues=(select,values)=>{
    if(!select)return;
    const wanted=new Set(values||[]);
    let matched=0;
    for(const option of select.options){
      option.selected=option.value!=="all"&&wanted.has(option.value);
      if(option.selected)matched++;
    }
    const all=[...select.options].find(option=>option.value==="all");
    if(all)all.selected=matched===0;
  };
  const polygonResponseCache=new Map();
  const validNum=value=>{
    if(value===null||value===undefined||value==="")return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };
  const formatDistance=meters=>{
    const n=validNum(meters);
    if(n===null)return"";
    return n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(".",",")+" km":Math.round(n)+" m";
  };
  const formatDate=value=>{
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return String(value||"");
    return d.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});
  };
  const formType=value=>{
    const valueNorm=norm(value);
    if(valueNorm==="presencial"||valueNorm==="exploracion_presencial")return "Presencial";
    if(valueNorm==="inteligencia_operador"||valueNorm==="inteligencia de operadores")return "Inteligencia de operadores";
    return "Virtual";
  };
  const routeStorage=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(userScopedKey(ROUTE_KEY))||"[]");
      return Array.isArray(raw)?raw.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).slice(-5000):[];
    }catch(_){return[];}
  };
  const cachePoints=points=>{
    try{
      localStorage.setItem(userScopedKey(CACHE_KEY),JSON.stringify({ts:Date.now(),visibility:state.visibility,points}));
    }catch(_){}
  };
  const cachedPoints=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(userScopedKey(CACHE_KEY))||"null");
      if(!Array.isArray(raw?.points))return[];
      const cacheVisibility=raw.visibility==="team"?"team":"own";
      if(cacheVisibility==="team"&&(!state.loadedOnce||state.visibility!=="team"))return[];
      return raw.points;
    }catch(_){return[];}
  };
  const saveRoute=()=>{try{localStorage.setItem(userScopedKey(ROUTE_KEY),JSON.stringify(state.route.slice(-5000)));}catch(_){}};
  function territorialCacheKey(lat,lng){return Number(lat).toFixed(5)+","+Number(lng).toFixed(5);}
  function readTerritorialCache(lat,lng){
    try{
      const raw=JSON.parse(localStorage.getItem(userScopedKey(TERRITORIAL_CACHE_KEY))||"{}");
      const hit=raw?.[territorialCacheKey(lat,lng)];
      return hit?.data&&Number.isFinite(Number(hit.ts))&&Date.now()-Number(hit.ts)<TERRITORIAL_CACHE_TTL_MS?hit.data:null;
    }catch(_){return null;}
  }
  function writeTerritorialCache(lat,lng,data){
    try{
      const key=userScopedKey(TERRITORIAL_CACHE_KEY);
      const raw=JSON.parse(localStorage.getItem(key)||"{}");
      raw[territorialCacheKey(lat,lng)]={ts:Date.now(),data};
      const entries=Object.entries(raw).sort((a,b)=>(b[1]?.ts||0)-(a[1]?.ts||0)).slice(0,120);
      localStorage.setItem(key,JSON.stringify(Object.fromEntries(entries)));
    }catch(_){}
  }

  function renderMapBusy(){
    const overlay=$("mapLoadingOverlay"),text=$("mapLoadingText");
    if(!overlay)return;
    const entries=[...state.busy.values()];
    overlay.hidden=!entries.length;
    if(text)text.textContent=entries[entries.length-1]||"Cargando mapa…";
  }
  function beginMapBusy(label){
    const token=++state.busySeq;
    state.busy.set(token,label||"Cargando mapa…");
    renderMapBusy();
    return token;
  }
  function endMapBusy(token){
    if(token!==null&&token!==undefined)state.busy.delete(token);
    renderMapBusy();
  }
  function bindTileBusy(layer,label){
    let token=null;
    layer.on("loading",()=>{if(token===null)token=beginMapBusy(label);});
    const finish=()=>{if(token!==null){endMapBusy(token);token=null;}};
    layer.on("load",finish);
    layer.on("tileerror",()=>setTimeout(finish,250));
  }

  function haversine(a,b){
    const R=6371000,rad=Math.PI/180;
    const p1=Number(a.lat)*rad,p2=Number(b.lat)*rad;
    const dp=(Number(b.lat)-Number(a.lat))*rad;
    const dl=(Number(b.lng)-Number(a.lng))*rad;
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function routeDistance(){
    let total=0;
    for(let i=1;i<state.route.length;i++)total+=haversine(state.route[i-1],state.route[i]);
    return total;
  }

  function patchLeafletRotateSafety(){
    if(!window.L?.Renderer?.prototype)return;
    const proto=L.Renderer.prototype;
    for(const name of ["_update","_updateTransform"]){
      const current=proto[name];
      if(typeof current!=="function"||current.__fibrazoSafeRotate)return;
      const wrapped=function(...args){
        if(!this._map)return;
        return current.apply(this,args);
      };
      wrapped.__fibrazoSafeRotate=true;
      proto[name]=wrapped;
    }
  }

  function ensureMap(){
    if(state.map)return true;
    if(!window.L||!$("explorationMap"))return false;
    patchLeafletRotateSafety();
    const rotateSupported=typeof L.Map?.prototype?.setBearing==="function";
    state.map=L.map("explorationMap",{
      zoomControl:false,
      preferCanvas:false,
      rotate:rotateSupported,
      touchRotate:rotateSupported,
      dragRotate:rotateSupported,
      shiftKeyRotate:rotateSupported,
      rotateControl:rotateSupported?{position:"topright",behavior:"reset",closeOnZeroBearing:false}:false
    }).setView([4.57,-74.30],6);

    const street=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:20,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    });
    const satellite=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{
      maxZoom:20,
      attribution:'Tiles &copy; Esri'
    });
    bindTileBusy(street,"Cargando mapa…");
    bindTileBusy(satellite,"Cargando vista satelital…");
    state.baseLayers={street,satellite};
    street.addTo(state.map);
    // Todas las capas geograficas propias deben vivir dentro del pane rotatorio
    // de leaflet-rotate. Si se crean directamente bajo mapPane, el mapa base gira
    // pero barrios/estratos quedan visualmente fijos y pierden alineacion.
    // leaflet-rotate moves geographic content through rotatePane. Using mapPane here
    // makes DOM markers appear visually fixed while the tile layer rotates.
    const geographicPane=rotateSupported&&state.map._rotatePane?state.map._rotatePane:state.map.getPane("mapPane");
    state.map.createPane("barriosPane",geographicPane);
    state.map.getPane("barriosPane").style.zIndex="350";
    state.map.getPane("barriosPane").style.pointerEvents="auto";
    state.map.createPane("estratosPane",geographicPane);
    state.map.getPane("estratosPane").style.zIndex="365";
    state.map.getPane("estratosPane").style.pointerEvents="auto";
    state.map.createPane("surveyPane",geographicPane);
    state.map.getPane("surveyPane").style.zIndex="650";
    state.map.getPane("surveyPane").style.pointerEvents="auto";
    state.polygonRenderers={
      barrios:L.svg({pane:"barriosPane",padding:.35}),
      estratos:L.svg({pane:"estratosPane",padding:.35})
    };
    state.polygonGroups={barrios:L.layerGroup(),estratos:L.layerGroup()};
    state.surveyLayer=L.layerGroup().addTo(state.map);
    state.map.on("moveend zoomend",schedulePolygonReload);
    // Keep every custom geographic overlay synchronized after a bearing gesture.
    // Some mobile browsers/plugins can leave DOM/SVG layers one frame behind.
    const syncBearingLayers=()=>{
      state.surveyLayer?.eachLayer?.(layer=>layer.update?.());
      state.polygonRenderers?.barrios?._update?.();
      state.polygonRenderers?.estratos?._update?.();
      state.routeLine?.redraw?.();
      state.accuracyCircle?.redraw?.();
      state.currentMarker?.redraw?.();
    };
    state.map.on("rotate rotateend",()=>requestAnimationFrame(syncBearingLayers));
    state.route=routeStorage();
    redrawRoute();
    updateBaseMapToggle();
    installLongPressSelection();
    setTimeout(()=>state.map.invalidateSize(),80);
    return true;
  }

  function updateBaseMapToggle(){
    const button=$("mapBaseToggle");
    if(!button)return;
    const satellite=state.baseMode==="satellite";
    button.innerHTML=satellite?'▤ <span>Mapa</span>':'▧ <span>Satélite</span>';
    button.title=satellite?"Cambiar a mapa":"Cambiar a vista satelital";
    button.setAttribute("aria-label",button.title);
    button.setAttribute("aria-pressed",String(satellite));
  }

  function setBaseMap(mode){
    if(!ensureMap()||!state.baseLayers)return;
    const next=mode==="satellite"?"satellite":"street";
    if(state.baseMode===next)return;
    const current=state.baseLayers[state.baseMode];
    if(current&&state.map.hasLayer(current))state.map.removeLayer(current);
    state.baseMode=next;
    state.baseLayers[next].addTo(state.map);
    if(state.surveyLayer)state.surveyLayer.bringToFront?.();
    if(state.routeLine)state.routeLine.bringToFront?.();
    if(state.accuracyCircle)state.accuracyCircle.bringToFront?.();
    if(state.currentMarker)state.currentMarker.bringToFront?.();
    updateBaseMapToggle();
  }

  function mapStatus(message,type=""){
    const el=$("mapStatus");
    if(!el)return;
    el.textContent=message||"";
    el.className="map-status"+(type?" "+type:"");
  }

  function viewBucaramanga(){
    if(!ensureMap())return;
    state.follow=false;
    if($("mapFollowToggle"))$("mapFollowToggle").checked=false;
    state.polygonFocusUntil=Date.now()+1300;
    state.map.fitBounds(BUCARAMANGA_BOUNDS,{padding:[22,22],maxZoom:13});
    mapStatus("Vista ajustada a Bucaramanga. Las capas activas se cargarán automáticamente.","success");
    setTimeout(()=>{
      for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])refreshPolygonLayer(layer,{silent:true});
    },550);
  }

  function viewTouchesBucaramanga(){
    if(!ensureMap())return false;
    const bounds=L.latLngBounds(BUCARAMANGA_BOUNDS);
    return state.map.getBounds().intersects(bounds);
  }

  function availableCoordinateForms(){
    const forms=Object.values(window.FIBRAZO_FORMS||{});
    return forms.filter(form=>{
      if(!form?.id||!Array.isArray(form.fields)||!form.fields.some(field=>field.key==="coordenadas"))return false;
      if(window.FIBRAZO_ACCESS&&window.FIBRAZO_ACCESS[form.id]===false)return false;
      return true;
    });
  }

  function googlePointUrl(lat,lng){
    return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(Number(lat).toFixed(6)+","+Number(lng).toFixed(6));
  }
  function coordinateCopyButton(lat,lng){
    const value=Number(lat).toFixed(6)+", "+Number(lng).toFixed(6);
    return '<button type="button" class="map-coordinate-tap" data-map-copy-point data-lat="'+Number(lat)+'" data-lng="'+Number(lng)+'" title="Copiar coordenadas">'+esc(value)+'</button>';
  }
  function closeCoordinateSheet(){
    document.querySelector(".map-coordinate-backdrop")?.remove();
    document.querySelector(".map-coordinate-sheet")?.remove();
  }

  async function copyCoordinates(lat,lng){
    const value=Number(lat).toFixed(6)+", "+Number(lng).toFixed(6);
    try{
      await navigator.clipboard.writeText(value);
      mapStatus("Coordenadas copiadas: "+value,"success");
    }catch(_){
      const area=document.createElement("textarea");
      area.value=value;area.style.position="fixed";area.style.opacity="0";
      document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      mapStatus("Coordenadas copiadas: "+value,"success");
    }
  }

  function startFormAtCoordinate(formId,lat,lng){
    window.FIBRAZO_MAP_COORDINATE_PRESET={lat:Number(lat),lng:Number(lng),source:"map-selection"};
    closeCoordinateSheet();
    window.FIBRAZO_SET_VIEW?.("forms");
    setTimeout(()=>window.FIBRAZO_UX_OPEN_FORM?.(formId),60);
  }

  function installCoordinateSheetDrag(sheet){
    const handle=sheet?.querySelector(".map-coordinate-head");
    if(!handle)return;
    let start=null;
    handle.addEventListener("pointerdown",event=>{
      if(window.innerWidth<=700||event.target.closest("button"))return;
      const rect=sheet.getBoundingClientRect();
      start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
      sheet.classList.add("dragging");
      sheet.style.left=rect.left+"px";sheet.style.top=rect.top+"px";
      sheet.style.right="auto";sheet.style.bottom="auto";sheet.style.transform="none";
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener("pointermove",event=>{
      if(!start)return;
      const maxLeft=Math.max(8,window.innerWidth-sheet.offsetWidth-8);
      const maxTop=Math.max(8,window.innerHeight-sheet.offsetHeight-8);
      sheet.style.left=Math.min(Math.max(8,start.left+event.clientX-start.x),maxLeft)+"px";
      sheet.style.top=Math.min(Math.max(8,start.top+event.clientY-start.y),maxTop)+"px";
    });
    for(const type of ["pointerup","pointercancel"]){
      handle.addEventListener(type,()=>{start=null;sheet.classList.remove("dragging");});
    }
  }

  function openCoordinateSheet(latlng){
    if(!latlng)return;
    const lat=Number(latlng.lat),lng=Number(latlng.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    closeCoordinateSheet();

    if(state.selectedMarker&&state.map)state.map.removeLayer(state.selectedMarker);
    state.selectedLatLng={lat,lng};
    state.selectedMarker=L.marker([lat,lng],{
      pane:"markerPane",
      zIndexOffset:1200,
      icon:L.divIcon({
        className:"map-selection-marker",
        html:'<span><b>＋</b></span>',
        iconSize:[30,30],
        iconAnchor:[15,15]
      })
    }).addTo(state.map);
    state.selectedMarker.bindTooltip("Punto seleccionado · toca para abrir acciones",{direction:"top"});
    state.selectedMarker.on("click",event=>{
      if(event?.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
      if(state.selectedLatLng)openCoordinateSheet(state.selectedLatLng);
    });

    const backdrop=document.createElement("div");
    backdrop.className="map-coordinate-backdrop";
    const openedAt=Date.now();
    backdrop.addEventListener("click",()=>{if(Date.now()-openedAt>450)closeCoordinateSheet();});

    const sheet=document.createElement("section");
    sheet.className="map-coordinate-sheet";
    sheet.setAttribute("role","dialog");
    sheet.setAttribute("aria-modal","true");
    sheet.innerHTML='<div class="map-coordinate-handle"></div>'+
      '<div class="map-coordinate-head"><div><span>PUNTO SELECCIONADO</span><h3>Acciones con la coordenada</h3></div><button type="button" data-map-close aria-label="Cerrar">×</button></div>'+
      '<div class="map-coordinate-primary"><div class="map-coordinate-value">'+coordinateCopyButton(lat,lng)+'</div>'+
        '<button type="button" data-map-route title="Abrir en Google Maps">↗ Ir</button>'+
      '</div>'+
      '<div class="map-coordinate-territorial"><span>CONTEXTO TERRITORIAL</span><div data-map-territorial><div class="map-coordinate-territorial-loading">Consultando nuestra base…</div></div></div>'+
      '<div class="map-coordinate-forms"><span>COMPLETAR FORMULARIO</span><div data-map-form-list></div></div>';
    document.body.append(backdrop,sheet);
    installCoordinateSheetDrag(sheet);
    sheet.addEventListener("click",event=>event.stopPropagation());
    sheet.querySelector("[data-map-close]")?.addEventListener("click",closeCoordinateSheet);
    sheet.querySelector("[data-map-route]")?.addEventListener("click",()=>{
      window.open(googlePointUrl(lat,lng),"_blank","noopener");
    });
    loadCoordinateTerritorial(sheet,lat,lng);
    const list=sheet.querySelector("[data-map-form-list]");
    const forms=availableCoordinateForms();
    if(list){
      list.innerHTML=forms.length?forms.map(form=>'<button type="button" data-form-id="'+esc(form.id)+'"><b>'+esc(form.name||form.id)+'</b><small>Usar '+lat.toFixed(6)+', '+lng.toFixed(6)+'</small></button>').join(""):'<div class="map-coordinate-empty">No hay formularios disponibles para esta cuenta.</div>';
      list.addEventListener("click",event=>{
        const button=event.target.closest("[data-form-id]");
        if(button)startFormAtCoordinate(button.dataset.formId,lat,lng);
      });
    }

    const territorialLayerText=(layer,label)=>{
      const status=String(layer?.status||"");
      const assigned=String(layer?.assigned?.name||"").trim();
      const nearby=String(layer?.nearby?.name||"").trim();
      const distance=formatDistance(layer?.distanceM);
      if(status==="DENTRO")return {label,value:assigned||"Disponible",state:"ok"};
      if(status==="FUERA"){
        if(label==="Ciudad / municipio"&&Number(layer?.distanceM)>CITY_NEARBY_LIMIT_M)return {label,value:"Sin coincidencia territorial cercana",state:"missing"};
        if(label==="Barrio"&&nearby)return {label,value:"Barrio más cercano: "+nearby+(distance?" · "+distance:""),state:"near"};
        return {label,value:"Fuera del polígono"+(nearby?" · cercano: "+nearby:"")+(distance?" · "+distance:""),state:"near"};
      }
      if(status==="FUERA_COBERTURA")return {label,value:"Sin coincidencia territorial cercana",state:"missing"};
      return {label,value:"No disponible en nuestra base",state:"missing"};
    };

    async function loadCoordinateTerritorial(sheet,lat,lng){
      const host=sheet?.querySelector("[data-map-territorial]");
      if(!host)return;
      try{
        const cached=readTerritorialCache(lat,lng);
        if(cached){
          const territorial=cached?.territorial||cached||{};
          const rows=[
            territorialLayerText(territorial.city,"Ciudad / municipio"),
            territorialLayerText(territorial.barrio,"Barrio"),
            territorialLayerText(territorial.estrato,"Estrato"),
            territorialLayerText(territorial.troncal,"Troncal")
          ];
          host.innerHTML=rows.map(row=>'<div class="map-coordinate-territorial-row '+esc(row.state)+'"><b>'+esc(row.label)+'</b><span>'+esc(row.value)+'</span></div>').join("");
        }
        const data=await authorizedFetch("/api/exploration?lat="+encodeURIComponent(lat)+"&lng="+encodeURIComponent(lng));
        writeTerritorialCache(lat,lng,data);
        if(!document.body.contains(sheet))return;
        const territorial=data?.territorial||{};
        const rows=[
          territorialLayerText(territorial.city,"Ciudad / municipio"),
          territorialLayerText(territorial.barrio,"Barrio"),
          territorialLayerText(territorial.estrato,"Estrato"),
          territorialLayerText(territorial.troncal,"Troncal")
        ];
        host.innerHTML=rows.map(row=>
          '<div class="map-coordinate-territorial-row '+esc(row.state)+'"><b>'+esc(row.label)+'</b><span>'+esc(row.value)+'</span></div>'
        ).join("");
      }catch(_){
        if(document.body.contains(sheet))host.innerHTML='<div class="map-coordinate-territorial-row missing"><b>Base territorial</b><span>No fue posible consultar la información en este momento.</span></div>';
      }
    }
  }

  function installLongPressSelection(){
    const container=$("explorationMap");
    if(!container||container.dataset.longPressReady==="1")return;
    container.dataset.longPressReady="1";
    const activePointers=new Set();
    let timer=null,start=null,pointerId=null;

    const cancel=()=>{
      if(timer){clearTimeout(timer);timer=null;}
      start=null;pointerId=null;
    };
    container.addEventListener("pointerdown",event=>{
      if(event.target.closest(".leaflet-control"))return;
      activePointers.add(event.pointerId);
      if(activePointers.size>1){cancel();return;}
      pointerId=event.pointerId;
      start={x:event.clientX,y:event.clientY};
      timer=setTimeout(()=>{
        if(!start||activePointers.size!==1)return;
        const rect=container.getBoundingClientRect();
        const latlng=state.map.containerPointToLatLng([start.x-rect.left,start.y-rect.top]);
        navigator.vibrate?.(30);
        openCoordinateSheet(latlng);
        cancel();
      },720);
    },{passive:true});
    container.addEventListener("pointermove",event=>{
      if(event.pointerId!==pointerId||!start)return;
      if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>12)cancel();
    },{passive:true});
    const release=event=>{activePointers.delete(event.pointerId);cancel();};
    container.addEventListener("pointerup",release,{passive:true});
    container.addEventListener("pointercancel",release,{passive:true});
    container.addEventListener("pointerleave",event=>{if(event.pointerType==="mouse")release(event);},{passive:true});
    container.addEventListener("contextmenu",event=>{
      if(event.target.closest(".leaflet-control"))return;
      event.preventDefault();
      const rect=container.getBoundingClientRect();
      const latlng=state.map.containerPointToLatLng([event.clientX-rect.left,event.clientY-rect.top]);
      openCoordinateSheet(latlng);
    });
  }

  function statusLine(label,layer){
    const status=String(layer?.status||"");
    const assigned=String(layer?.assigned||"").trim();
    const nearby=String(layer?.nearby||"").trim();
    const distance=formatDistance(layer?.distanceM);
    if(status==="DENTRO")return label+": "+(assigned||"Coincidencia exacta");
    if(status==="FUERA")return label+": fuera"+(nearby?" · cercano: "+nearby:"")+(distance?" · "+distance:"");
    if(status==="SIN_CAPA_CANONICA")return label+": sin capa canónica";
    if(status==="SIN_CAPA")return label+": sin capa";
    return label+": sin información";
  }

  function popupHtml(point){
    const links=[];
    links.push('<a href="'+esc(googlePointUrl(point.lat,point.lng))+'" target="_blank" rel="noopener">↗ Ir a Google Maps</a>');
    if(point.evidence)links.push('<a href="'+esc(point.evidence)+'" target="_blank" rel="noopener">↗ Evidencia</a>');
    (point.photos||[]).forEach((url,index)=>links.push('<a href="'+esc(url)+'" target="_blank" rel="noopener">↗ Foto '+(index+1)+'</a>'));
    const operators=(point.operators||[]).length?'<div class="map-popup-row"><b>Operadores</b><span>'+esc(point.operators.join(", "))+'</span></div>':"";
    const note=point.note?'<div class="map-popup-note">'+esc(point.note)+'</div>':"";
    return '<div class="map-popup">'+
      '<div class="map-popup-head"><span>'+esc(formType(point.type))+'</span><strong>'+esc(point.city?.assigned||point.observedCity||"Punto de exploración")+'</strong></div>'+
      '<div class="map-popup-row"><b>Fecha</b><span>'+esc(formatDate(point.timestamp))+'</span></div>'+
      '<div class="map-popup-row"><b>Usuario</b><span>'+esc(point.user||"—")+'</span></div>'+
      '<div class="map-popup-row"><b>Ciudad</b><span>'+esc(statusLine("",point.city).replace(/^:\s*/,""))+'</span></div>'+
      '<div class="map-popup-row"><b>Barrio</b><span>'+esc(statusLine("",point.barrio).replace(/^:\s*/,""))+'</span></div>'+
      '<div class="map-popup-row"><b>Estrato</b><span>'+esc(statusLine("",point.estrato).replace(/^:\s*/,""))+'</span></div>'+
      '<div class="map-popup-row"><b>Coordenadas</b><span>'+coordinateCopyButton(point.lat,point.lng)+'</span></div>'+
      (point.isTest?'<div class="map-popup-test">⚠ Registro de prueba · excluido de análisis</div>':"")+
      operators+note+
      (links.length?'<div class="map-popup-links">'+links.join("")+'</div>':"")+
    '</div>';
  }

  const POINT_CATEGORIES=[
    {id:"tigo",label:"Solo Tigo",color:"#0057D9",description:"Sin ISP adicional · único incumbente: Tigo"},
    {id:"movistar",label:"Solo Movistar",color:"#4B5563",description:"Sin ISP adicional · único incumbente: Movistar"},
    {id:"claro",label:"Solo Claro",color:"#D92D20",description:"Sin ISP adicional · único incumbente: Claro"},
    {id:"isp_only",label:"Solo otros ISP",color:"#F4B400",description:"Hay ISP local/regional y ningún incumbente"},
    {id:"isp_one_inc",label:"ISP + 1 incumbente",color:"#7B2CBF",description:"Hay ISP local/regional y un solo incumbente"},
    {id:"isp_multi_inc",label:"ISP + varios incumbentes",color:"#8B4513",description:"Hay ISP local/regional y más de un incumbente"},
    {id:"multi_inc",label:"Varios incumbentes",color:"#FF4FA3",description:"No hay otros ISP y hay más de un incumbente"},
    {id:"none",label:"Sin operador identificado",color:"#7A8580",description:"No se registraron operadores visibles"}
  ];

  function operatorProfile(point){
    const operators=Array.isArray(point?.operators)?point.operators:[];
    const incumbents=new Set();
    const others=[];
    for(const value of operators){
      const n=norm(value);
      if(n.startsWith("tigo"))incumbents.add("tigo");
      else if(n.startsWith("claro"))incumbents.add("claro");
      else if(n.startsWith("movistar"))incumbents.add("movistar");
      else if(String(value||"").trim())others.push(String(value).trim());
    }
    let id="none";
    if(others.length){
      if(incumbents.size===0)id="isp_only";
      else if(incumbents.size===1)id="isp_one_inc";
      else id="isp_multi_inc";
    }else if(incumbents.size===1){
      id=[...incumbents][0];
    }else if(incumbents.size>1){
      id="multi_inc";
    }
    const category=POINT_CATEGORIES.find(item=>item.id===id)||POINT_CATEGORIES.at(-1);
    return {id,category,incumbents:[...incumbents],others};
  }

  function markerIcon(point){
    const profile=operatorProfile(point);
    return L.divIcon({
      className:"exploration-point-marker",
      html:'<span class="map-point-shape '+(point.isTest?"shape-test":formType(point.type)==="Virtual"?"shape-square":formType(point.type)==="Presencial"?"shape-circle":"shape-triangle")+'" style="--point-color:'+esc(point.isTest?"#EF4444":profile.category.color)+'">'+(point.isTest?"T":"")+'</span>',
      iconSize:[20,20],
      iconAnchor:[10,10],
      popupAnchor:[0,-11]
    });
  }

  function renderPointLegend(filtered=state.filtered){
    const panel=$("mapPointLegendPanel"),summary=$("mapPointLegendSummary");
    if(!panel)return;
    const counts=new Map(POINT_CATEGORIES.map(item=>[item.id,0]));
    for(const point of (Array.isArray(filtered)?filtered:[]).filter(point=>!point.isTest)){
      const id=operatorProfile(point).id;
      counts.set(id,(counts.get(id)||0)+1);
    }
    const formCounts={virtual:0,presential:0,intelligence:0};
    for(const point of (Array.isArray(filtered)?filtered:[]).filter(point=>!point.isTest)){
      const typ=formType(point.type);
      if(typ==="Presencial")formCounts.presential++;
      else if(typ==="Inteligencia de operadores")formCounts.intelligence++;
      else formCounts.virtual++;
    }
    const shapeLegend='<details class="map-reference-group">'+
      '<summary><span>Índice de formas de los elementos</span><small>Tipo de formulario</small></summary>'+
      '<div class="map-reference-list map-form-type-legend">'+
        '<div class="map-reference-row"><i class="shape-square" aria-hidden="true"></i><span>Exploración virtual</span><strong>'+formCounts.virtual+'</strong></div>'+
        '<div class="map-reference-row"><i class="shape-circle" aria-hidden="true"></i><span>Exploración presencial</span><strong>'+formCounts.presential+'</strong></div>'+
        '<div class="map-reference-row"><i class="shape-triangle" aria-hidden="true"></i><span>Inteligencia de operadores</span><strong>'+formCounts.intelligence+'</strong></div>'+
      '</div></details>';
    const operatorLegend='<details class="map-reference-group">'+
      '<summary><span>Índice de operadores</span><small>Color de los puntos</small></summary>'+
      '<div class="map-reference-list">'+POINT_CATEGORIES.map(item=>
        '<div class="map-point-legend-item">'+
          '<i style="background:'+esc(item.color)+'"></i>'+
          '<span><b>'+esc(item.label)+'</b><small>'+esc(item.description)+'</small></span>'+
          '<strong>'+String(counts.get(item.id)||0)+'</strong>'+
        '</div>'
      ).join("")+'</div></details>';
    panel.innerHTML=shapeLegend+operatorLegend;
    const visible=(Array.isArray(filtered)?filtered:[]).filter(point=>!point.isTest).length;
    if(summary)summary.textContent=visible+" puntos visibles · ■ Virtual · ● Presencial"+(formCounts.intelligence?" · ▲ Operadores":"")+" · color según operadores";
  }

  function togglePointLegend(){
    const panel=$("mapPointLegendPanel"),button=$("mapPointLegendToggle");
    if(!panel||!button)return;
    const open=panel.hidden;
    panel.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    button.classList.toggle("active",open);
  }

  function renderMarkers({fit=false}={}){
    if(!ensureMap())return;
    state.surveyLayer.clearLayers();
    const filtered=filteredPoints();
    state.filtered=filtered;
    const bounds=[];
    for(const point of filtered){
      try{
        const marker=L.marker([point.lat,point.lng],{icon:markerIcon(point),pane:"markerPane",keyboard:true});
        const profile=operatorProfile(point);
        const html=popupHtml(point).replace(
          '<div class="map-popup-row"><b>Fecha</b>',
          '<div class="map-popup-row"><b>Clasificación</b><span>'+esc(profile.category.label)+'</span></div><div class="map-popup-row"><b>Fecha</b>'
        );
        marker.bindPopup(html,{maxWidth:320});
        marker.addTo(state.surveyLayer);
        bounds.push([point.lat,point.lng]);
      }catch(error){
        console.warn("MAP_POINT_DRAW_ERROR",point?.id||"",error?.message||error);
      }
    }
    updateKpis(filtered);
    renderPointLegend(filtered);
    if(fit&&bounds.length&&!state.watchId){
      state.map.fitBounds(bounds,{padding:[24,24],maxZoom:15});
    }
  }

  function filteredPoints(){
    const cities=filterValues("mapCityFilter");
    const types=filterValues("mapTypeFilter");
    const users=filterValues("mapUserFilter");
    const onlyPhotos=$("mapPhotosFilter")?.checked===true;
    const showTests=state.mapQaAuthorized&&$("mapShowTests")?.checked===true;
    const operators=filterValues("mapOperatorFilter");
    const from=$("mapDateFrom")?.value?new Date($("mapDateFrom").value+"T00:00:00"):null;
    const to=$("mapDateTo")?.value?new Date($("mapDateTo").value+"T23:59:59.999"):null;
    return state.points.filter(point=>{
      if(point.isTest&&!showTests)return false;
      const pointCity=String(point.city?.assigned||point.observedCity||"").trim();
      const when=new Date(point.timestamp);
      if(cities.length&&!cities.includes(norm(pointCity)))return false;
      if(onlyPhotos&&!(Array.isArray(point.photos)&&point.photos.some(Boolean)))return false;
      if(types.length&&!types.includes(formType(point.type)))return false;
      if(users.length&&!users.includes(String(point.user||"")))return false;
      if(operators.length){
        const profile=operatorProfile(point);
        const matches=operators.some(operator=>{
          if(operator==="tigo")return profile.incumbents.includes("tigo");
          if(operator==="claro")return profile.incumbents.includes("claro");
          if(operator==="movistar")return profile.incumbents.includes("movistar");
          if(operator==="isps")return profile.others.length>0&&profile.incumbents.length===0;
          if(operator.startsWith("isp:"))return profile.others.some(x=>norm(x)===operator.slice(4));
          return false;
        });
        if(!matches)return false;
      }
      if(from&&!Number.isNaN(when.getTime())&&when<from)return false;
      if(to&&!Number.isNaN(when.getTime())&&when>to)return false;
      return true;
    });
  }

  function updateFilters(){
    const city=$("mapCityFilter"),user=$("mapUserFilter"),operator=$("mapOperatorFilter");
    if(city){
      const current=filterValues("mapCityFilter");
      const cityMap=new Map();
      for(const point of state.points){
        const raw=String(point.city?.assigned||point.observedCity||"").trim();
        if(raw&&!cityMap.has(norm(raw)))cityMap.set(norm(raw),cityLabel(raw));
      }
      const cities=[...cityMap.entries()].sort((a,b)=>a[1].localeCompare(b[1],"es",{sensitivity:"base"}));
      city.innerHTML='<option value="all">Todas las ciudades</option>'+cities.map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join("");
      selectFilterValues(city,current);
    }
    if(operator){
      const current=filterValues("mapOperatorFilter");
      const ispMap=new Map();
      for(const value of state.points.flatMap(p=>operatorProfile(p).others).filter(Boolean))if(!ispMap.has(norm(value)))ispMap.set(norm(value),value);
      const isps=[...ispMap.entries()].sort((a,b)=>a[1].localeCompare(b[1],"es",{sensitivity:"base"}));
      operator.innerHTML='<option value="all">Todos los operadores</option><option value="tigo">Tigo · esté solo o acompañado</option><option value="claro">Claro · esté solo o acompañado</option><option value="movistar">Movistar · esté solo o acompañado</option><option value="isps">Solo ISPs · sin incumbentes</option>'+isps.map(([key,label])=>'<option value="isp:'+esc(key)+'">ISP · '+esc(label)+'</option>').join("");
      selectFilterValues(operator,current);
    }
    if(user){
      const current=filterValues("mapUserFilter");
      const users=[...new Set(state.points.map(p=>String(p.user||"").trim()).filter(Boolean))].sort();
      user.innerHTML='<option value="all">Todos los usuarios</option>'+users.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
      user.hidden=state.visibility!=="team";
      selectFilterValues(user,current);
    }
    updateFilterCount();
    updateVisibilityBadge();
  }

  function updateKpis(filtered=state.filtered){
    const list=(Array.isArray(filtered)?filtered:[]).filter(point=>!point.isTest);
    if($("mapPointCount"))$("mapPointCount").textContent=list.length;
    if($("mapVirtualCount"))$("mapVirtualCount").textContent=list.filter(p=>formType(p.type)==="Virtual").length;
    if($("mapPresentialCount"))$("mapPresentialCount").textContent=list.filter(p=>formType(p.type)==="Presencial").length;
    if($("mapCityCount"))$("mapCityCount").textContent=new Set(list.map(p=>norm(p.city?.assigned||p.observedCity)).filter(Boolean)).size;
    updateRouteMetrics();
  }

  function updateVisibilityBadge(){
    const badge=$("mapVisibilityBadge");
    if(!badge)return;
    const team=state.visibility==="team";
    badge.textContent=team?"Vista · equipo completo":"Vista · mis puntos";
    badge.classList.toggle("team",team);
  }

  function activeFilterCount(){
    let count=0;
    if(filterValues("mapCityFilter").length)count++;
    if(filterValues("mapTypeFilter").length)count++;
    if($("mapPhotosFilter")?.checked)count++;
    if(state.mapQaAuthorized&&$("mapShowTests")?.checked)count++;
    if(filterValues("mapOperatorFilter").length)count++;
    if(state.visibility==="team"&&filterValues("mapUserFilter").length)count++;
    if($("mapDateFrom")?.value)count++;
    if($("mapDateTo")?.value)count++;
    return count;
  }

  function updateFilterCount(){
    const count=activeFilterCount();
    const badge=$("mapFilterCount");
    if(badge){badge.textContent=String(count);badge.hidden=count===0;}
  }

  function toggleFilters(force){
    const panel=$("mapFiltersPanel"),button=$("mapFiltersToggle");
    if(!panel||!button)return;
    const open=typeof force==="boolean"?force:panel.hidden;
    panel.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    button.classList.toggle("active",open);
  }

  function clearAllMapFilters(){
    clearFilters();
    if($("mapSearchInput"))$("mapSearchInput").value="";
    if($("mapSearchResults")){$("mapSearchResults").hidden=true;$("mapSearchResults").innerHTML="";}
    mapStatus("Filtros del mapa restablecidos.","success");
  }

  function refreshMapNow(){
    polygonResponseCache.clear();
    loadPoints({fit:false});
    for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])refreshPolygonLayer(layer,{silent:false});
  }

  function clearFilters(){
    selectFilterValues($("mapCityFilter"),[]);
    selectFilterValues($("mapTypeFilter"),[]);
    if($("mapPhotosFilter"))$("mapPhotosFilter").checked=false;
    if($("mapShowTests"))$("mapShowTests").checked=false;
    selectFilterValues($("mapUserFilter"),[]);
    selectFilterValues($("mapOperatorFilter"),[]);
    if($("mapDateFrom"))$("mapDateFrom").value="";
    if($("mapDateTo"))$("mapDateTo").value="";
    for(const id of ["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter"])$(id)?.dispatchEvent(new Event("change",{bubbles:true}));
    updateFilterCount();
    renderMarkers({fit:true});
  }

  const ESTRATO_COLORS={
    "1":"#22C55E","2":"#FACC15","3":"#3B82F6","4":"#EF4444","5":"#A855F7","6":"#EC4899"
  };
  window.FIBRAZO_MAP_ESTRATO_COLORS=Object.freeze({...ESTRATO_COLORS});
  const BARRIO_COLORS=["#00C389","#2D9CDB","#F2C94C","#9B51E0","#F2994A","#56CCF2","#EB5757","#6FCF97","#BB6BD9","#27AE60"];

  function toggleLayersPanel(force){
    const panel=$("mapLayersPanel"),button=$("mapLayersToggle");
    if(!panel||!button)return;
    const open=typeof force==="boolean"?force:panel.hidden;
    panel.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    button.classList.toggle("active",open);
  }

  function updateLayerButtons(){
    for(const layer of ["barrios","estratos"]){
      const button=$(layer==="barrios"?"mapLayerBarrios":"mapLayerEstratos");
      const active=!!state.polygonActive[layer];
      button?.setAttribute("aria-pressed",String(active));
      button?.classList.toggle("active",active);
    }
    const count=Object.values(state.polygonActive).filter(Boolean).length;
    const badge=$("mapLayerCount");
    if(badge){badge.textContent=String(count);badge.hidden=count===0;}
    renderLayerControls();
  }

  function featureBBox(feature){
    const box={minLon:Infinity,minLat:Infinity,maxLon:-Infinity,maxLat:-Infinity};
    const walk=node=>{
      if(!Array.isArray(node))return;
      if(node.length>=2&&Number.isFinite(Number(node[0]))&&Number.isFinite(Number(node[1]))){
        const x=Number(node[0]),y=Number(node[1]);
        box.minLon=Math.min(box.minLon,x);box.maxLon=Math.max(box.maxLon,x);
        box.minLat=Math.min(box.minLat,y);box.maxLat=Math.max(box.maxLat,y);
        return;
      }
      node.forEach(walk);
    };
    walk(feature?.geometry?.coordinates);
    return box;
  }

  function bboxNear(a,b,eps=0.00004){
    return !(a.maxLon+eps<b.minLon||a.minLon-eps>b.maxLon||a.maxLat+eps<b.minLat||a.minLat-eps>b.maxLat);
  }

  function assignBarrioColors(features){
    const rows=features.map(feature=>({
      feature,
      box:featureBBox(feature),
      key:String(feature?.properties?.id||feature?.id||"")
    })).sort((a,b)=>a.box.minLat-b.box.minLat||a.box.minLon-b.box.minLon||a.key.localeCompare(b.key));
    const assigned=new Map();
    for(let i=0;i<rows.length;i++){
      const used=new Set();
      for(let j=0;j<i;j++){
        if(!bboxNear(rows[i].box,rows[j].box))continue;
        const color=assigned.get(rows[j].key);
        if(color)used.add(color);
      }
      const color=BARRIO_COLORS.find(x=>!used.has(x))||BARRIO_COLORS[i%BARRIO_COLORS.length];
      assigned.set(rows[i].key,color);
    }
    return assigned;
  }

  function estratoColor(feature){
    const raw=String(feature?.properties?.estrato||feature?.properties?.name||"").trim();
    const match=raw.match(/\b([1-6])\b/);
    return ESTRATO_COLORS[match?.[1]]||"#7A8580";
  }

  function polygonPopup(feature,layer,color){
    const p=feature?.properties||{};
    const rows=[];
    const add=(label,value)=>{const v=String(value??"").trim();if(v)rows.push('<div class="map-popup-row"><b>'+esc(label)+'</b><span>'+esc(v)+'</span></div>');};
    if(layer==="barrios"){
      add("Barrio",p.name);
      add("Municipio",p.municipio);
      add("Comuna",p.comuna);
      add("Área",p.areaHa?p.areaHa+" ha":"");
      add("Código",p.codeOrigin);
    }else{
      add("Estrato",p.estrato||p.name);
      add("Municipio",p.municipio);
      add("Categoría",p.categoria);
      add("Área",p.areaHa?p.areaHa+" ha":"");
    }
    add("Calidad",p.quality);
    add("Fuente",p.source);
    add("Vigencia",p.year);
    if(p.observations)add("Observación",p.observations);
    const sourceLink=p.sourceUrl?'<a href="'+esc(p.sourceUrl)+'" target="_blank" rel="noopener">↗ Fuente</a>':"";
    return '<div class="map-popup polygon-popup">'+
      '<div class="map-popup-head"><span><i class="polygon-swatch" style="background:'+esc(color)+'"></i>'+esc(layer==="barrios"?"BARRIO":"ESTRATO")+'</span><strong>'+esc(p.name||p.estrato||p.id||"Polígono")+'</strong></div>'+
      rows.join("")+
      (sourceLink?'<div class="map-popup-links">'+sourceLink+'</div>':"")+
    '</div>';
  }

  function clearPolygonLayer(layer,{keepStatus=false}={}){
    const group=state.polygonGroups?.[layer];
    if(group)group.clearLayers();
    state.polygonFeatures[layer]=[];
    state.polygonRefs[layer]=new Map();
    if(!keepStatus)state.polygonStatus[layer]="";
  }

  function polygonStyle(layer,feature,color){
    return {
      pane:layer==="estratos"?"estratosPane":"barriosPane",
      color,
      weight:layer==="barrios"?2:1.7,
      opacity:.96,
      fillColor:color,
      fillOpacity:layer==="barrios"?.13:.21
    };
  }

  function drawPolygonLayer(layer,features){
    const group=state.polygonGroups?.[layer];
    const renderer=state.polygonRenderers?.[layer];
    if(!group||!renderer)return 0;
    group.clearLayers();
    state.polygonRefs[layer]=new Map();
    const barrioColors=layer==="barrios"?assignBarrioColors(features):null;
    let drawn=0;
    for(const feature of features){
      try{
        const id=String(feature?.properties?.id||feature?.id||"");
        const color=layer==="barrios"?(barrioColors.get(id)||BARRIO_COLORS[0]):estratoColor(feature);
        const geo=L.geoJSON(feature,{
          pane:layer==="estratos"?"estratosPane":"barriosPane",
          renderer,
          interactive:true,
          style:()=>({...polygonStyle(layer,feature,color),renderer}),
          onEachFeature:(f,leaf)=>{
            leaf.bindPopup(polygonPopup(f,layer,color),{maxWidth:320});
            leaf.on("mouseover",()=>leaf.setStyle({weight:3,fillOpacity:.34}));
            leaf.on("mouseout",()=>leaf.setStyle({...polygonStyle(layer,feature,color),renderer}));
          }
        });
        const layers=geo.getLayers?.()||[];
        if(!layers.length)continue;
        geo.addTo(group);
        drawn+=layers.length;
        state.polygonRefs[layer].set(id,{feature,leaflet:geo,color,bounds:geo.getBounds()});
      }catch(error){
        console.warn("MAP_POLYGON_DRAW_ERROR",layer,feature?.id||feature?.properties?.id||"",error?.message||error);
      }
    }
    state.polygonFeatures[layer]=features;
    requestAnimationFrame(()=>{
      try{
        renderer._update?.();
        for(const ref of state.polygonRefs[layer].values())ref.leaflet?.bringToFront?.();
      }catch(_){}
    });
    return drawn;
  }

  function updatePolygonStatus(){
    const el=$("mapLayerStatus");
    if(!el)return;
    const active=Object.entries(state.polygonActive).filter(([,value])=>value).map(([layer])=>layer);
    if(!active.length){el.textContent="Capas apagadas.";return;}
    const labels=active.map(layer=>{
      const name=layer==="barrios"?"Barrios":"Estratos";
      const selected=state.polygonSelections[layer]?.size||0;
      const suffix=state.polygonStatus[layer]||((selected?"actualizando…":"elige qué mostrar"));
      return name+": "+suffix;
    });
    el.textContent=labels.join(" · ");
  }

  function renderEstratoControls(){
    const host=$("mapEstratoControls"),options=$("mapEstratoOptions"),hint=$("mapEstratoHint");
    if(!host||!options)return;
    host.dataset.selectedCount=String(state.polygonSelections.estratos.size);
    host.hidden=!state.polygonActive.estratos;
    if(host.hidden)return;
    const query=norm($("mapEstratoSearch")?.value||"");
    options.innerHTML=["1","2","3","4","5","6"].filter(value=>!query||norm("Estrato "+value).includes(query)).map(value=>{
      const checked=state.polygonSelections.estratos.has(value);
      return '<label class="map-selective-option estrato-option'+(checked?' active':'')+'">'+
        '<input type="checkbox" data-layer-option="estratos" value="'+value+'" '+(checked?'checked':'')+'>'+
        '<i style="background:'+ESTRATO_COLORS[value]+'"></i>'+
        '<span><b>Estrato '+value+'</b></span>'+
      '</label>';
    }).join("");
    if(hint){
      const selected=state.polygonSelections.estratos.size;
      hint.textContent=selected
        ?selected+" estrato"+(selected===1?"":"s")+" activo"+(selected===1?"":"s")+" · solo se dibujan geometrías visibles en el mapa."
        :"Todos están apagados por defecto. Activa uno o varios para dibujarlos.";
    }
  }

  function barrioIsChecked(id){
    const key=String(id);
    return state.barrioAllSelected?!state.barrioExcluded.has(key):state.polygonSelections.barrios.has(key);
  }

  function renderBarrioControls(){
    const host=$("mapBarrioControls"),options=$("mapBarrioOptions"),countEl=$("mapBarrioVisibleCount"),hint=$("mapBarrioHint"),title=$("mapBarrioListTitle");
    if(!host||!options)return;
    const selectedTotal=state.barrioAllSelected
      ?Math.max(0,(state.polygonIndexData.barrios||[]).length-state.barrioExcluded.size)
      :state.polygonSelections.barrios.size;
    host.dataset.selectedCount=String(selectedTotal);
    host.hidden=!state.polygonActive.barrios;
    if(host.hidden)return;
    const search=norm($("mapBarrioSearch")?.value||"");
    const all=state.polygonIndexData.barrios||[];
    const filtered=all.filter(item=>!search||norm(item.name).includes(search)||norm(item.municipio).includes(search)||norm(item.comuna).includes(search));
    if(title)title.textContent=state.barrioListMode==="all"?"Todos los barrios de la base AMB":"Barrios visibles en esta vista";
    options.innerHTML=filtered.length?filtered.map(item=>{
      const checked=barrioIsChecked(item.id);
      return '<label class="map-selective-option barrio-option'+(checked?' active':'')+'">'+
        '<input type="checkbox" data-layer-option="barrios" value="'+esc(item.id)+'" '+(checked?'checked':'')+'>'+
        '<i class="barrio-selector-dot"></i>'+
        '<span><b>'+esc(item.name||item.id)+'</b><small>'+esc(item.municipio||"")+(item.comuna?' · '+esc(item.comuna):'')+'</small></span>'+
      '</label>';
    }).join(""):'<div class="map-selective-empty">'+(search?'No hay barrios que coincidan con la búsqueda.':'No hay barrios disponibles en esta vista.')+'</div>';

    if(hint){
      const selected=selectedTotal;
      const scope=state.barrioListMode==="all"?"la base completa":"la vista actual";
      hint.textContent=selected
        ?selected+" barrio"+(selected===1?"":"s")+" seleccionado"+(selected===1?"":"s")+" · el mapa solo dibuja los seleccionados que estén dentro del zoom actual."
        :"Listado de "+scope+". Puedes seleccionar individualmente o usar Seleccionar todos.";
    }
  }

  function setBarrioListMode(mode){
    const next=mode==="all"?"all":"visible";
    if(state.barrioListMode===next)return;
    state.barrioListMode=next;
    if($("mapBarrioSearch"))$("mapBarrioSearch").value="";
    renderBarrioControls();
    if(state.polygonActive.barrios)loadLayerIndex("barrios");
  }

  function selectAllBarrios(){
    const items=state.polygonIndexData.barrios||[];
    if(!items.length)return;
    if(state.barrioListMode==="all"){
      state.barrioAllSelected=true;
      state.barrioExcluded.clear();
      state.polygonSelections.barrios.clear();
    }else{
      for(const item of items)state.polygonSelections.barrios.add(String(item.id));
    }
    renderBarrioControls();
    loadPolygonLayer("barrios");
  }

  function renderLayerControls(){
    renderEstratoControls();
    renderBarrioControls();
    updatePolygonStatus();
  }

  function mapViewportQuery(){
    const bounds=state.map.getBounds();
    return {
      bbox:[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].map(v=>Number(v).toFixed(5)).join(","),
      zoom:state.map.getZoom(),
      cities:filterValues("mapCityFilter").join(",")
    };
  }

  async function authorizedFetch(url,controller,{ttl=0}={}){
    const cached=polygonResponseCache.get(url);
    if(ttl>0&&cached&&cached.expires>Date.now())return cached.data;
    const user=firebase?.auth?.().currentUser;
    if(!user)throw new Error("Sesión no disponible.");
    const token=await user.getIdToken();
    const response=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"default",signal:controller?.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"No se pudo cargar la capa.");
    if(ttl>0){
      polygonResponseCache.set(url,{expires:Date.now()+ttl,data});
      if(polygonResponseCache.size>80){
        const oldest=polygonResponseCache.keys().next().value;
        polygonResponseCache.delete(oldest);
      }
    }
    return data;
  }

  async function loadLayerIndex(layer,{silent=false}={}){
    if(!state.polygonActive[layer]||!ensureMap())return;
    state.polygonIndexControllers[layer]?.abort();
    const controller=new AbortController();
    state.polygonIndexControllers[layer]=controller;
    const busyToken=silent?null:beginMapBusy("Actualizando "+(layer==="barrios"?"barrios visibles":"estratos visibles")+"…");
    if(!silent){state.polygonStatus[layer]="actualizando índice…";updatePolygonStatus();}
    const {bbox,zoom,cities}=mapViewportQuery();
    try{
      const scope=layer==="barrios"?state.barrioListMode:"visible";
      const cityFilter=cities?"&cities="+encodeURIComponent(cities):"";
      const url="/api/map-polygons?mode=index&layer="+encodeURIComponent(layer)+"&scope="+encodeURIComponent(scope)+"&bbox="+encodeURIComponent(bbox)+"&zoom="+encodeURIComponent(zoom)+cityFilter;
      const data=await authorizedFetch(url,controller,{ttl:45000});
      if(data.requiresZoom){
        state.polygonIndexData[layer]=[];
        clearPolygonLayer(layer,{keepStatus:true});
        state.polygonStatus[layer]="acércate al mapa (zoom "+data.minZoom+"+)";
        renderLayerControls();
        return;
      }
      state.polygonIndexData[layer]=Array.isArray(data.items)?data.items:[];
      const visibleCount=layer==="barrios"?state.polygonIndexData[layer].length:Number(data.totalVisible||0);
      const hasSelection=layer==="barrios"?(state.barrioAllSelected||state.polygonSelections.barrios.size>0):state.polygonSelections[layer].size>0;
      const noun=layer==="barrios"&&state.barrioListMode==="all"?" en base":" visibles";
      state.polygonStatus[layer]=visibleCount+noun+(hasSelection?" · cargando selección…":" · elige qué mostrar");
      renderLayerControls();
      await loadPolygonLayer(layer,{silent:true});
    }catch(error){
      if(error?.name==="AbortError")return;
      const kept=state.polygonFeatures[layer]?.length||0;
      state.polygonStatus[layer]=kept?("conexión inestable · manteniendo "+kept+" polígonos dibujados"):"no se pudo actualizar el índice";
      renderLayerControls();
    }finally{
      endMapBusy(busyToken);
      if(state.polygonIndexControllers[layer]===controller)state.polygonIndexControllers[layer]=null;
    }
  }

  async function loadPolygonLayer(layer,{silent=false}={}){
    if(!state.polygonActive[layer]||!ensureMap())return;
    const selection=state.polygonSelections[layer];
    const group=state.polygonGroups[layer];
    if(!state.map.hasLayer(group))group.addTo(state.map);

    state.polygonControllers[layer]?.abort();
    state.polygonControllers[layer]=null;

    const hasSelection=layer==="barrios"?(state.barrioAllSelected||selection?.size):selection?.size;
    if(!hasSelection){
      clearPolygonLayer(layer,{keepStatus:true});
      const visible=layer==="barrios"?(state.polygonIndexData.barrios||[]).length:(state.polygonIndexData.estratos||[]).reduce((sum,item)=>sum+(Number(item.count)||0),0);
      state.polygonStatus[layer]=visible+(layer==="barrios"&&state.barrioListMode==="all"?" en base":" visibles")+" · elige qué mostrar";
      renderLayerControls();
      return;
    }

    const controller=new AbortController();
    state.polygonControllers[layer]=controller;
    const busyToken=beginMapBusy("Dibujando "+(layer==="barrios"?"barrios seleccionados":"estratos seleccionados")+"…");
    if(!silent){state.polygonStatus[layer]="cargando selección…";updatePolygonStatus();}
    const {bbox,zoom,cities}=mapViewportQuery();
    const selected=[...selection];
    const filter=layer==="barrios"
      ?(state.barrioAllSelected
        ?("&allBarrios=1&excludeIds="+encodeURIComponent([...state.barrioExcluded].join(",")))
        :("&ids="+encodeURIComponent(selected.join(","))))
      :("&estratos="+encodeURIComponent(selected.join(",")));
    try{
      const cityFilter=cities?"&cities="+encodeURIComponent(cities):"";
      const url="/api/map-polygons?mode=geometry&layer="+encodeURIComponent(layer)+"&bbox="+encodeURIComponent(bbox)+"&zoom="+encodeURIComponent(zoom)+filter+cityFilter;
      const data=await authorizedFetch(url,controller,{ttl:90000});
      if(data.requiresZoom){
        clearPolygonLayer(layer,{keepStatus:true});
        state.polygonStatus[layer]="acércate al mapa (zoom "+data.minZoom+"+)";
        renderLayerControls();
        return;
      }
      const features=Array.isArray(data.features)?data.features:[];
      const drawn=drawPolygonLayer(layer,features);
      const received=features.length;
      state.polygonStatus[layer]=data.truncated
        ?("vista general · "+received+" recibidos · "+drawn+" dibujados · "+Number(data.totalVisible||received)+" seleccionados")
        :(received+" recibidos · "+drawn+" dibujados");
      if(received>0&&drawn===0){
        mapStatus("La capa recibió "+received+" polígonos pero el navegador no pudo dibujarlos. Se activó el renderer SVG compatible.","warning");
      }
      renderLayerControls();
    }catch(error){
      if(error?.name==="AbortError")return;
      const kept=state.polygonFeatures[layer]?.length||0;
      state.polygonStatus[layer]=kept?("conexión inestable · manteniendo "+kept+" polígonos dibujados"):"error al dibujar selección";
      renderLayerControls();
    }finally{
      endMapBusy(busyToken);
      if(state.polygonControllers[layer]===controller)state.polygonControllers[layer]=null;
    }
  }

  function refreshPolygonLayer(layer,{silent=false}={}){
    if(!state.polygonActive[layer])return;
    loadLayerIndex(layer,{silent});
  }

  function schedulePolygonReload(){
    if(!state.viewActive||Date.now()<state.polygonFocusUntil)return;
    if(state.polygonReloadTimer)clearTimeout(state.polygonReloadTimer);
    state.polygonReloadTimer=setTimeout(()=>{
      for(const layer of ["barrios","estratos"]){
        if(!state.polygonActive[layer])continue;
        if(layer==="barrios"&&state.barrioListMode==="all")loadPolygonLayer(layer,{silent:true});
        else refreshPolygonLayer(layer,{silent:true});
      }
    },650);
  }

  function schedulePolygonFilterRefresh(){
    if(state.polygonFilterTimer)clearTimeout(state.polygonFilterTimer);
    state.polygonFilterTimer=setTimeout(()=>{
      state.polygonFilterTimer=null;
      for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])refreshPolygonLayer(layer,{silent:true});
    },260);
  }

  function clearLayerSelection(layer){
    state.polygonSelections[layer].clear();
    if(layer==="barrios"){
      state.barrioAllSelected=false;
      state.barrioExcluded.clear();
    }
    clearPolygonLayer(layer,{keepStatus:true});
    renderLayerControls();
    loadPolygonLayer(layer,{silent:true});
  }

  function setLayerSelection(layer,value,checked){
    const key=String(value);
    const set=state.polygonSelections[layer];
    if(layer==="barrios"&&state.barrioAllSelected){
      if(checked)state.barrioExcluded.delete(key);
      else state.barrioExcluded.add(key);
    }else{
      if(checked)set.add(key);
      else set.delete(key);
    }
    renderLayerControls();
    if(state.polygonSelectionTimers[layer])clearTimeout(state.polygonSelectionTimers[layer]);
    state.polygonSelectionTimers[layer]=setTimeout(()=>{
      state.polygonSelectionTimers[layer]=null;
      loadPolygonLayer(layer,{silent:true});
    },220);
  }

  function togglePolygonLayer(layer){
    if(!ensureMap())return;
    const next=!state.polygonActive[layer];
    state.polygonActive[layer]=next;
    const group=state.polygonGroups[layer];

    if(next){
      if(layer==="estratos"){
        if(!state.estratosInitialized){state.polygonSelections.estratos=new Set(["1","2","3"]);state.estratosInitialized=true;}
      }else state.polygonSelections[layer].clear();
      state.polygonIndexData[layer]=[];
      if(layer==="barrios"){
        state.barrioAllSelected=false;
        state.barrioExcluded.clear();
      }
      if(!state.map.hasLayer(group))group.addTo(state.map);
      state.polygonStatus[layer]="actualizando índice…";
      updateLayerButtons();
      const requiredZoom=layer==="estratos"?11:10;
      if(!viewTouchesBucaramanga()||state.map.getZoom()<requiredZoom){
        viewBucaramanga();
      }else{
        refreshPolygonLayer(layer);
      }
    }else{
      state.polygonControllers[layer]?.abort();
      state.polygonIndexControllers[layer]?.abort();
      state.polygonControllers[layer]=null;
      state.polygonIndexControllers[layer]=null;
      state.polygonSelections[layer].clear();
      state.polygonIndexData[layer]=[];
      if(layer==="barrios"){
        state.barrioAllSelected=false;
        state.barrioExcluded.clear();
      }
      clearPolygonLayer(layer);
      if(state.map.hasLayer(group))state.map.removeLayer(group);
      updateLayerButtons();
    }
    renderLayerControls();
  }

  function focusPolygon(layer,id){
    const ref=state.polygonRefs[layer]?.get(String(id));
    if(!ref||!ensureMap())return;
    state.polygonFocusUntil=Date.now()+1800;
    if(ref.bounds?.isValid())state.map.fitBounds(ref.bounds,{padding:[28,28],maxZoom:17});
    const child=ref.leaflet?.getLayers?.()[0];
    if(child?.openPopup)setTimeout(()=>child.openPopup(),220);
  }

  function hideMapSearchResults(){
    const host=$("mapSearchResults");
    if(host){host.hidden=true;host.innerHTML="";}
  }

  function renderMapSearchResults(results){
    const host=$("mapSearchResults");
    if(!host)return;
    const rows=Array.isArray(results)?results:[];
    host.hidden=false;
    host.innerHTML=rows.length?rows.map((item,index)=>{
      const type=String(item.type||"mapa");
      const label={ciudad:"Ciudad / municipio",barrio:"Barrio FIBRAZO",troncal:"Troncal FIBRAZO",coordenada:"Coordenada",mapa:"Mapa"}[type]||"Mapa";
      return '<button type="button" data-search-index="'+index+'">'+
        '<span><b>'+esc(item.name||"Resultado")+'</b><small>'+esc(label)+(item.city?' · '+esc(item.city):'')+'</small></span>'+
        '<em>'+esc(item.source||"")+'</em>'+
      '</button>';
    }).join(""):'<div class="map-search-empty">No encontramos coincidencias.</div>';
    host._results=rows;
  }

  async function performMapSearch(){
    const input=$("mapSearchInput"),query=String(input?.value||"").trim();
    if(query.length<2){hideMapSearchResults();return;}
    state.searchController?.abort();
    const controller=new AbortController();
    state.searchController=controller;
    const busyToken=beginMapBusy("Buscando en el mapa…");
    try{
      const data=await authorizedFetch("/api/map-search?q="+encodeURIComponent(query),controller);
      renderMapSearchResults(data.results||[]);
    }catch(error){
      if(error?.name!=="AbortError")renderMapSearchResults([]);
    }finally{
      endMapBusy(busyToken);
      if(state.searchController===controller)state.searchController=null;
    }
  }

  function selectMapSearchResult(item){
    if(!item||!ensureMap())return;
    hideMapSearchResults();
    state.follow=false;
    if($("mapFollowToggle"))$("mapFollowToggle").checked=false;
    const bounds=Array.isArray(item.bounds)&&item.bounds.length===2?L.latLngBounds(item.bounds):null;
    if(bounds?.isValid())state.map.fitBounds(bounds,{padding:[30,30],maxZoom:item.type==="ciudad"?13:17});
    else if(Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lng)))state.map.setView([Number(item.lat),Number(item.lng)],item.type==="ciudad"?13:17);

    if(state.searchMarker){state.map.removeLayer(state.searchMarker);state.searchMarker=null;}
    if(Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lng))&&item.type!=="ciudad"){
      state.searchMarker=L.marker([Number(item.lat),Number(item.lng)],{
        pane:"markerPane",
        zIndexOffset:900,
        icon:L.divIcon({className:"map-search-marker",html:"<span>⌕</span>",iconSize:[28,28],iconAnchor:[14,14]})
      }).addTo(state.map);
      state.searchMarker.bindTooltip(String(item.name||"Resultado"),{direction:"top"}).openTooltip();
    }
    mapStatus("Mostrando "+String(item.name||"resultado")+" · "+String(item.source||"mapa")+".","success");
  }

  async function loadPoints({fit=false,silent=false}={}){
    if(!firebase?.auth?.().currentUser||state.pointsLoading)return;
    state.pointsLoading=true;
    state.lastPointsAttempt=Date.now();
    const busyToken=silent?null:beginMapBusy("Cargando puntos de exploración…");
    if(!silent)mapStatus("Actualizando puntos…","loading");
    try{
      const token=await firebase.auth().currentUser.getIdToken();
      const includeTests=state.mapQaAuthorized&&$("mapShowTests")?.checked===true;
      const response=await fetch("/api/map?limit=2000"+(includeTests?"&includeTests=1":""),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar el mapa.");
      state.points=Array.isArray(data.points)?data.points:[];
      state.visibility=data.visibility==="team"?"team":"own";
      state.mapQaAuthorized=data.canViewTests===true;
      if($("mapTestControl"))$("mapTestControl").hidden=!state.mapQaAuthorized;
      state.lastRefresh=new Date();
      cachePoints(state.points);
      updateFilters();
      renderMarkers({fit:fit||!state.loadedOnce});
      state.loadedOnce=true;
      mapStatus("Mapa actualizado · "+state.points.length+" puntos · "+state.lastRefresh.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),"success");
    }catch(error){
      const cached=cachedPoints();
      if(cached.length){
        state.points=cached;
        updateFilters();
        renderMarkers({fit:fit||!state.loadedOnce});
        state.loadedOnce=true;
        mapStatus("Sin conexión al servidor · mostrando "+cached.length+" puntos guardados en este dispositivo.","warning");
      }else{
        const message=String(error?.message||"");
        mapStatus(message.includes("_rotate")?"No se pudieron dibujar los puntos. Reintentando con modo compatible…":(message||"No se pudo cargar el mapa."),"error");
      }
    }finally{
      endMapBusy(busyToken);
      state.pointsLoading=false;
    }
  }

  function updateCurrentLocation(position,{center=false}={}){
    if(!ensureMap())return;
    const lat=position.coords.latitude,lng=position.coords.longitude,accuracy=position.coords.accuracy;
    state.lastLocation={lat,lng,accuracy,ts:position.timestamp||Date.now()};
    if(!state.currentMarker){
      state.currentMarker=L.circleMarker([lat,lng],{radius:9,weight:3,color:"#FFFFFF",fillColor:"#00FE9C",fillOpacity:1,pane:"overlayPane"}).addTo(state.map);
      state.currentMarker.bindTooltip("Mi ubicación",{permanent:false,direction:"top"});
    }else state.currentMarker.setLatLng([lat,lng]);
    if(!state.accuracyCircle){
      state.accuracyCircle=L.circle([lat,lng],{radius:Math.max(accuracy||0,1),weight:1,color:"#00FE9C",fillOpacity:.08,pane:"markerPane"}).addTo(state.map);
    }else{
      state.accuracyCircle.setLatLng([lat,lng]);
      state.accuracyCircle.setRadius(Math.max(accuracy||0,1));
    }
    if($("mapGpsAccuracy"))$("mapGpsAccuracy").textContent=Number.isFinite(accuracy)?"± "+Math.round(accuracy)+" m":"—";
    if(center||state.follow)state.map.setView([lat,lng],Math.max(state.map.getZoom(),17));
  }

  function addRoutePoint(position){
    const point={
      lat:position.coords.latitude,
      lng:position.coords.longitude,
      accuracy:Number(position.coords.accuracy)||null,
      ts:position.timestamp||Date.now()
    };
    const prev=state.route[state.route.length-1];
    const moved=prev?haversine(prev,point):Infinity;
    const elapsed=prev?point.ts-prev.ts:Infinity;
    if(prev&&moved<4&&elapsed<15000)return;
    state.route.push(point);
    if(state.route.length>5000)state.route=state.route.slice(-5000);
    saveRoute();
    redrawRoute();
  }

  function redrawRoute(){
    if(!ensureMap())return;
    if(state.routeLine){state.map.removeLayer(state.routeLine);state.routeLine=null;}
    if(state.route.length>=2){
      state.routeLine=L.polyline(state.route.map(p=>[p.lat,p.lng]),{weight:5,opacity:.9,color:"#00FE9C",pane:"markerPane"}).addTo(state.map);
    }
    updateRouteMetrics();
  }

  function updateTrackingUi(){
    const active=state.watchId!==null;
    const start=$("mapStartTracking"),status=$("mapTrackingState");
    if(start){
      start.textContent=active?"■ Detener recorrido":"▶ Iniciar recorrido";
      start.classList.toggle("tracking-active",active);
      start.classList.toggle("tracking-stop-ready",active);
      start.setAttribute("aria-pressed",String(active));
      start.disabled=false;
    }
    if(status){
      status.textContent=active?"Seguimiento activo":"Seguimiento detenido";
      status.classList.toggle("active",active);
    }
  }

  function updateRouteMetrics(){
    const distance=routeDistance();
    if($("mapRouteDistance"))$("mapRouteDistance").textContent=formatDistance(distance)||"0 m";
    if($("mapRoutePoints"))$("mapRoutePoints").textContent=state.route.length;
    updateTrackingUi();
  }

  function locateMe({auto=false}={}){
    if(!navigator.geolocation){
      if(!auto)mapStatus("Este dispositivo no ofrece ubicación GPS.","error");
      return;
    }
    mapStatus(auto?"Buscando tu ubicación automáticamente…":"Buscando tu ubicación…","loading");
    navigator.geolocation.getCurrentPosition(
      position=>{
        updateCurrentLocation(position,{center:true});
        mapStatus(auto?"Mapa centrado en tu ubicación actual.":"Ubicación actual encontrada.","success");
      },
      error=>{
        const message=error.code===1?"Permiso de ubicación denegado. Actívalo para este sitio.":"No se pudo obtener tu ubicación.";
        mapStatus(auto?"Ubicación automática no disponible · puedes usar Mi ubicación cuando quieras.":message,auto?"warning":"error");
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:5000}
    );
  }

  function startTracking(){
    if(state.watchId!==null){
      mapStatus("El recorrido ya está activo.","success");
      return;
    }
    if(!navigator.geolocation){mapStatus("Este dispositivo no ofrece ubicación GPS.","error");return;}
    state.follow=true;
    if($("mapFollowToggle"))$("mapFollowToggle").checked=true;
    mapStatus("Recorrido activo · esperando la primera lectura GPS…","loading");

    state.watchId=navigator.geolocation.watchPosition(
      position=>{
        updateCurrentLocation(position,{center:false});
        addRoutePoint(position);
        mapStatus("Recorrido activo · GPS "+(Number.isFinite(position.coords.accuracy)?"± "+Math.round(position.coords.accuracy)+" m":"activo")+" · los metros aumentan al desplazarte.","success");
      },
      error=>{
        stopTracking(false);
        mapStatus(error.code===1?"Permiso de ubicación denegado. Actívalo para este sitio.":"Se detuvo el seguimiento por un error de GPS.","error");
      },
      {enableHighAccuracy:true,timeout:20000,maximumAge:3000}
    );
    updateRouteMetrics();

    navigator.geolocation.getCurrentPosition(
      position=>{
        if(state.watchId===null)return; // Si se detuvo mientras cargaba, no anexar una ubicación tardía.
        updateCurrentLocation(position,{center:true});
        addRoutePoint(position);
        mapStatus("Recorrido activo · punto inicial registrado. Comienza a desplazarte para dibujar la ruta.","success");
      },
      ()=>{},
      {enableHighAccuracy:true,timeout:12000,maximumAge:3000}
    );
  }

  function stopTracking(show=true){
    if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId);
    state.watchId=null;
    updateRouteMetrics();
    if(show)mapStatus("Seguimiento detenido. El recorrido queda guardado en este dispositivo.","success");
  }

  function clearRoute(){
    stopTracking(false);
    state.route=[];
    saveRoute();
    redrawRoute();
    mapStatus("Recorrido limpiado.","success");
  }

  function fitVisible(){
    if(!ensureMap())return;
    const bounds=state.filtered.map(p=>[p.lat,p.lng]);
    if(bounds.length){
      state.follow=false;
      if($("mapFollowToggle"))$("mapFollowToggle").checked=false;
      state.map.fitBounds(bounds,{padding:[28,28],maxZoom:16});
      mapStatus("Mostrando todos los puntos visibles según los filtros.","success");
    }else{
      mapStatus("No hay puntos visibles con los filtros actuales.","warning");
    }
  }

  function startAutoRefresh(){
    if(state.refreshTimer)return;
    const tick=()=>{
      if(!state.viewActive||document.visibilityState!=="visible"||!navigator.onLine)return;
      const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      const slow=connection?.saveData||["slow-2g","2g"].includes(connection?.effectiveType);
      const wait=slow?REFRESH_SLOW_MS:REFRESH_MS;
      if(Date.now()-state.lastPointsAttempt>=wait)loadPoints({silent:true});
    };
    state.refreshTimer=setInterval(tick,15000);
  }
  function stopAutoRefresh(){
    if(state.refreshTimer){clearInterval(state.refreshTimer);state.refreshTimer=null;}
  }
  function onMapOpen(){
    state.viewActive=true;
    if(!ensureMap())return;
    setTimeout(()=>state.map.invalidateSize(),100);
    if(!state.loadedOnce){
      const cached=cachedPoints();
      if(cached.length){
        state.points=cached;
        updateFilters();
        renderMarkers({fit:false});
        state.loadedOnce=true;
        mapStatus("Mostrando "+cached.length+" puntos guardados · actualizando en segundo plano…","warning");
      }
    }
    if(navigator.onLine)loadPoints({fit:false,silent:state.loadedOnce});
    updateLayerButtons();
    updatePolygonStatus();
    updateTrackingUi();
    for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])refreshPolygonLayer(layer,{silent:true});
    if(!state.autoLocated){
      state.autoLocated=true;
      setTimeout(()=>locateMe({auto:true}),220);
    }
    startAutoRefresh();
  }
  function onMapClose(){
    state.viewActive=false;
    stopAutoRefresh();
  }

  function setMapFullscreen(force){
    const wrap=$("mapCanvasWrap");
    if(!wrap||!ensureMap())return;
    const next=typeof force==="boolean"?force:!state.fullscreen;
    state.fullscreen=next;
    wrap.classList.toggle("map-fullscreen",next);
    document.body.classList.toggle("map-fullscreen-open",next);
    const button=$("mapFullscreen");
    if(button){
      button.innerHTML=next?'↙ <span>Volver</span>':'⛶ <span>Pantalla completa</span>';
      button.title=next?"Volver a la vista anterior":"Ver mapa en pantalla completa";
      button.setAttribute("aria-pressed",String(next));
    }
    setTimeout(()=>state.map?.invalidateSize(),80);
  }

  function bind(){
    document.addEventListener("click",event=>{
      const button=event.target.closest("[data-map-copy-point]");
      if(!button)return;
      event.preventDefault();
      copyCoordinates(Number(button.dataset.lat),Number(button.dataset.lng)).then(()=>{
        const owner=button.parentElement;
        if(!owner)return;
        owner.querySelector(".map-copy-feedback")?.remove();
        const notice=document.createElement("span");
        notice.className="map-copy-feedback";
        notice.setAttribute("role","status");
        notice.textContent="✓ Copiado";
        owner.appendChild(notice);
        setTimeout(()=>notice.remove(),1800);
      });
    });
    ["mapCityFilter","mapTypeFilter","mapOperatorFilter","mapUserFilter","mapDateFrom","mapDateTo","mapPhotosFilter"].forEach(id=>$(id)?.addEventListener("change",()=>{
      updateFilterCount();renderMarkers();
      if(id==="mapCityFilter")schedulePolygonFilterRefresh();
    }));
    $("mapShowTests")?.addEventListener("change",()=>{renderMarkers();updateFilterCount();loadPoints({silent:true});});
    $("mapRefresh")?.addEventListener("click",refreshMapNow);
    $("mapQuickRefresh")?.addEventListener("click",refreshMapNow);
    $("mapQuickReset")?.addEventListener("click",clearAllMapFilters);
    $("mapFullscreen")?.addEventListener("click",()=>setMapFullscreen());
    $("mapFitPoints")?.addEventListener("click",fitVisible);
    $("mapFiltersToggle")?.addEventListener("click",()=>toggleFilters());
    $("mapClearFilters")?.addEventListener("click",clearFilters);
    $("mapPointLegendToggle")?.addEventListener("click",togglePointLegend);
    $("mapLayersToggle")?.addEventListener("click",()=>toggleLayersPanel());
    $("mapLayerBarrios")?.addEventListener("click",()=>togglePolygonLayer("barrios"));
    $("mapLayerEstratos")?.addEventListener("click",()=>togglePolygonLayer("estratos"));
    // FO-CHG-033: activar automáticamente la capa y los estratos 1, 2 y 3 al iniciar mapa.
    if(!state.polygonActive.estratos)togglePolygonLayer("estratos");
    $("mapViewBucaramanga")?.addEventListener("click",viewBucaramanga);
    $("mapClearEstratos")?.addEventListener("click",()=>clearLayerSelection("estratos"));
    $("mapClearBarrios")?.addEventListener("click",()=>clearLayerSelection("barrios"));
    $("mapSelectAllBarrios")?.addEventListener("click",selectAllBarrios);
    $("mapBarrioModeVisible")?.addEventListener("click",()=>setBarrioListMode("visible"));
    $("mapBarrioModeAll")?.addEventListener("click",()=>setBarrioListMode("all"));
    $("mapBarrioSearch")?.addEventListener("input",renderBarrioControls);
    $("mapEstratoSearch")?.addEventListener("input",renderEstratoControls);
    $("mapEstratoOptions")?.addEventListener("change",event=>{
      const input=event.target.closest('input[data-layer-option="estratos"]');
      if(input)setLayerSelection("estratos",input.value,input.checked);
    });
    $("mapBarrioOptions")?.addEventListener("change",event=>{
      const input=event.target.closest('input[data-layer-option="barrios"]');
      if(input)setLayerSelection("barrios",input.value,input.checked);
    });
    $("mapSearchButton")?.addEventListener("click",performMapSearch);
    $("mapSearchInput")?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();performMapSearch();}});
    $("mapSearchResults")?.addEventListener("click",event=>{
      const button=event.target.closest("[data-search-index]");
      if(!button)return;
      const results=$("mapSearchResults")?._results||[];
      selectMapSearchResult(results[Number(button.dataset.searchIndex)]);
    });
    $("mapBaseToggle")?.addEventListener("click",()=>setBaseMap(state.baseMode==="satellite"?"street":"satellite"));
    $("mapLocateMe")?.addEventListener("click",locateMe);
    $("mapStartTracking")?.addEventListener("click",()=>{
      if(state.watchId!==null)stopTracking(true);
      else startTracking();
    });
    $("mapClearRoute")?.addEventListener("click",clearRoute);
    $("mapFollowToggle")?.addEventListener("change",event=>{state.follow=!!event.target.checked;});
    window.addEventListener("fibrazo:view-change",event=>{
      if(event.detail?.view==="map")onMapOpen();
      else onMapClose();
    });
    window.addEventListener("fibrazo:submission-saved",()=>{if(state.viewActive)loadPoints({silent:true});});
    if(window.firebase?.auth){
      firebase.auth().onAuthStateChanged(user=>{
        stopTracking(false);
        state.points=[];
        state.filtered=[];
        state.loadedOnce=false;
        state.autoLocated=false;
        state.mapQaAuthorized=false;
        if($("mapTestControl"))$("mapTestControl").hidden=true;
        if($("mapShowTests"))$("mapShowTests").checked=false;
        state.route=user?routeStorage():[];
        state.barrioListMode="visible";
        state.barrioAllSelected=false;
        state.barrioExcluded.clear();
        for(const layer of ["barrios","estratos"]){
          state.polygonActive[layer]=false;
          state.polygonSelections[layer].clear();
          state.polygonIndexData[layer]=[];
          clearPolygonLayer(layer);
        }
        updateLayerButtons();
        renderLayerControls();
        if(state.map){
          redrawRoute();
          renderMarkers();
        }
      });
    }
    window.FIBRAZO_MAP_REFRESH=()=>loadPoints({fit:false});
    updateTrackingUi();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();
