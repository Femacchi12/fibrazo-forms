(() => {
  const CACHE_KEY="fibrazoExplorationMapPointsV1";
  const ROUTE_KEY="fibrazoExplorationRouteV1";

  function userScopedKey(base){
    const email=String(window.firebase?.auth?.().currentUser?.email||"anonimo").trim().toLowerCase();
    return base+":"+email;
  }
  const REFRESH_MS=30000;
  const BUCARAMANGA_BOUNDS=[[7.070607677,-73.172095278],[7.195892798,-73.093548025]];

  const state={
    map:null,
    surveyLayer:null,
    baseLayers:null,
    baseMode:"street",
    visibility:"own",
    polygonActive:{barrios:false,estratos:false},
    polygonGroups:null,
    polygonFeatures:{barrios:[],estratos:[]},
    polygonRefs:{barrios:new Map(),estratos:new Map()},
    polygonStatus:{barrios:"",estratos:""},
    polygonControllers:{barrios:null,estratos:null},
    polygonReloadTimer:null,
    polygonFocusUntil:0,
    polygonIndexGroups:new Map(),
    busy:new Map(),
    busySeq:0,
    selectedMarker:null,
    longPress:null,
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
    viewActive:false
  };

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
  const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
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
  const formType=value=>norm(value)==="presencial"?"Presencial":"Virtual";
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

  function ensureMap(){
    if(state.map)return true;
    if(!window.L||!$("explorationMap"))return false;
    const rotateSupported=typeof L.Map?.prototype?.setBearing==="function";
    state.map=L.map("explorationMap",{
      zoomControl:true,
      preferCanvas:true,
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
    state.map.createPane("territorialPane");
    state.map.getPane("territorialPane").style.zIndex="350";
    state.map.getPane("territorialPane").style.pointerEvents="auto";
    state.polygonGroups={barrios:L.layerGroup(),estratos:L.layerGroup()};
    state.surveyLayer=L.layerGroup().addTo(state.map);
    state.map.on("moveend zoomend",schedulePolygonReload);
    state.route=routeStorage();
    redrawRoute();
    updateBaseMapButtons();
    installLongPressSelection();
    setTimeout(()=>state.map.invalidateSize(),80);
    return true;
  }

  function updateBaseMapButtons(){
    $("mapBaseStreet")?.classList.toggle("active",state.baseMode==="street");
    $("mapBaseSatellite")?.classList.toggle("active",state.baseMode==="satellite");
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
    updateBaseMapButtons();
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
      for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])loadPolygonLayer(layer,{silent:true});
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

  function openCoordinateSheet(latlng){
    if(!latlng)return;
    const lat=Number(latlng.lat),lng=Number(latlng.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    closeCoordinateSheet();

    if(state.selectedMarker&&state.map)state.map.removeLayer(state.selectedMarker);
    state.selectedMarker=L.circleMarker([lat,lng],{
      radius:8,weight:3,color:"#FFFFFF",fillColor:"#FFB84D",fillOpacity:1,pane:"markerPane"
    }).addTo(state.map);
    state.selectedMarker.bindTooltip("Punto seleccionado",{direction:"top"}).openTooltip();

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
      '<div class="map-coordinate-value">'+lat.toFixed(6)+', '+lng.toFixed(6)+'</div>'+
      '<div class="map-coordinate-actions">'+
        '<button type="button" data-map-copy>⧉ Copiar coordenada</button>'+
        '<button type="button" data-map-route>↗ Ruta en Google Maps</button>'+
      '</div>'+
      '<div class="map-coordinate-forms"><span>COMPLETAR FORMULARIO</span><div data-map-form-list></div></div>';
    document.body.append(backdrop,sheet);
    sheet.addEventListener("click",event=>event.stopPropagation());
    sheet.querySelector("[data-map-close]")?.addEventListener("click",closeCoordinateSheet);
    sheet.querySelector("[data-map-copy]")?.addEventListener("click",()=>copyCoordinates(lat,lng));
    sheet.querySelector("[data-map-route]")?.addEventListener("click",()=>{
      window.open("https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(lat+","+lng),"_blank","noopener");
    });
    const list=sheet.querySelector("[data-map-form-list]");
    const forms=availableCoordinateForms();
    if(list){
      list.innerHTML=forms.length?forms.map(form=>'<button type="button" data-form-id="'+esc(form.id)+'"><b>'+esc(form.name||form.id)+'</b><small>Usar '+lat.toFixed(6)+', '+lng.toFixed(6)+'</small></button>').join(""):'<div class="map-coordinate-empty">No hay formularios disponibles para esta cuenta.</div>';
      list.addEventListener("click",event=>{
        const button=event.target.closest("[data-form-id]");
        if(button)startFormAtCoordinate(button.dataset.formId,lat,lng);
      });
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
    if(point.maps)links.push('<a href="'+esc(point.maps)+'" target="_blank" rel="noopener">↗ Google Maps</a>');
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
      operators+note+
      (links.length?'<div class="map-popup-links">'+links.join("")+'</div>':"")+
    '</div>';
  }

  function markerStyle(point){
    const presencial=formType(point.type)==="Presencial";
    return presencial
      ?{radius:7,weight:2,opacity:1,fillOpacity:.86,color:"#00FE9C",fillColor:"#00FE9C"}
      :{radius:7,weight:2,opacity:1,fillOpacity:.86,color:"#57C7FF",fillColor:"#57C7FF"};
  }

  function renderMarkers({fit=false}={}){
    if(!ensureMap())return;
    state.surveyLayer.clearLayers();
    const filtered=filteredPoints();
    state.filtered=filtered;
    const bounds=[];
    for(const point of filtered){
      const marker=L.circleMarker([point.lat,point.lng],markerStyle(point));
      marker.bindPopup(popupHtml(point),{maxWidth:320});
      marker.addTo(state.surveyLayer);
      bounds.push([point.lat,point.lng]);
    }
    updateKpis(filtered);
    if(fit&&bounds.length&&!state.watchId){
      state.map.fitBounds(bounds,{padding:[24,24],maxZoom:15});
    }
  }

  function filteredPoints(){
    const city=$("mapCityFilter")?.value||"all";
    const type=$("mapTypeFilter")?.value||"all";
    const user=$("mapUserFilter")?.value||"all";
    const from=$("mapDateFrom")?.value?new Date($("mapDateFrom").value+"T00:00:00"):null;
    const to=$("mapDateTo")?.value?new Date($("mapDateTo").value+"T23:59:59.999"):null;
    return state.points.filter(point=>{
      const pointCity=String(point.city?.assigned||point.observedCity||"").trim();
      const when=new Date(point.timestamp);
      if(city!=="all"&&pointCity!==city)return false;
      if(type!=="all"&&formType(point.type)!==type)return false;
      if(user!=="all"&&String(point.user||"")!==user)return false;
      if(from&&!Number.isNaN(when.getTime())&&when<from)return false;
      if(to&&!Number.isNaN(when.getTime())&&when>to)return false;
      return true;
    });
  }

  function updateFilters(){
    const city=$("mapCityFilter"),user=$("mapUserFilter");
    if(city){
      const current=city.value||"all";
      const cities=[...new Set(state.points.map(p=>String(p.city?.assigned||p.observedCity||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
      city.innerHTML='<option value="all">Todas las ciudades</option>'+cities.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
      if(cities.includes(current))city.value=current;
    }
    if(user){
      const current=user.value||"all";
      const users=[...new Set(state.points.map(p=>String(p.user||"").trim()).filter(Boolean))].sort();
      user.innerHTML='<option value="all">Todos los usuarios</option>'+users.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
      user.hidden=state.visibility!=="team";
      if(users.includes(current))user.value=current;
      else user.value="all";
    }
    updateFilterCount();
    updateVisibilityBadge();
  }

  function updateKpis(filtered=state.filtered){
    const list=Array.isArray(filtered)?filtered:[];
    if($("mapPointCount"))$("mapPointCount").textContent=list.length;
    if($("mapVirtualCount"))$("mapVirtualCount").textContent=list.filter(p=>formType(p.type)==="Virtual").length;
    if($("mapPresentialCount"))$("mapPresentialCount").textContent=list.filter(p=>formType(p.type)==="Presencial").length;
    if($("mapCityCount"))$("mapCityCount").textContent=new Set(list.map(p=>p.city?.assigned||p.observedCity).filter(Boolean)).size;
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
    if(($("mapCityFilter")?.value||"all")!=="all")count++;
    if(($("mapTypeFilter")?.value||"all")!=="all")count++;
    if(state.visibility==="team"&&($("mapUserFilter")?.value||"all")!=="all")count++;
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

  function clearFilters(){
    if($("mapCityFilter"))$("mapCityFilter").value="all";
    if($("mapTypeFilter"))$("mapTypeFilter").value="all";
    if($("mapUserFilter"))$("mapUserFilter").value="all";
    if($("mapDateFrom"))$("mapDateFrom").value="";
    if($("mapDateTo"))$("mapDateTo").value="";
    updateFilterCount();
    renderMarkers({fit:true});
  }

  const ESTRATO_COLORS={
    "1":"#F2C94C","2":"#6FCF97","3":"#56CCF2","4":"#4C78FF","5":"#9B51E0","6":"#EB5757"
  };
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
    renderPolygonLegendAndIndex();
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
    renderPolygonLegendAndIndex();
  }

  function polygonStyle(layer,feature,color){
    return {
      pane:"territorialPane",
      color,
      weight:layer==="barrios"?2:1.6,
      opacity:.95,
      fillColor:color,
      fillOpacity:layer==="barrios"?.13:.19
    };
  }

  function drawPolygonLayer(layer,features){
    const group=state.polygonGroups?.[layer];
    if(!group)return;
    group.clearLayers();
    state.polygonRefs[layer]=new Map();
    const barrioColors=layer==="barrios"?assignBarrioColors(features):null;
    for(const feature of features){
      const id=String(feature?.properties?.id||feature?.id||"");
      const color=layer==="barrios"?(barrioColors.get(id)||BARRIO_COLORS[0]):estratoColor(feature);
      const geo=L.geoJSON(feature,{
        pane:"territorialPane",
        style:()=>polygonStyle(layer,feature,color),
        onEachFeature:(f,leaf)=>{
          leaf.bindPopup(polygonPopup(f,layer,color),{maxWidth:320});
          leaf.on("mouseover",()=>leaf.setStyle({weight:3,fillOpacity:.30}));
          leaf.on("mouseout",()=>leaf.setStyle(polygonStyle(layer,feature,color)));
        }
      });
      geo.addTo(group);
      state.polygonRefs[layer].set(id,{feature,leaflet:geo,color,bounds:geo.getBounds()});
    }
    state.polygonFeatures[layer]=features;
    renderPolygonLegendAndIndex();
  }

  function updatePolygonStatus(){
    const el=$("mapLayerStatus");
    if(!el)return;
    const active=Object.entries(state.polygonActive).filter(([,value])=>value).map(([layer])=>layer);
    if(!active.length){el.textContent="Capas apagadas.";return;}
    const labels=active.map(layer=>{
      const name=layer==="barrios"?"Barrios":"Estratos";
      return state.polygonStatus[layer]?name+": "+state.polygonStatus[layer]:name+": cargando…";
    });
    el.textContent=labels.join(" · ");
  }

  async function loadPolygonLayer(layer,{silent=false}={}){
    if(!state.polygonActive[layer]||!ensureMap())return;
    const group=state.polygonGroups[layer];
    if(!state.map.hasLayer(group))group.addTo(state.map);
    const controller=state.polygonControllers[layer];
    if(controller)controller.abort();
    const nextController=new AbortController();
    state.polygonControllers[layer]=nextController;
    const busyToken=beginMapBusy("Cargando "+(layer==="barrios"?"barrios":"estratos")+"…");
    if(!silent){state.polygonStatus[layer]="cargando…";updatePolygonStatus();}

    const bounds=state.map.getBounds();
    const bbox=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].map(v=>Number(v).toFixed(6)).join(",");
    const zoom=state.map.getZoom();

    try{
      const user=firebase?.auth?.().currentUser;
      if(!user)return;
      const token=await user.getIdToken();
      const url="/api/map-polygons?layer="+encodeURIComponent(layer)+"&bbox="+encodeURIComponent(bbox)+"&zoom="+encodeURIComponent(zoom);
      const response=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:nextController.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la capa.");

      if(data.requiresZoom){
        clearPolygonLayer(layer,{keepStatus:true});
        state.polygonStatus[layer]="acércate al mapa (zoom "+data.minZoom+"+)";
        updatePolygonStatus();
        return;
      }

      const features=Array.isArray(data.features)?data.features:[];
      drawPolygonLayer(layer,features);
      state.polygonStatus[layer]=data.truncated
        ?("mostrando "+features.length+" de "+Number(data.totalVisible||features.length)+" · acerca el mapa para detalle completo")
        :(features.length+" visibles");
      updatePolygonStatus();
    }catch(error){
      if(error?.name==="AbortError")return;
      clearPolygonLayer(layer,{keepStatus:true});
      state.polygonStatus[layer]="error al cargar";
      updatePolygonStatus();
    }finally{
      endMapBusy(busyToken);
      if(state.polygonControllers[layer]===nextController)state.polygonControllers[layer]=null;
    }
  }

  function schedulePolygonReload(){
    if(!state.viewActive||Date.now()<state.polygonFocusUntil)return;
    if(state.polygonReloadTimer)clearTimeout(state.polygonReloadTimer);
    state.polygonReloadTimer=setTimeout(()=>{
      for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])loadPolygonLayer(layer,{silent:true});
    },280);
  }

  function togglePolygonLayer(layer){
    if(!ensureMap())return;
    const next=!state.polygonActive[layer];
    state.polygonActive[layer]=next;
    const group=state.polygonGroups[layer];
    if(next){
      if(!state.map.hasLayer(group))group.addTo(state.map);
      state.polygonStatus[layer]="cargando…";
      const requiredZoom=layer==="estratos"?11:10;
      if(!viewTouchesBucaramanga()||state.map.getZoom()<requiredZoom){
        viewBucaramanga();
      }else{
        loadPolygonLayer(layer);
      }
    }else{
      state.polygonControllers[layer]?.abort();
      state.polygonControllers[layer]=null;
      if(state.map.hasLayer(group))state.map.removeLayer(group);
      state.polygonStatus[layer]="";
    }
    updateLayerButtons();
    updatePolygonStatus();
  }

  function focusPolygon(layer,id){
    const ref=state.polygonRefs[layer]?.get(String(id));
    if(!ref||!ensureMap())return;
    state.polygonFocusUntil=Date.now()+1800;
    if(ref.bounds?.isValid())state.map.fitBounds(ref.bounds,{padding:[28,28],maxZoom:17});
    const child=ref.leaflet?.getLayers?.()[0];
    if(child?.openPopup)setTimeout(()=>child.openPopup(),220);
  }

  function focusPolygonGroup(key){
    const group=state.polygonIndexGroups.get(String(key));
    if(!group||!ensureMap())return;
    state.polygonFocusUntil=Date.now()+1800;
    let bounds=null;
    for(const ref of group.refs){
      if(!ref.bounds?.isValid())continue;
      bounds=bounds?bounds.extend(ref.bounds):L.latLngBounds(ref.bounds);
    }
    if(bounds?.isValid())state.map.fitBounds(bounds,{padding:[28,28],maxZoom:17});
    const first=group.refs[0]?.leaflet?.getLayers?.()[0];
    if(first?.openPopup)setTimeout(()=>first.openPopup(),220);
  }

  function renderPolygonLegendAndIndex(){
    const legend=$("mapPolygonLegend"),wrap=$("mapPolygonIndexWrap"),index=$("mapPolygonIndex"),countEl=$("mapPolygonIndexCount");
    if(!legend||!wrap||!index)return;
    const active=Object.entries(state.polygonActive).filter(([,value])=>value).map(([layer])=>layer);
    if(!active.length){
      legend.hidden=true;wrap.hidden=true;index.innerHTML="";state.polygonIndexGroups=new Map();if(countEl)countEl.textContent="0";return;
    }

    const parts=[];
    if(state.polygonActive.estratos){
      const swatches=Object.entries(ESTRATO_COLORS).map(([value,color])=>'<span><i style="background:'+color+'"></i>Estrato '+value+'</span>').join("");
      parts.push('<div class="polygon-legend-section"><b>Estratos</b><div class="polygon-legend-items">'+swatches+'<span><i style="background:#7A8580"></i>Sin información</span></div></div>');
    }
    if(state.polygonActive.barrios){
      const swatches=BARRIO_COLORS.slice(0,8).map(color=>'<i style="background:'+color+'"></i>').join("");
      parts.push('<div class="polygon-legend-section"><b>Barrios</b><div class="polygon-neighborhood-palette">'+swatches+'</div><small>Colores alternados por proximidad para diferenciar límites; no representan una categoría.</small></div>');
    }
    legend.innerHTML=parts.join("");
    legend.hidden=false;

    const groups=new Map();
    for(const layer of ["barrios","estratos"]){
      if(!state.polygonActive[layer])continue;
      for(const ref of state.polygonRefs[layer].values()){
        const p=ref.feature?.properties||{};
        const rawLabel=layer==="barrios"?String(p.name||"Barrio"):String(p.estrato||p.name||"Sin información");
        const municipio=String(p.municipio||"");
        const key=layer+"|"+norm(rawLabel)+"|"+norm(municipio);
        if(!groups.has(key)){
          groups.set(key,{key,layer,label:layer==="barrios"?rawLabel:"Estrato "+rawLabel,municipio,color:ref.color,refs:[]});
        }
        groups.get(key).refs.push(ref);
      }
    }
    state.polygonIndexGroups=groups;
    const ordered=[...groups.values()].sort((a,b)=>a.layer.localeCompare(b.layer)||a.label.localeCompare(b.label,"es",{numeric:true,sensitivity:"base"})||a.municipio.localeCompare(b.municipio,"es"));

    index.innerHTML=ordered.length?ordered.slice(0,140).map(group=>
      '<button class="polygon-index-item" type="button" data-polygon-key="'+esc(group.key)+'">'+
        '<i style="background:'+esc(group.color)+'"></i>'+
        '<span><b>'+esc(group.label)+'</b><small>'+esc(group.municipio)+(group.refs.length>1?' · '+group.refs.length+' polígonos':'')+'</small></span>'+
      '</button>'
    ).join(""):'<div class="polygon-index-empty">No hay polígonos visibles en esta escala.</div>';
    if(countEl)countEl.textContent=String(ordered.length);
    wrap.hidden=false;
  }

  async function loadPoints({fit=false,silent=false}={}){
    if(!firebase?.auth?.().currentUser)return;
    const busyToken=beginMapBusy("Cargando puntos de exploración…");
    if(!silent)mapStatus("Actualizando puntos…","loading");
    try{
      const token=await firebase.auth().currentUser.getIdToken();
      const response=await fetch("/api/map?limit=2000",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar el mapa.");
      state.points=Array.isArray(data.points)?data.points:[];
      state.visibility=data.visibility==="team"?"team":"own";
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
        mapStatus(error.message||"No se pudo cargar el mapa.","error");
      }
    }finally{
      endMapBusy(busyToken);
    }
  }

  function updateCurrentLocation(position,{center=false}={}){
    if(!ensureMap())return;
    const lat=position.coords.latitude,lng=position.coords.longitude,accuracy=position.coords.accuracy;
    state.lastLocation={lat,lng,accuracy,ts:position.timestamp||Date.now()};
    if(!state.currentMarker){
      state.currentMarker=L.circleMarker([lat,lng],{radius:9,weight:3,color:"#FFFFFF",fillColor:"#00FE9C",fillOpacity:1}).addTo(state.map);
      state.currentMarker.bindTooltip("Mi ubicación",{permanent:false,direction:"top"});
    }else state.currentMarker.setLatLng([lat,lng]);
    if(!state.accuracyCircle){
      state.accuracyCircle=L.circle([lat,lng],{radius:Math.max(accuracy||0,1),weight:1,color:"#00FE9C",fillOpacity:.08}).addTo(state.map);
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
      state.routeLine=L.polyline(state.route.map(p=>[p.lat,p.lng]),{weight:5,opacity:.9,color:"#00FE9C"}).addTo(state.map);
    }
    updateRouteMetrics();
  }

  function updateRouteMetrics(){
    const distance=routeDistance();
    if($("mapRouteDistance"))$("mapRouteDistance").textContent=formatDistance(distance)||"0 m";
    if($("mapRoutePoints"))$("mapRoutePoints").textContent=state.route.length;
    if($("mapTrackingState"))$("mapTrackingState").textContent=state.watchId!==null?"Seguimiento activo":"Seguimiento detenido";
  }

  function locateMe(){
    if(!navigator.geolocation){
      mapStatus("Este dispositivo no ofrece ubicación GPS.","error");return;
    }
    mapStatus("Buscando tu ubicación…","loading");
    navigator.geolocation.getCurrentPosition(
      position=>{updateCurrentLocation(position,{center:true});mapStatus("Ubicación actual encontrada.","success");},
      error=>mapStatus(error.code===1?"Permiso de ubicación denegado. Actívalo para este sitio.":"No se pudo obtener tu ubicación.","error"),
      {enableHighAccuracy:true,timeout:15000,maximumAge:5000}
    );
  }

  function startTracking(){
    if(state.watchId!==null)return;
    if(!navigator.geolocation){mapStatus("Este dispositivo no ofrece ubicación GPS.","error");return;}
    state.follow=true;
    if($("mapFollowToggle"))$("mapFollowToggle").checked=true;
    mapStatus("Iniciando seguimiento del recorrido…","loading");
    state.watchId=navigator.geolocation.watchPosition(
      position=>{
        updateCurrentLocation(position,{center:false});
        addRoutePoint(position);
        mapStatus("Recorrido activo · GPS "+(Number.isFinite(position.coords.accuracy)?"± "+Math.round(position.coords.accuracy)+" m":"activo"),"success");
      },
      error=>{
        stopTracking(false);
        mapStatus(error.code===1?"Permiso de ubicación denegado. Actívalo para este sitio.":"Se detuvo el seguimiento por un error de GPS.","error");
      },
      {enableHighAccuracy:true,timeout:20000,maximumAge:3000}
    );
    updateRouteMetrics();
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
    state.refreshTimer=setInterval(()=>{if(state.viewActive)loadPoints({silent:true});},REFRESH_MS);
  }
  function stopAutoRefresh(){
    if(state.refreshTimer){clearInterval(state.refreshTimer);state.refreshTimer=null;}
  }
  function onMapOpen(){
    state.viewActive=true;
    if(!ensureMap())return;
    setTimeout(()=>state.map.invalidateSize(),100);
    loadPoints({fit:!state.loadedOnce});
    updateLayerButtons();
    updatePolygonStatus();
    for(const layer of ["barrios","estratos"])if(state.polygonActive[layer])loadPolygonLayer(layer,{silent:true});
    startAutoRefresh();
  }
  function onMapClose(){
    state.viewActive=false;
    stopAutoRefresh();
  }

  function bind(){
    ["mapCityFilter","mapTypeFilter","mapUserFilter","mapDateFrom","mapDateTo"].forEach(id=>$(id)?.addEventListener("change",()=>{updateFilterCount();renderMarkers();}));
    $("mapRefresh")?.addEventListener("click",()=>loadPoints({fit:false}));
    $("mapFitPoints")?.addEventListener("click",fitVisible);
    $("mapFiltersToggle")?.addEventListener("click",()=>toggleFilters());
    $("mapClearFilters")?.addEventListener("click",clearFilters);
    $("mapLayersToggle")?.addEventListener("click",()=>toggleLayersPanel());
    $("mapLayerBarrios")?.addEventListener("click",()=>togglePolygonLayer("barrios"));
    $("mapLayerEstratos")?.addEventListener("click",()=>togglePolygonLayer("estratos"));
    $("mapViewBucaramanga")?.addEventListener("click",viewBucaramanga);
    $("mapPolygonIndex")?.addEventListener("click",event=>{
      const button=event.target.closest("[data-polygon-key]");
      if(button)focusPolygonGroup(button.dataset.polygonKey);
    });
    $("mapBaseStreet")?.addEventListener("click",()=>setBaseMap("street"));
    $("mapBaseSatellite")?.addEventListener("click",()=>setBaseMap("satellite"));
    $("mapLocateMe")?.addEventListener("click",locateMe);
    $("mapStartTracking")?.addEventListener("click",startTracking);
    $("mapStopTracking")?.addEventListener("click",()=>stopTracking(true));
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
        state.route=user?routeStorage():[];
        for(const layer of ["barrios","estratos"])clearPolygonLayer(layer);
        if(state.map){
          redrawRoute();
          renderMarkers();
        }
      });
    }
    window.FIBRAZO_MAP_REFRESH=()=>loadPoints({fit:false});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();