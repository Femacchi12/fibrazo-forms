window.FIBRAZO_PENDING = [];

const FIBRAZO_CURRENT_YEAR = new Date().getFullYear();

window.FIBRAZO_FORMS = {
  INTELIGENCIA_OPERADOR: {
    id:"INTELIGENCIA_OPERADOR",
    name:"Inteligencia de operadores",
    description:"Biblioteca de identificación visual y técnica de ISPs locales/regionales observados en campo.",
    eyebrow:"COMPETENCIA",
    meta:["GPS en paralelo","1 foto por elemento","Identificación en campo"],
    sections:[
      {id:"coordenada",title:"Coordenada",description:"Carga la ubicación por GPS o manualmente. La lectura territorial se procesa en segundo plano mientras continúas."},
      {id:"identificacion",title:"Operador",description:"Identifica el ISP observado."},
      {id:"elementos",title:"Elementos de red",description:"Registra cómo reconocer su infraestructura y anexa una foto por cada elemento cuando corresponda."},
      {id:"calidad",title:"Calidad y oferta comercial",description:"Evalúa la ejecución visible, la percepción del servicio y registra los precios regulares del operador."},
      {id:"validacion",title:"Validación territorial",description:"Confirma al final la coordenada y la información territorial procesada automáticamente."}
    ],
    fields:[
      {key:"coordenadas",section:"coordenada",label:"Coordenadas de referencia",type:"gps",required:true,full:true,manualEdit:true,help:"Toma la ubicación por GPS o ingrésala manualmente. Puedes continuar mientras se procesa la información territorial."},
      {key:"operador",section:"identificacion",label:"ISP / operador",type:"isp-autocomplete",required:true},
      {key:"modelo_caja",section:"elementos",label:"Modelo / tipo de caja",type:"editable-options",options:["Común negra","Pequeña negra"]},
      {key:"foto_modelo_caja",section:"elementos",label:"Foto · modelo / tipo de caja",type:"photo-single"},
      {key:"nomenclatura_caja",section:"elementos",label:"Nomenclatura / identificación de cajas",type:"text"},
      {key:"foto_nomenclatura_caja",section:"elementos",label:"Foto · nomenclatura / identificación",type:"photo-single"},
      {key:"marquilla",section:"elementos",label:"Marquilla despliegue",type:"editable-options",options:["Sin marquilla","Verde","Naranja","Roja","Azul","Blanca"]},
      {key:"foto_marquilla",section:"elementos",label:"Foto · marquilla despliegue",type:"photo-single"},
      {key:"marquilla_drop",section:"elementos",label:"Marquilla drop",type:"editable-options",options:["Sin marquilla","Verde","Naranja","Roja","Azul","Blanca"]},
      {key:"foto_marquilla_drop",section:"elementos",label:"Foto · marquilla drop",type:"photo-single"},
      {key:"tipo_tensor",section:"elementos",label:"Tensor de despliegue",type:"editable-options",options:["SIPA","Metálico"]},
      {key:"foto_tipo_tensor",section:"elementos",label:"Foto · tensor / herraje",type:"photo-single"},
      {key:"tensor_acometida",section:"elementos",label:"Tensor de acometida",type:"editable-options",options:["Cartuchera pequeña","Cartuchera grande","Figura 8","Clamp metálico","Clamp plástico","Portante drop"]},
      {key:"foto_tensor_acometida",section:"elementos",label:"Foto · tensor de acometida",type:"photo-single"},
      {key:"calidad_tendido",section:"calidad",label:"Calidad de tendido e instalación",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Muy mala: instalación desordenada, improvisada o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden, fijación o ejecución.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."}},
      {key:"calidad_servicio_percibida",section:"calidad",label:"Calidad del servicio percibida por el cliente",type:"segmented",options:["1","2","3","4","5"],details:{"1":"Muy mala","2":"Mala","3":"Aceptable","4":"Buena","5":"Muy buena"}},
      {key:"precio_solo_internet",section:"calidad",label:"Precio regular · solo Internet",type:"currency"},
      {key:"precio_internet_tv",section:"calidad",label:"Precio regular · Internet + TV",type:"currency"},
      {key:"incluye_tv",section:"calidad",label:"¿El operador ofrece / incluye TV?",type:"radio",options:["Sí","No","No sabe"]},
      {key:"grilla_tv",section:"calidad",label:"¿Cómo es la grilla de TV?",type:"radio",options:["Amplia","Reducida","No sabe"],showWhen:{field:"incluye_tv",equals:"Sí"}},
      {key:"observaciones",section:"calidad",label:"Observaciones para identificarlo en campo",type:"textarea",full:true},
      {key:"municipio",section:"validacion",label:"Municipio / ciudad",type:"text",required:true,autoCity:true},
      {key:"sector_barrio",section:"validacion",label:"Barrio",type:"text",autoGeo:"barrio"},
      {key:"estrato",section:"validacion",label:"Estrato automático (Motor Territorial)",type:"select",options:["1","2","3","4","5","6","Sin información"],autoGeo:"estrato"},
      {key:"estrato_observado",section:"validacion",label:"Estrato manual / observado en campo",type:"select",options:["","1","2","3","4","5","6"],help:"Opcional. Si observas una diferencia, registra aquí el estrato visto en terreno. No modifica el automático."}
    ]
  },
  CHURN: {
    id: "CHURN",
    name: "Visita clientes churn",
    description: "Entiende por qué el cliente dejó de recargar, qué servicio usa hoy y qué tendría que cambiar para volver a FIBRAZO.",
    eyebrow: "RETENCIÓN",
    meta: ["Sincelejo / Montería", "Lógica condicional", "Clientes churn"],
    sections: [
      { id: "identificacion", title: "Identificación", description: "Datos básicos de la visita y del cliente." },
      { id: "motivo", title: "Motivo del churn", description: "Identifica la razón principal por la que dejó de recargar." },
      { id: "servicio", title: "Servicio actual", description: "Conoce qué alternativa utiliza hoy y cuánto paga." },
      { id: "tv", title: "TV y contenidos", description: "Detalle de la oferta de televisión cuando corresponda." },
      { id: "cierre", title: "Cierre de la visita", description: "Registra posibilidad de retorno y observaciones finales." }
    ],
    fields: [
      {key:"coordenadas",section:"identificacion",label:"Ubicación de la visita",type:"gps",required:true,full:true,auto:true,help:"Se toma automáticamente al abrir el formulario. Puedes actualizarla si te moviste."},
      {key:"ciudad",section:"identificacion",label:"Ciudad",type:"select",required:true,options:["Sincelejo","Montería"],help:"Se muestra la ciudad detectada por GPS. Si necesitas corregirla manualmente, solo podrás elegir las ciudades configuradas."},
      {key:"cliente_id",section:"identificacion",label:"N.º de cliente",type:"numeric",required:true,help:"Ingresa únicamente el número de cliente registrado en FIBRAZO."},
      {key:"fecha_visita",section:"identificacion",label:"Fecha de visita",type:"date-flex",required:true,help:"Puedes elegirla en el calendario o escribirla como DD/MM/AAAA."},

      {key:"motivo_principal",section:"motivo",label:"Motivo por el cual dejó de recargar",type:"select",required:true,options:["Inconformidad con el servicio","Precio","Se pasó a otro operador","TV","Mudanza","No usa / no necesita el servicio","Problemas de recarga / pago","Otro"],help:"Selecciona la razón principal mencionada por el cliente."},
      {key:"inconformidad_tipo",section:"motivo",label:"¿Qué sucedió con el servicio?",type:"checkbox",options:["Mantenimiento no realizado","Demora en mantenimiento","Lentitud","Intermitencia","Demora en mudanza","Atención al cliente","Otro"],showWhen:{field:"motivo_principal",equals:"Inconformidad con el servicio"},full:true,help:"Marca todas las situaciones que el cliente haya mencionado."},

      {key:"tiene_servicio_actual",section:"servicio",label:"¿Actualmente tiene servicio de internet?",type:"radio",required:true,options:["Sí","No"],help:"Indica si hoy cuenta con otro servicio de internet."},
      {key:"operador_actual",section:"servicio",label:"Operador actual",type:"text",showWhen:{field:"tiene_servicio_actual",equals:"Sí"},help:"Escribe el nombre del operador que utiliza actualmente."},
      {key:"precio_actual",section:"servicio",label:"Precio mensual actual",type:"currency",showWhen:{field:"tiene_servicio_actual",equals:"Sí"},help:"Ingresa solamente el valor mensual que paga."},
      {key:"velocidad_actual",section:"servicio",label:"Velocidad contratada",type:"numeric",suffix:"Mbps",showWhen:{field:"tiene_servicio_actual",equals:"Sí"},help:"Ingresa únicamente la velocidad contratada."},

      {key:"incluye_tv",section:"servicio",label:"¿El servicio actual incluye TV?",type:"radio",options:["Sí","No"],showWhen:{field:"tiene_servicio_actual",equals:"Sí"}},
      {key:"tecnologia_tv",section:"tv",label:"Tecnología de TV",type:"select",options:["Coaxial","Digital / App","TV Box","Otro"],showWhen:{field:"incluye_tv",equals:"Sí"},help:"Selecciona cómo recibe el servicio de TV."},
      {key:"tv_coaxial",section:"tv",label:"TV conectados por coaxial",type:"numeric",showWhen:{field:"incluye_tv",equals:"Sí"},help:"Cantidad de televisores conectados por coaxial."},
      {key:"tv_box",section:"tv",label:"Cantidad de TV Box",type:"numeric",showWhen:{field:"incluye_tv",equals:"Sí"},help:"Cantidad de TV Box entregados o instalados."},
      {key:"tiene_disney",section:"tv",label:"¿Tiene Disney?",type:"radio",options:["Sí","No","No sabe"],showWhen:{field:"incluye_tv",equals:"Sí"},help:"Indica si Disney está incluido en la oferta."},
      {key:"tiene_deportes",section:"tv",label:"¿Tiene canales de deportes?",type:"radio",options:["Sí","No","No sabe"],showWhen:{field:"incluye_tv",equals:"Sí"},help:"Indica si dispone de contenido deportivo."},
      {key:"canales_destacados",section:"tv",label:"Canales o contenidos destacados",type:"textarea",showWhen:{field:"incluye_tv",equals:"Sí"},full:true,help:"Anota contenidos que el cliente valore especialmente."},

      {key:"volveria",section:"cierre",label:"¿Volvería a FIBRAZO?",type:"radio",options:["Sí","No","Tal vez"],full:true,help:"Registra la disposición actual del cliente a volver."},
      {key:"cambio_para_volver",section:"cierre",label:"¿Qué tendría que cambiar para volver?",type:"textarea",full:true,help:"Resume qué condición haría viable el retorno del cliente."},
      {key:"comentario",section:"cierre",label:"Notas de la visita",type:"textarea",full:true,help:"Agrega cualquier dato relevante que no haya quedado registrado antes."}
    ]
  },

  EXPLORACION: {
    id: "EXPLORACION",
    name: "Exploración virtual",
    description: "Relevamiento virtual desde Google Street View para registrar infraestructura, operadores y evidencia del sector.",
    eyebrow: "EXPANSIÓN",
    meta: ["Street View", "Coordenadas manuales", "Fotos opcionales", "Operadores / infraestructura"],
    sections: [
      { id: "ubicacion", title: "Ubicación", description: "Pega la coordenada observada y valida el municipio detectado." },
      { id: "infraestructura", title: "Infraestructura", description: "Califica la postería y la ocupación del tendido aéreo." },
      { id: "operadores", title: "Operadores", description: "Marca incumbentes y registra ISP locales o regionales visibles." },
      { id: "cierre", title: "Cierre", description: "Agrega evidencia y notas relevantes del punto." }
    ],
    fields: [
      {key:"coordenadas",section:"ubicacion",label:"Coordenadas",type:"coordinates",required:true,full:true,help:"Pega la coordenada en formato latitud, longitud. Ejemplo: 7.10485, -73.10280. El municipio se mostrará automáticamente."},
      {key:"anio_imagen",section:"ubicacion",label:"Año de la imagen de Google Street View",type:"numeric",required:true,maxLength:4,max:FIBRAZO_CURRENT_YEAR,help:`Ingresa el año visible en la imagen de Street View. No puede ser posterior a ${FIBRAZO_CURRENT_YEAR}.`},
      {key:"sector_barrio",section:"ubicacion",label:"Barrio",type:"text",autoGeo:"barrio"},
      {key:"estrato",section:"ubicacion",label:"Estrato automático (Motor Territorial)",type:"select",options:["1","2","3","4","5","6","Sin información"],autoGeo:"estrato"},
      {key:"estrato_observado",section:"ubicacion",label:"Estrato manual / observado en Street View",type:"select",options:["","1","2","3","4","5","6"],help:"Opcional. Si Street View sugiere un estrato diferente al automático, selecciónalo aquí. Ambos valores se guardan por separado; dejarlo vacío no modifica el automático."},
      {key:"zona_empresarial",section:"ubicacion",label:"¿Zona empresarial / comercial?",type:"toggle",default:"No",options:["Sí","No"],help:"Marca Sí solo cuando la imagen permite identificar claramente una zona predominantemente empresarial o comercial."},
      {key:"tipo_terreno",section:"infraestructura",label:"Transitabilidad / complejidad del terreno",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Muy complejo: muchas pendientes, pasillos estrechos o accesos difíciles de transitar.","2":"Complejo: pendientes o accesos que dificultan de forma importante el tránsito y la operación.","3":"Intermedio: terreno mixto, con algunas pendientes u obstáculos pero transitable.","4":"Fácil: terreno mayormente plano, ordenado y con pocos obstáculos para transitar.","5":"Muy fácil: terreno plano, organizado y de fácil tránsito para la operación."},help:"Evalúa qué tan fácil sería desplazarse y trabajar operativamente en el sector. 1 = muy complejo y 5 = muy fácil."},
      {key:"barrio_asentamiento_informal",section:"infraestructura",label:"¿Barrio de origen informal o asentamiento no planificado?",type:"toggle",default:"No",options:["Sí","No"],help:"Registra únicamente características observables del desarrollo urbanístico; no implica una clasificación legal del barrio."},

      {key:"condicion_ocupacion_tendido",section:"infraestructura",label:"Condición de ocupación del tendido",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / saturada: alta saturación, desorden y/o riesgo eléctrico visible.","2":"Alta ocupación: gran cantidad de cableado y desorden, con menor riesgo evidente.","3":"Ocupación media: cableado importante, pero con cierto orden y espacio disponible.","4":"Baja ocupación: el tendido permite visualmente un despliegue adicional cómodo.","5":"Muy baja ocupación / óptima: postería despejada, ordenada y con amplia disponibilidad visual."},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},
      {key:"condicion_fisica_posteria",section:"infraestructura",label:"Condición física de la postería",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / no apta: infraestructura improvisada, madera deteriorada, mástiles o condición evidentemente riesgosa.","2":"Deficiente: postería formal con deterioro visible o condición poco favorable.","3":"Aceptable: utilizable y funcional, sujeto a validación técnica.","4":"Buena: concreto en buen estado, alineada y sin deterioro evidente.","5":"Óptima / nueva: excelente condición y capacidad visual para infraestructura adicional."},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},

      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"isp-autocomplete",default:"Sin ISP",help:"Primer ISP local o regional identificado."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_1",notValues:["","Sin ISP"]},help:"Segundo ISP local o regional identificado."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_2",notValues:["","Sin ISP"]},help:"Tercer ISP local o regional identificado."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_3",notValues:["","Sin ISP"]},help:"Cuarto ISP local o regional identificado."},

      {key:"link_evidencia",section:"cierre",label:"Link de evidencia",type:"text",full:true,help:"Opcional. Pega el enlace de Street View, Google Maps o My Maps que respalda la observación."},
      
      {key:"fotos",section:"cierre",label:"Fotos",type:"photos",full:true,help:"Opcional. Carga hasta 3 fotos. Desde galería puedes seleccionar varias de una vez; también puedes tomar fotos con la cámara."},
      {key:"nota",section:"cierre",label:"Nota",type:"textarea",full:true}
    ]
  },

  EXPLORACION_PRESENCIAL: {
    id: "EXPLORACION_PRESENCIAL",
    name: "Exploración presencial",
    description: "Relevamiento en campo con GPS del dispositivo para registrar infraestructura, operadores y evidencia fotográfica.",
    eyebrow: "EXPANSIÓN",
    meta: ["GPS", "Fotos opcionales", "Operadores / infraestructura"],
    sections: [
      { id: "coordenada", title: "Coordenada", description: "Carga únicamente la ubicación del punto. La lectura territorial se procesa en segundo plano mientras continúas." },
      { id: "infraestructura", title: "Infraestructura", description: "Califica la postería y la ocupación del tendido aéreo." },
      { id: "operadores", title: "Operadores", description: "Marca incumbentes y registra ISP locales o regionales visibles." },
      { id: "cierre", title: "Evidencia", description: "Agrega evidencia fotográfica del punto." },
      { id: "ubicacion", title: "Validación territorial", description: "Confirma al final los datos obtenidos para la coordenada y completa la lectura de campo." }
    ],
    fields: [
      {key:"coordenadas",section:"coordenada",label:"Ubicación actual",type:"gps",required:true,full:true,manualEdit:true,help:"Toma la ubicación con el GPS. Si es necesario, puedes corregir manualmente la coordenada antes de continuar."},
      {key:"municipio",section:"ubicacion",label:"Municipio / ciudad",type:"text",required:true,autoCity:true},
      {key:"sector_barrio",section:"ubicacion",label:"Barrio",type:"text",autoGeo:"barrio"},
      {key:"estrato",section:"ubicacion",label:"Estrato automático (Motor Territorial)",type:"select",options:["1","2","3","4","5","6","Sin información"],autoGeo:"estrato"},
      {key:"estrato_observado",section:"ubicacion",label:"Estrato manual / observado en campo",type:"select",options:["","1","2","3","4","5","6"]},
      {key:"zona_empresarial",section:"ubicacion",label:"¿Zona empresarial / comercial?",type:"toggle",default:"No",options:["Sí","No"]},
      {key:"tipo_terreno",section:"infraestructura",label:"Geografía / Complejidad del terreno",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Muy complejo: muchas pendientes, pasillos estrechos o accesos difíciles de transitar.","2":"Complejo: pendientes o accesos que dificultan de forma importante el tránsito y la operación.","3":"Intermedio: terreno mixto, con algunas pendientes u obstáculos pero transitable.","4":"Fácil: terreno mayormente plano, ordenado y con pocos obstáculos para transitar.","5":"Muy fácil: terreno plano, organizado y de fácil tránsito para la operación."}},
      {key:"tipo_despliegue",section:"infraestructura",label:"Tipo de despliegue observado",type:"select",required:true,default:"Aéreo",options:["Aéreo","Canalizado"]},
      {key:"condicion_fisica_posteria",section:"infraestructura",label:"Condición Física de la postería",type:"segmented",required:true,showWhen:{field:"tipo_despliegue",equals:"Aéreo"},options:["1","2","3","4","5"],details:{"1":"Crítica / no apta: infraestructura improvisada, madera deteriorada, mástiles o condición evidentemente riesgosa.","2":"Deficiente: postería formal con deterioro visible o condición poco favorable.","3":"Aceptable: utilizable y funcional, sujeto a validación técnica.","4":"Buena: concreto en buen estado, alineada y sin deterioro evidente.","5":"Óptima / nueva: excelente condición y capacidad visual para infraestructura adicional."}},
      {key:"condicion_ocupacion_tendido",section:"infraestructura",label:"Saturación / Ocupación de la postería",type:"segmented",required:true,showWhen:{field:"tipo_despliegue",equals:"Aéreo"},options:["1","2","3","4","5"],details:{"1":"Crítica / saturada: alta saturación, desorden y/o riesgo eléctrico visible.","2":"Alta ocupación: gran cantidad de cableado y desorden, con menor riesgo evidente.","3":"Ocupación media: cableado importante, pero con cierto orden y espacio disponible.","4":"Baja ocupación: el tendido permite visualmente un despliegue adicional cómodo.","5":"Muy baja ocupación / óptima: postería despejada, ordenada y con amplia disponibilidad visual."}},
      {key:"barrio_asentamiento_informal",section:"infraestructura",label:"¿Barrio de origen informal o asentamiento no planificado?",type:"toggle",default:"No",options:["Sí","No"]},
      {key:"nivel_seguridad",section:"infraestructura",label:"Percepción de SEGURIDAD de la zona",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Muy insegura: condiciones visibles o percibidas que desaconsejan trabajo operativo sin medidas adicionales.","2":"Insegura: requiere precauciones reforzadas para trabajo en campo.","3":"Intermedia: condiciones mixtas; operar con precaución normal.","4":"Segura: condiciones favorables para trabajo de campo.","5":"Muy segura: condiciones muy favorables y sin alertas evidentes durante la visita."}},


      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"isp-autocomplete",default:"Sin ISP",help:"Primer ISP local o regional identificado."},
      {key:"isp_1_calidad",section:"operadores",label:"Calidad de tendido · ISP 1",type:"segmented",showWhen:{field:"isp_1",notValues:["","Sin ISP"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_1",notValues:["","Sin ISP"]},help:"Segundo ISP local o regional identificado."},
      {key:"isp_2_calidad",section:"operadores",label:"Calidad de tendido · ISP 2",type:"segmented",showWhen:{field:"isp_2",notValues:["","Sin ISP"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_2",notValues:["","Sin ISP"]},help:"Tercer ISP local o regional identificado."},
      {key:"isp_3_calidad",section:"operadores",label:"Calidad de tendido · ISP 3",type:"segmented",showWhen:{field:"isp_3",notValues:["","Sin ISP"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_3",notValues:["","Sin ISP"]},help:"Cuarto ISP local o regional identificado."},
      {key:"isp_4_calidad",section:"operadores",label:"Calidad de tendido · ISP 4",type:"segmented",showWhen:{field:"isp_4",notValues:["","Sin ISP"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},

      
      {key:"fotos",section:"cierre",label:"Fotos",type:"photos",full:true,help:"Opcional. Toma hasta 3 fotos de forma secuencial. Cada foto muestra vista previa y permite cambiarla o eliminarla antes de agregar la siguiente."},
      {key:"nota",section:"ubicacion",label:"Nota",type:"textarea",full:true}
    ]
  }
};

// FO-CHG-142 · Impacto Social · Solo instituciones educativas públicas.
// Fuente: exportación JSON Socialización FIBRAZO, 24/11/2026.
// La misma definición se refleja en impacto-social-schema.json para validación de servidor.
window.FIBRAZO_FORMS.IMPACTO_SOCIAL = {
  "id": "IMPACTO_SOCIAL",
  "name": "Impacto Social",
  "slug": "impacto-social",
  "description": "Inscripción de instituciones educativas públicas al Programa de Conexión Digital para la Educación.",
  "eyebrow": "SOCIALIZACIÓN",
  "icon": "/impacto-social-icon.svg",
  "meta": [
    "Instituciones educativas públicas",
    "Datos de sede",
    "Fotografías"
  ],
  "sections": [
    {
      "id": "inicio",
      "title": "Ubicación",
      "description": "Registra el territorio correspondiente a la sede visitada."
    },
    {
      "id": "institucion",
      "title": "Institución educativa pública",
      "description": "📄En esta sección registra la información de las instituciones educativas públicas que se encuentran dentro de la zona de cobertura de Fibrazo.\n👨‍🏫👩‍🏫  Estos datos se utilizarán para avanzar con el Programa de Conexión Digital para la Educación, que brinda un punto gratuito de internet a cada institución.\n\n📣Puntos claves para mencionar a la institución:\nEl servicio es totalmente gratuito. La institución nunca deberá realizar ningún pago bajo ningún concepto.\nReportes de novedades: cualquier inconveniente debe ser informado al WhatsApp oficial 3143460060, identificándose siempre con el código DANE de la institución.\nTiempo de respuesta: una vez realizado el reporte, la novedad será atendida en un máximo de 48 horas.\nCanales de apoyo: ante dudas adicionales pueden contactar al socializador que gestionó la instalación o con:\nFernando Eduardo Macchi – Jefe de Desarrollo Comercial\nCel: 3143460060 – Correo: eduardo@fibrazo.com\nPlaca de identificación: junto con la instalación se colocará una placa acrílica con la leyenda “Mi escuela conectada”, como símbolo visible del servicio que la institución recibe."
    },
    {
      "id": "contactos",
      "title": "Información de contacto institucional",
      "description": "Mantener una comunicación fluida y directa entre FIBRAZO y la institución es fundamental para garantizar el buen funcionamiento del servicio, así como para compartir futuras capacitaciones, actualizaciones y beneficios del programa.\n\nPor eso, te solicitamos los datos de contacto del rector(a), del(a) coordinador(a) académico(a), así como el correo institucional oficial y uno alternativo, en caso de necesitar comunicación urgente o complementaria."
    },
    {
      "id": "caracterizacion",
      "title": "Caracterización de la institución",
      "description": "👉En esta sección recopilamos información general sobre el funcionamiento académico de la institución: actividades que se realizan, cantidad de estudiantes y sus rangos de edad.\n\nEsta información nos ayuda a entender el contexto educativo y dimensionar el impacto que puede tener el servicio en la comunidad escolar."
    },
    {
      "id": "infraestructura",
      "title": "Infraestructura y conectividad",
      "description": "Conocer el estado actual de los recursos tecnológicos y la conectividad en la institución nos permite:\n👉Planificar mejor la implementación del servicio.\n👉Identificar oportunidades de mejora.\n👉Garantizar un mayor aprovechamiento del internet gratuito por parte de estudiantes y docentes.  "
    },
    {
      "id": "internet_anterior",
      "title": "Servicio de internet existente",
      "description": "📄Esta sección busca tener información sobre el servicio de internet actual de la institución (empresa proveedora, costos y quién los asume). \n✏️Los datos se utilizan únicamente con fines de diagnóstico para conocer la situación actual, medir el impacto de la conectividad que aportamos y evaluar posibles beneficios adicionales a futuro. \n👉No implica ningún compromiso ni costo por parte de la institución."
    },
    {
      "id": "fotografias",
      "title": "Registro fotográfico",
      "description": "Por favor, sube las siguientes imágenes para dejar constancia visual del lugar donde se brinda el servicio de internet gratuito. Estas fotos nos ayudan a mantener un registro ordenado y a facilitar futuras visitas técnicas o de acompañamiento.\n\nPuedes subir una imagen principal (obligatoria) y, si lo deseas, una imagen adicional por cada punto.  "
    },
    {
      "id": "informacion_final",
      "title": "Información para comunicar a la institución",
      "description": "El servicio es totalmente gratuito. La institución nunca deberá realizar ningún pago bajo ningún concepto.\nReportes de novedades: cualquier inconveniente debe ser informado al WhatsApp oficial 3143460060, identificándose siempre con el código DANE de la institución.\nTiempo de respuesta: una vez realizado el reporte, la novedad será atendida en un máximo de 48 horas.\nCanales de apoyo: ante dudas adicionales pueden contactar al socializador que gestionó la instalación o con:\nFernando Eduardo Macchi – Jefe de Desarrollo Comercial\nCel: 3143460060 – Correo: eduardo@fibrazo.com\nPlaca de identificación: junto con la instalación se colocará una placa acrílica con la leyenda “Mi escuela conectada”, como símbolo visible del servicio que la institución recibe.\n⚠️Aviso para el socializador:\nAsegúrate de explicar muy claramente toda esta información al responsable de la institución. Renvía la información por WhatsApp al responsable: puedes copiar y pegar el texto o enviar una captura de pantalla. Esto ayudará a que quede un registro y a que la institución tenga siempre presentes los pasos a seguir.\n\n✨✨Deseamos que este servicio sea de gran utilidad tanto para docentes como para alumnos, contribuyendo a fortalecer los procesos educativos y a reducir la brecha digital. Desde Fibrazo seguimos comprometidos en acompañar a las instituciones en su misión de educar y transformar comunidades.✨\n\n"
    }
  ],
  "fields": [
    {
      "key": "soc_1197213728",
      "section": "inicio",
      "label": "Departamento",
      "type": "select",
      "required": true,
      "originalItemId": 1197213728,
      "options": [
        "Atlántico",
        "Bolivar",
        "Cordoba",
        "Magdalena",
        "Sucre"
      ]
    },
    {
      "key": "soc_1797344950",
      "section": "inicio",
      "label": "Ciudad/Pueblo/Localidad",
      "type": "select",
      "required": true,
      "originalItemId": 1797344950,
      "options": [
        "Barranquilla",
        "Cartagena",
        "Monteria",
        "Santa Marta",
        "Sincelejo",
        "Turbaco"
      ]
    },
    {
      "key": "soc_1219605481",
      "section": "inicio",
      "label": "Barrio",
      "type": "text",
      "required": true,
      "originalItemId": 1219605481,
      "help": "Colocar el nombre del barrio."
    },
    {
      "key": "soc_1438094776",
      "section": "inicio",
      "label": "Sector",
      "type": "text",
      "required": true,
      "originalItemId": 1438094776,
      "help": "En caso de no contar con división en sectores colocar el barrio nuevamente."
    },
    {
      "key": "soc_262157483",
      "section": "institucion",
      "label": "Ejemplo de placa \"Mi escuela Conectada\"",
      "type": "info",
      "required": false,
      "originalItemId": 262157483,
      "help": "Imagen de referencia de la placa «Mi escuela conectada». La ilustración original no está incluida en la exportación JSON."
    },
    {
      "key": "soc_669630741",
      "section": "institucion",
      "label": "¿Se autoriza la colocación de la placa?",
      "type": "radio",
      "required": true,
      "originalItemId": 669630741,
      "help": "Como primera opción, nos gustaría ubicar la placa identificatoria en el acceso principal de la institución educativa. En caso de que esto no sea posible, o si por recomendación del colegio se considera más adecuado, la placa podrá ser instalada en el lugar que la institución determine como más oportuno. ",
      "options": [
        "Sí",
        "No",
        "A confirmar"
      ]
    },
    {
      "key": "soc_645189067",
      "section": "institucion",
      "label": "Nombre completo de la institución",
      "type": "text",
      "required": true,
      "originalItemId": 645189067,
      "help": "Si es una sede colocar el nombre de la principal y en el siguiente campo colocar el nombre de la sede."
    },
    {
      "key": "soc_1913690212",
      "section": "institucion",
      "label": "Cuantas sedes tiene la institucion?",
      "type": "select",
      "required": true,
      "originalItemId": 1913690212,
      "help": "En caso que la institución no cuenta con sedes adicionales a la principal seleccionar \"Única\"",
      "options": [
        "1 (UNICA)",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10"
      ]
    },
    {
      "key": "soc_27544894",
      "section": "institucion",
      "label": "Nombre completo de la SEDE encuestada",
      "type": "text",
      "required": true,
      "originalItemId": 27544894,
      "help": "En caso que la institución no cuenta con sedes adicionales a la principal colocar \"Única\"\n\n⚠️  Atención:\nCOMPLETAR EL FORMULARIO CON LA INFORMACION DE LA SEDE ENCUESTADA SEA PRINCIPAL U OTRA."
    },
    {
      "key": "soc_485729503",
      "section": "institucion",
      "label": "¿Cómo está conformada la administración de la institución?",
      "type": "radio",
      "required": true,
      "originalItemId": 485729503,
      "help": "Conocer la naturaleza administrativa nos permite identificar el modelo de gestión educativa, lo cual puede influir en los procesos de decisión, coordinación y seguimiento dentro del programa.",
      "options": [
        "Pública (100% oficial)",
        "Pública con administración privada (convenio u operador)",
        "Institución en convenio – Plan Becario",
        "Religiosa con convenio oficial",
        "Privada sin ánimo de lucro",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_485729503_otro",
      "section": "institucion",
      "label": "Especifica otra opción: ¿Cómo está conformada la administración de la institución?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_485729503",
        "equals": "Otro"
      },
      "derivedFrom": "soc_485729503"
    },
    {
      "key": "soc_2093360889",
      "section": "institucion",
      "label": "¿Los alumnos deben realizar algún tipo de pago para estudiar en la institución?",
      "type": "radio",
      "required": true,
      "originalItemId": 2093360889,
      "help": "Esta información nos permite entender si la institución es completamente gratuita o si existen aportes económicos por parte de las familias, lo cual puede influir en el nivel de accesibilidad a herramientas digitales.  ",
      "options": [
        "No, es completamente gratuita.",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_2093360889_otro",
      "section": "institucion",
      "label": "Especifica otra opción: ¿Los alumnos deben realizar algún tipo de pago para estudiar en la institución?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_2093360889",
        "equals": "Otro"
      },
      "derivedFrom": "soc_2093360889"
    },
    {
      "key": "soc_1488187177",
      "section": "institucion",
      "label": "N.I.T",
      "type": "text",
      "required": true,
      "originalItemId": 1488187177,
      "help": "Colocar el NIT completo con guion y código de verificación.\nEjemplo: 123456-7"
    },
    {
      "key": "soc_950119148",
      "section": "institucion",
      "label": "DANE",
      "type": "text",
      "required": true,
      "originalItemId": 950119148
    },
    {
      "key": "soc_426195018",
      "section": "institucion",
      "label": "Dirección",
      "type": "textarea",
      "required": true,
      "originalItemId": 426195018,
      "full": true
    },
    {
      "key": "soc_1492169961",
      "section": "institucion",
      "label": "Coordenadas de ubicación",
      "type": "text",
      "required": true,
      "originalItemId": 1492169961,
      "help": "📍Por favor, ingresa las coordenadas geográficas correspondientes a esta institucion (ya sea la principal o una sede).\nEsta información es clave para registrar correctamente su ubicación, planificar instalaciones y realizar futuras visitas técnicas.\n\nSi no sabes cómo obtener las coordenadas, puedes ver este breve video explicativo:\n🎥 Toca aquí para ver el tutorial\n\nFormato esperado: 11.240234, -74.206781"
    },
    {
      "key": "soc_704426938",
      "section": "contactos",
      "label": "Correo oficial institucional",
      "type": "text",
      "required": true,
      "originalItemId": 704426938,
      "format": "email",
      "help": "Ingresa una dirección de correo válida, por ejemplo nombre@institucion.edu.co."
    },
    {
      "key": "soc_1260802208",
      "section": "contactos",
      "label": "Correo alternativo institucional",
      "type": "text",
      "required": false,
      "originalItemId": 1260802208,
      "help": "Completar en caso que la institución cuente con un segundo correo electrónico.\nIngresa una dirección de correo válida, por ejemplo nombre@institucion.edu.co.",
      "format": "email"
    },
    {
      "key": "soc_1728220199",
      "section": "contactos",
      "label": "Nombre completo del rector(a)",
      "type": "text",
      "required": true,
      "originalItemId": 1728220199
    },
    {
      "key": "soc_933945474",
      "section": "contactos",
      "label": "Número de contacto del rector(a)",
      "type": "text",
      "required": true,
      "originalItemId": 933945474,
      "format": "celular-co",
      "help": "Celular colombiano de 10 dígitos: empieza con 3, sin +57 ni espacios."
    },
    {
      "key": "soc_1142394737",
      "section": "contactos",
      "label": "Correo electrónico del rector(a)",
      "type": "text",
      "required": true,
      "originalItemId": 1142394737,
      "format": "email",
      "help": "Ingresa una dirección de correo válida, por ejemplo nombre@institucion.edu.co."
    },
    {
      "key": "soc_1392733935",
      "section": "contactos",
      "label": "Nombre completo del(a) coordinador(a) académico(a)",
      "type": "text",
      "required": true,
      "originalItemId": 1392733935
    },
    {
      "key": "soc_1504839451",
      "section": "contactos",
      "label": "Número de contacto del(a) coordinador(a) académico(a)",
      "type": "text",
      "required": true,
      "originalItemId": 1504839451,
      "format": "celular-co",
      "help": "Celular colombiano de 10 dígitos: empieza con 3, sin +57 ni espacios."
    },
    {
      "key": "soc_2128944618",
      "section": "contactos",
      "label": "Correo electrónico del(a) coordinador(a) académico(a)",
      "type": "text",
      "required": true,
      "originalItemId": 2128944618,
      "format": "email",
      "help": "Ingresa una dirección de correo válida, por ejemplo nombre@institucion.edu.co."
    },
    {
      "key": "soc_1817506735",
      "section": "caracterizacion",
      "label": "Cursos dictados",
      "type": "checkbox",
      "required": true,
      "originalItemId": 1817506735,
      "help": "En caso de necesitar otra opción, seleccionar \"otra\" y completar manualmente",
      "options": [
        "Pre-Escolar",
        "Pirmaria",
        "Secundaria",
        "Bachilleraro",
        "Media tecnica",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_1817506735_otro",
      "section": "caracterizacion",
      "label": "Especifica otra opción: Cursos dictados",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1817506735",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1817506735"
    },
    {
      "key": "soc_1764175460",
      "section": "caracterizacion",
      "label": "Talleres u otras actividades, aclarar cuales?",
      "type": "checkbox",
      "required": true,
      "originalItemId": 1764175460,
      "help": "En caso de necesitar otra opción, seleccionar \"otra\" y completar manualmente",
      "options": [
        "Baile/Danza",
        "Talleres",
        "Escuela de futbol",
        "Cursos del SENA",
        "Cursos flexible (Inclusión de Niños fuera de edad)",
        "Comedor",
        "No realiza actividades extra curriculares",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_1764175460_otro",
      "section": "caracterizacion",
      "label": "Especifica otra opción: Talleres u otras actividades, aclarar cuales?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1764175460",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1764175460"
    },
    {
      "key": "soc_1654181993",
      "section": "caracterizacion",
      "label": "Turnos de actividades en la institución",
      "type": "checkbox",
      "required": true,
      "originalItemId": 1654181993,
      "options": [
        "Mañana",
        "Tarde",
        "Noche",
        "Sabado por la mañana",
        "Sabado por la tarde",
        "Sabado por la noche",
        "Domingos"
      ]
    },
    {
      "key": "soc_2087540928",
      "section": "caracterizacion",
      "label": "Rango de edades de los alumnos",
      "type": "text",
      "required": true,
      "originalItemId": 2087540928,
      "help": "Desde y hasta que edad asisten alumnos a la institución.\nEjemplo: De 4 a 14 años"
    },
    {
      "key": "soc_1032732572",
      "section": "caracterizacion",
      "label": "Total de alumnos que asisten a la institución",
      "type": "text",
      "required": true,
      "originalItemId": 1032732572,
      "help": "Colocar el total de alumno solo de la institución encuestada, NO incluir sus sedes, eso va por aparte."
    },
    {
      "key": "soc_737288592",
      "section": "infraestructura",
      "label": "Cuenta con sala de informática/computación?",
      "type": "radio",
      "required": true,
      "originalItemId": 737288592,
      "options": [
        "SI",
        "NO"
      ]
    },
    {
      "key": "soc_161839292",
      "section": "infraestructura",
      "label": "¿Con cuáles de los siguientes recursos cuenta tu institución?",
      "type": "checkbox",
      "required": true,
      "originalItemId": 161839292,
      "options": [
        "Computadoras disponibles para cada alumno",
        "Computadoras disponibles para cada docente",
        "Tablets disponibles para cada alumno",
        "Tablets disponibles para cada docente",
        "Proyector o pantalla en todos los salones",
        "Proyector o pantalla en al menos un salón",
        "Sala de cómputo",
        "Acceso a internet en todos los salones",
        "Acceso a internet en un salón",
        "Acceso a internet en la sala de cómputo",
        "Ninguna de las anteriores"
      ]
    },
    {
      "key": "soc_1421433623",
      "section": "infraestructura",
      "label": "Cuantos computadores tiene la institución?",
      "type": "radio",
      "required": true,
      "originalItemId": 1421433623,
      "help": "Solo considerar computadores en  funcionamiento.",
      "options": [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_1421433623_otro",
      "section": "infraestructura",
      "label": "Especifica otra opción: Cuantos computadores tiene la institución?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1421433623",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1421433623"
    },
    {
      "key": "soc_829626452",
      "section": "infraestructura",
      "label": "Cuantas TABLETs tiene la institución?",
      "type": "radio",
      "required": true,
      "originalItemId": 829626452,
      "help": "Solo considerar  TABLETs   en funcionamiento.",
      "options": [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_829626452_otro",
      "section": "infraestructura",
      "label": "Especifica otra opción: Cuantas TABLETs tiene la institución?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_829626452",
        "equals": "Otro"
      },
      "derivedFrom": "soc_829626452"
    },
    {
      "key": "soc_1504662116",
      "section": "infraestructura",
      "label": "¿En qué espacios se necesita prioritariamente conexión a internet?",
      "type": "checkbox",
      "required": true,
      "originalItemId": 1504662116,
      "help": "En caso de necesitar otra opción, seleccionar \"otra\" y completar manualmente",
      "options": [
        "Sala de Informática/Computo",
        "Sala de audiovisuales / Actos / Reuniones",
        "Sala de Idiomas",
        "Sala de profesores",
        "Laboratorio / Talleres",
        "Aula de clases",
        "Biblioteca",
        "Administración / Secretaría / Rectoría",
        "Lugares comunes (pasillos, patios, entrada)",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_1504662116_otro",
      "section": "infraestructura",
      "label": "Especifica otra opción: ¿En qué espacios se necesita prioritariamente conexión a internet?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1504662116",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1504662116"
    },
    {
      "key": "soc_1617028229",
      "section": "infraestructura",
      "label": "¿En qué lugar de la institución se instalará el servicio de FIBRAZO?",
      "type": "radio",
      "required": true,
      "originalItemId": 1617028229,
      "help": "Esta información nos ayuda a ubicar el punto de conexión en el espacio más estratégico para beneficiar al mayor número de estudiantes y docentes, garantizando un mayor impacto del programa.  ",
      "options": [
        "Sala de Informática/Computo (Recomendado)",
        "Sala de audiovisuales / Actos / Reuniones",
        "Sala de Idiomas",
        "Sala de profesores",
        "Laboratorio / Talleres",
        "Aula de clases",
        "Biblioteca",
        "Administración / Secretaría / Rectoría",
        "Lugares comunes (pasillos, patios, entrada)",
        "Otro"
      ],
      "allowOther": true
    },
    {
      "key": "soc_1617028229_otro",
      "section": "infraestructura",
      "label": "Especifica otra opción: ¿En qué lugar de la institución se instalará el servicio de FIBRAZO?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1617028229",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1617028229"
    },
    {
      "key": "soc_1588036715",
      "section": "infraestructura",
      "label": "Actualmente cuentan con algún servicio de internet?",
      "type": "radio",
      "required": true,
      "originalItemId": 1588036715,
      "help": "Esta pregunta esta direccionada a entender la necesidad de la institución y analizar posibles acciones que implementar.",
      "options": [
        "SI",
        "NO"
      ]
    },
    {
      "key": "soc_658669168",
      "section": "internet_anterior",
      "label": "¿Luego de instalar FIBRAZO continuara con el servicio de internet existente?",
      "type": "radio",
      "required": true,
      "originalItemId": 658669168,
      "options": [
        "SI",
        "NO"
      ],
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_2067482992",
      "section": "internet_anterior",
      "label": "¿En que lugares cuenta con internet actualmente?",
      "type": "checkbox",
      "required": true,
      "originalItemId": 2067482992,
      "options": [
        "Sala de Informática/Computo",
        "Sala de audiovisuales / Actos / Reuniones",
        "Sala de Idiomas",
        "Sala de profesores",
        "Laboratorio / Talleres",
        "Aula de clases",
        "Biblioteca",
        "Administración / Secretaría / Rectoría",
        "Lugares comunes (pasillos, patios, entrada)",
        "Otro"
      ],
      "allowOther": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_2067482992_otro",
      "section": "internet_anterior",
      "label": "Especifica otra opción: ¿En que lugares cuenta con internet actualmente?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_2067482992",
        "equals": "Otro"
      },
      "derivedFrom": "soc_2067482992"
    },
    {
      "key": "soc_445182421",
      "section": "internet_anterior",
      "label": "¿Qué empresa provee actualmente el servicio de internet?",
      "type": "radio",
      "required": true,
      "originalItemId": 445182421,
      "help": "En caso que la empresa que provee el servicio no esta en la lista seleccionar \"otros\" y completar",
      "options": [
        "TIGO",
        "Claro",
        "Movistar",
        "No sabe",
        "Otro"
      ],
      "allowOther": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_445182421_otro",
      "section": "internet_anterior",
      "label": "Especifica otra opción: ¿Qué empresa provee actualmente el servicio de internet?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_445182421",
        "equals": "Otro"
      },
      "derivedFrom": "soc_445182421"
    },
    {
      "key": "soc_731822327",
      "section": "internet_anterior",
      "label": "¿De cuantos megas de velocidad es el servicio actual?",
      "type": "radio",
      "required": true,
      "originalItemId": 731822327,
      "help": "En caso que la opción no esta en la lista seleccionar \"otros\" y completar",
      "options": [
        "Menos de 50 Megas",
        "Entre 51y 100 Megas",
        "Entre 101 y 200 Megas",
        "Entre 201 y 500 Megas",
        "Entre 501 y 900 Megas",
        "Otro"
      ],
      "allowOther": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_731822327_otro",
      "section": "internet_anterior",
      "label": "Especifica otra opción: ¿De cuantos megas de velocidad es el servicio actual?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_731822327",
        "equals": "Otro"
      },
      "derivedFrom": "soc_731822327"
    },
    {
      "key": "soc_551673741",
      "section": "internet_anterior",
      "label": "¿Qué opinan sobre el funcionamiento del servicio actual?",
      "type": "radio",
      "required": true,
      "originalItemId": 551673741,
      "options": [
        "Malo",
        "Regular",
        "Bueno"
      ],
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_2113362171",
      "section": "internet_anterior",
      "label": "¿Cuánto se paga por el servicio actual?",
      "type": "radio",
      "required": true,
      "originalItemId": 2113362171,
      "help": "En caso que la opción no esta en la lista seleccionar \"otros\" y completar",
      "options": [
        "Entre $0 y $50.000",
        "Entre $51.000 y $100.000",
        "Entre $101.000 y $150.000",
        "Entre $151.000 y $200.000",
        "Entre $201.000 y $300.000",
        "No sabe",
        "Otro"
      ],
      "allowOther": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_2113362171_otro",
      "section": "internet_anterior",
      "label": "Especifica otra opción: ¿Cuánto se paga por el servicio actual?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_2113362171",
        "equals": "Otro"
      },
      "derivedFrom": "soc_2113362171"
    },
    {
      "key": "soc_1572001748",
      "section": "internet_anterior",
      "label": "¿Quién paga por el servicio de internet?",
      "type": "radio",
      "required": true,
      "originalItemId": 1572001748,
      "options": [
        "la escuela de su presupuesto",
        "Secretaria de Educación",
        "Alcaldia de la ciudad",
        "Administracion Privada",
        "Otro"
      ],
      "allowOther": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_1572001748_otro",
      "section": "internet_anterior",
      "label": "Especifica otra opción: ¿Quién paga por el servicio de internet?",
      "type": "text",
      "required": true,
      "showWhen": {
        "field": "soc_1572001748",
        "equals": "Otro"
      },
      "derivedFrom": "soc_1572001748"
    },
    {
      "key": "soc_1204796375",
      "section": "internet_anterior",
      "label": "📝Si lo considera necesario agregar una nota o comentario general sobre la socialización de la institucion educativa.",
      "type": "textarea",
      "required": false,
      "originalItemId": 1204796375,
      "help": "Completar solo en caso de considerar necesario colocar alguna nota adicional.",
      "full": true,
      "showWhen": {
        "field": "soc_1588036715",
        "equals": "SI"
      }
    },
    {
      "key": "soc_1889260179",
      "section": "fotografias",
      "label": "Foto de la fachada de la institución",
      "type": "photo-single",
      "required": true,
      "originalItemId": 1889260179,
      "help": "Sube una imagen clara de la fachada principal del colegio, en lo posible se vea el nombre o alguna referencia que permita identificar fácilmente la institución.",
      "full": true
    },
    {
      "key": "soc_874347778",
      "section": "fotografias",
      "label": "Imagen adicional de la fachada (opcional)",
      "type": "photo-single",
      "required": false,
      "originalItemId": 874347778,
      "help": "Puedes subir una segunda imagen si crees que aporta mayor claridad del frente o acceso a la institución.  ",
      "full": true
    },
    {
      "key": "soc_399955700",
      "section": "fotografias",
      "label": "Foto de la sala de informatica/computo.",
      "type": "photo-single",
      "required": false,
      "originalItemId": 399955700,
      "full": true
    },
    {
      "key": "soc_219756265",
      "section": "fotografias",
      "label": "Foto del lugar donde o estará instalado quipo de red (Modem - ONU).",
      "type": "photo-single",
      "required": false,
      "originalItemId": 219756265,
      "help": "Sube una imagen del espacio físico donde se encuentra instalado (o se instalará) el equipo de red. Esto nos permite validar las condiciones del lugar (acceso a energía, seguridad, etc.).  ",
      "full": true
    },
    {
      "key": "soc_801180412",
      "section": "fotografias",
      "label": "Imagen adicional del lugar de instalación (opcional)",
      "type": "photo-single",
      "required": false,
      "originalItemId": 801180412,
      "help": "Puedes subir una segunda imagen desde otro ángulo o distancia, si consideras que ayuda a visualizar mejor el espacio.",
      "full": true
    },
    {
      "key": "soc_1987775204",
      "section": "fotografias",
      "label": "Imagen adicional (opcional)",
      "type": "photo-single",
      "required": false,
      "originalItemId": 1987775204,
      "help": "Si deseas compartir otra imagen relevante puedes hacerlo aquí ",
      "full": true
    },
    {
      "key": "soc_info_final",
      "section": "informacion_final",
      "label": "Puntos claves para mencionar a la institución",
      "type": "info",
      "help": "El servicio es totalmente gratuito. La institución nunca deberá realizar ningún pago bajo ningún concepto.\nReportes de novedades: cualquier inconveniente debe ser informado al WhatsApp oficial 3143460060, identificándose siempre con el código DANE de la institución.\nTiempo de respuesta: una vez realizado el reporte, la novedad será atendida en un máximo de 48 horas.\nCanales de apoyo: ante dudas adicionales pueden contactar al socializador que gestionó la instalación o con:\nFernando Eduardo Macchi – Jefe de Desarrollo Comercial\nCel: 3143460060 – Correo: eduardo@fibrazo.com\nPlaca de identificación: junto con la instalación se colocará una placa acrílica con la leyenda “Mi escuela conectada”, como símbolo visible del servicio que la institución recibe.\n⚠️Aviso para el socializador:\nAsegúrate de explicar muy claramente toda esta información al responsable de la institución. Renvía la información por WhatsApp al responsable: puedes copiar y pegar el texto o enviar una captura de pantalla. Esto ayudará a que quede un registro y a que la institución tenga siempre presentes los pasos a seguir.\n\n✨✨Deseamos que este servicio sea de gran utilidad tanto para docentes como para alumnos, contribuyendo a fortalecer los procesos educativos y a reducir la brecha digital. Desde Fibrazo seguimos comprometidos en acompañar a las instituciones en su misión de educar y transformar comunidades.✨\n\n",
      "originalItemId": 1319040955
    }
  ]
};
