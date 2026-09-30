window.FIBRAZO_PENDING = [\n  {id:"email-copy",title:"Enviar copia por correo",description:"Enviar automáticamente un resumen del formulario al correo de quien lo completó.",status:"Pendiente"}\n];\n\nwindow.FIBRAZO_FORMS = {
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
      {key:"ciudad",section:"identificacion",label:"Ciudad",type:"select",required:true,options:["Sincelejo","Montería"],help:"Selecciona la ciudad donde se realiza la visita."},
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
    name: "Exploración de operadores",
    description: "Registra infraestructura, presencia de operadores, ubicación GPS y evidencia fotográfica del sector.",
    eyebrow: "EXPANSIÓN",
    meta: ["GPS", "Fotos", "Operadores / infraestructura"],
    sections: [
      { id: "ubicacion", title: "Ubicación", description: "Identifica el sector y registra la posición del relevamiento." },
      { id: "infraestructura", title: "Infraestructura", description: "Registra la información observada de postería." },
      { id: "operadores", title: "Operadores", description: "Marca la presencia de redes y operadores identificados." },
      { id: "evidencia", title: "Evidencia", description: "Agrega notas y fotografías del relevamiento." }
    ],
    fields: [
      {key:"ciudad",section:"ubicacion",label:"Ciudad",type:"text",required:true,help:"Ciudad donde se realiza el relevamiento."},
      {key:"sector_barrio",section:"ubicacion",label:"Sector / barrio",type:"text",help:"Barrio, urbanización o sector observado."},
      {key:"anio",section:"ubicacion",label:"Año",type:"numeric",required:true,maxLength:4,default:new Date().getFullYear(),help:"Año en que se realiza el relevamiento."},
      {key:"coordenadas",section:"ubicacion",label:"Ubicación actual",type:"gps",required:true,full:true,help:"Usa la ubicación del dispositivo para registrar el punto exacto."},

      {key:"e_postes",section:"infraestructura",label:"E. Postes",type:"numeric",help:"Cantidad correspondiente a E. Postes según el criterio del relevamiento."},
      {key:"s_postes",section:"infraestructura",label:"S. Postes",type:"numeric",help:"Cantidad correspondiente a S. Postes según el criterio del relevamiento."},

      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"select",options:["Sí","No","No validado"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"select",options:["Sí","No","No validado"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"select",options:["Sí","No","No validado"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"select",options:["Sí","No","No validado"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"select",options:["Sí","No","No validado"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"text",help:"Primer operador local o ISP adicional identificado."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"text",help:"Segundo operador local o ISP adicional identificado."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"text",help:"Tercer operador local o ISP adicional identificado."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"text",help:"Cuarto operador local o ISP adicional identificado."},

      {key:"nota",section:"evidencia",label:"Nota",type:"textarea",full:true,help:"Describe cualquier condición relevante del sector."},
      {key:"fotos",section:"evidencia",label:"Fotos",type:"photos",full:true,help:"Toma o selecciona hasta 3 fotos como evidencia del relevamiento."}
    ]
  }
};
