window.FIBRAZO_PENDING = [
  {id:"email-copy",title:"Enviar copia por correo",description:"Enviar automáticamente un resumen del formulario al correo de quien lo completó.",status:"Pendiente"}
];

window.FIBRAZO_FORMS = {
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

      {key:"incluye_tv",section:"servicio",label:"¿El servicio actual incluye TV?",type:"radio",options:["Sí","No"],showWhen:{field:"tiene_servicio_actual",equals:"Sí"},help:"Si respondes No, la sección de TV se omitirá automáticamente."},
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
    meta: ["Street View", "Coordenadas manuales", "Operadores / infraestructura"],
    sections: [
      { id: "ubicacion", title: "Ubicación", description: "Pega la coordenada observada y valida el municipio detectado." },
      { id: "infraestructura", title: "Infraestructura", description: "Califica la postería y la ocupación del tendido aéreo." },
      { id: "operadores", title: "Operadores", description: "Marca incumbentes y registra ISP locales o regionales visibles." },
      { id: "cierre", title: "Cierre", description: "Agrega evidencia y notas relevantes del punto." }
    ],
    fields: [
      {key:"coordenadas",section:"ubicacion",label:"Coordenadas",type:"coordinates",required:true,full:true,help:"Pega la coordenada en formato latitud, longitud. Ejemplo: 7.10485, -73.10280. El municipio se mostrará automáticamente."},
      {key:"anio_imagen",section:"ubicacion",label:"Año de la imagen de Google Street View",type:"numeric",required:true,maxLength:4,help:"Ingresa el año visible en la imagen de Street View para conocer la vigencia del relevamiento."},
      {key:"sector_barrio",section:"ubicacion",label:"Sector / barrio",type:"text",help:"Opcional. Úsalo si el nombre del sector ayuda a identificar el punto."},

      {key:"condicion_ocupacion_tendido",section:"infraestructura",label:"Condición de ocupación del tendido",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / saturada","2":"Alta ocupación","3":"Ocupación media","4":"Baja ocupación","5":"Muy baja ocupación / óptima"},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},
      {key:"condicion_fisica_posteria",section:"infraestructura",label:"Condición física de la postería",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / no apta","2":"Deficiente","3":"Aceptable","4":"Buena","5":"Óptima / nueva"},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},

      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"text",help:"Primer ISP local o regional identificado."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"text",showWhen:{field:"isp_1",notEmpty:true},help:"Segundo ISP local o regional identificado."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"text",showWhen:{field:"isp_2",notEmpty:true},help:"Tercer ISP local o regional identificado."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"text",showWhen:{field:"isp_3",notEmpty:true},help:"Cuarto ISP local o regional identificado."},

      {key:"link_evidencia",section:"cierre",label:"Link de evidencia",type:"text",full:true,help:"Opcional. Pega el enlace de Street View, Google Maps o My Maps que respalda la observación."},
      {key:"nota",section:"cierre",label:"Nota",type:"textarea",full:true,help:"Agrega cualquier condición relevante que no haya quedado registrada en los campos anteriores."}
    ]
  },

  EXPLORACION_PRESENCIAL: {
    id: "EXPLORACION_PRESENCIAL",
    name: "Exploración presencial",
    description: "Relevamiento en campo con GPS del dispositivo para registrar infraestructura, operadores y evidencia fotográfica.",
    eyebrow: "EXPANSIÓN",
    meta: ["GPS", "Fotos opcionales", "Operadores / infraestructura"],
    sections: [
      { id: "ubicacion", title: "Ubicación", description: "Toma las coordenadas del dispositivo y valida el municipio detectado." },
      { id: "infraestructura", title: "Infraestructura", description: "Califica la postería y la ocupación del tendido aéreo." },
      { id: "operadores", title: "Operadores", description: "Marca incumbentes y registra ISP locales o regionales visibles." },
      { id: "cierre", title: "Cierre", description: "Agrega notas y evidencia fotográfica del punto." }
    ],
    fields: [
      {key:"coordenadas",section:"ubicacion",label:"Ubicación actual",type:"gps",required:true,full:true,manualEdit:true,help:"Toma la ubicación con el GPS. Si es necesario, puedes corregir manualmente la coordenada antes de continuar."},
      {key:"municipio",section:"ubicacion",label:"Municipio / ciudad",type:"text",required:true,autoCity:true,help:"Se completa automáticamente según la coordenada detectada. Puedes corregirlo manualmente si es necesario; el formulario sirve para relevamientos en cualquier ciudad."},
      {key:"sector_barrio",section:"ubicacion",label:"Sector / barrio",type:"text",help:"Opcional. Registra el barrio o sector si ayuda a identificar el punto."},

      {key:"condicion_ocupacion_tendido",section:"infraestructura",label:"Condición de ocupación del tendido",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / saturada","2":"Alta ocupación","3":"Ocupación media","4":"Baja ocupación","5":"Muy baja ocupación / óptima"},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},
      {key:"condicion_fisica_posteria",section:"infraestructura",label:"Condición física de la postería",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Crítica / no apta","2":"Deficiente","3":"Aceptable","4":"Buena","5":"Óptima / nueva"},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},

      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"text",help:"Primer ISP local o regional identificado."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"text",showWhen:{field:"isp_1",notEmpty:true},help:"Segundo ISP local o regional identificado."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"text",showWhen:{field:"isp_2",notEmpty:true},help:"Tercer ISP local o regional identificado."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"text",showWhen:{field:"isp_3",notEmpty:true},help:"Cuarto ISP local o regional identificado."},

      {key:"nota",section:"cierre",label:"Nota",type:"textarea",full:true,help:"Agrega cualquier condición relevante observada en campo."},
      {key:"fotos",section:"cierre",label:"Fotos",type:"photos",full:true,help:"Opcional. Toma o selecciona hasta 3 fotos como evidencia del relevamiento."}
    ]
  }
};
