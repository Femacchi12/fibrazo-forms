window.FIBRAZO_PENDING = [];

const FIBRAZO_CURRENT_YEAR = new Date().getFullYear();

window.FIBRAZO_FORMS = {
  INTELIGENCIA_OPERADOR: {
    id:"INTELIGENCIA_OPERADOR",
    name:"Inteligencia de operadores",
    description:"Biblioteca de identificación visual y técnica de ISPs locales/regionales observados en campo.",
    eyebrow:"COMPETENCIA",
    meta:["Ficha técnica","Fotos de referencia","Identificación en campo"],
    sections:[
      {id:"identificacion",title:"Operador",description:"Identifica el ISP y el lugar donde se observó."},
      {id:"elementos",title:"Elementos de red",description:"Registra cómo reconocer su infraestructura."},
      {id:"calidad",title:"Calidad del despliegue",description:"Evalúa la ejecución visible del tendido."},
      {id:"evidencia",title:"Evidencia",description:"Guarda fotografías de referencia y observaciones."}
    ],
    fields:[
      {key:"coordenadas",section:"identificacion",label:"Coordenadas de referencia",type:"gps",required:true,full:true,auto:true,help:"Se toman por GPS y puedes volver a mejorar la precisión."},
      {key:"operador",section:"identificacion",label:"ISP / operador",type:"isp-autocomplete",required:true,help:"Busca un ISP existente o escribe un nombre nuevo. El nombre quedará disponible para futuros relevamientos."},
      {key:"modelo_caja",section:"elementos",label:"Modelo / tipo de caja",type:"text",help:"Modelo, fabricante o descripción visual de la caja."},
      {key:"nomenclatura_caja",section:"elementos",label:"Nomenclatura / identificación de cajas",type:"text",help:"Ejemplo de código, prefijo o patrón utilizado por el operador."},
      {key:"marquilla",section:"elementos",label:"Marquilla / identificación del cable",type:"text",help:"Describe colores, texto, placas, cintas u otros elementos distintivos."},
      {key:"tipo_tensor",section:"elementos",label:"Tensor / herraje observado",type:"text",help:"Describe el tipo de tensor, herraje o forma de sujeción que ayude a identificarlo."},
      {key:"tipo_despliegue",section:"elementos",label:"Tipo de despliegue",type:"select",default:"Aéreo",options:["Aéreo","Canalizado","Mixto"]},
      {key:"calidad_tendido",section:"calidad",label:"Calidad de tendido e instalación",type:"segmented",required:true,options:["1","2","3","4","5"],details:{"1":"Muy mala: instalación desordenada, improvisada o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden, fijación o ejecución.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Selecciona 1 a 5; la descripción queda visible para mantener un criterio consistente."},
      {key:"observaciones",section:"evidencia",label:"Observaciones para identificarlo en campo",type:"textarea",full:true,help:"Registra cualquier rasgo que ayude a reconocer rápidamente este operador."},
      {key:"fotos",section:"evidencia",label:"Fotos de referencia",type:"photos",full:true,help:"Carga hasta 3 fotos. Desde galería puedes seleccionar varias de una vez."}
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
      {key:"sector_barrio",section:"ubicacion",label:"Barrio",type:"text",autoGeo:"barrio",help:"Muestra el barrio identificado por el Motor Territorial. Si la coordenada queda fuera, muestra el barrio más cercano como referencia y debajo indica en rojo la distancia al polígono. El estado territorial se guarda por separado para análisis y filtros."},
      {key:"estrato",section:"ubicacion",label:"Estrato",type:"select",options:["1","2","3","4","5","6","Sin información"],autoGeo:"estrato",help:"Muestra el estrato identificado por el Motor Territorial. Si la coordenada queda fuera, muestra el estrato más cercano como referencia y debajo indica en rojo la distancia al polígono. El estado territorial se guarda por separado para análisis y filtros."},
      {key:"estrato_observado",section:"ubicacion",label:"Estrato observado en Street View",type:"select",options:["","1","2","3","4","5","6"],help:"Opcional. Completa solo cuando Street View permite observar claramente un estrato distinto al automático."},
      {key:"zona_empresarial",section:"ubicacion",label:"¿Zona empresarial / comercial?",type:"toggle",default:"No",options:["Sí","No"],help:"Marca Sí solo cuando la imagen permite identificar claramente una zona predominantemente empresarial o comercial."},

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
      {key:"nota",section:"cierre",label:"Nota",type:"textarea",full:true,help:"Agrega cualquier condición relevante que no haya quedado registrada en los campos anteriores."},
      {key:"fotos",section:"cierre",label:"Fotos",type:"photos",full:true,help:"Opcional. Carga hasta 3 fotos. Desde galería puedes seleccionar varias de una vez; también puedes tomar fotos con la cámara."}
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
      {key:"municipio",section:"ubicacion",label:"Municipio / ciudad",type:"text",required:true,autoCity:true,help:"Se detecta primero contra el Maestro Territorial FIBRAZO. Si queda fuera del ámbito cargado, se muestra el municipio más cercano con su distancia y puedes registrar manualmente el municipio observado."},
      {key:"sector_barrio",section:"ubicacion",label:"Barrio",type:"text",autoGeo:"barrio",help:"Muestra el barrio identificado por el Motor Territorial. Si la coordenada queda fuera, muestra el barrio más cercano como referencia y debajo indica en rojo la distancia al polígono. El estado territorial se guarda por separado para análisis y filtros."},
      {key:"estrato",section:"ubicacion",label:"Estrato",type:"select",options:["1","2","3","4","5","6","Sin información"],autoGeo:"estrato",help:"Muestra el estrato identificado por el Motor Territorial. Si la coordenada queda fuera, muestra el estrato más cercano como referencia y debajo indica en rojo la distancia al polígono. El estado territorial se guarda por separado para análisis y filtros."},
      {key:"estrato_observado",section:"ubicacion",label:"Estrato observado en campo",type:"select",options:["","1","2","3","4","5","6"],help:"Opcional. Completa solo si lo observado en terreno difiere del estrato automático. Vacío significa que validas el estrato automático."},
      {key:"zona_empresarial",section:"ubicacion",label:"¿Zona empresarial / comercial?",type:"toggle",default:"No",options:["Sí","No"],help:"Marca Sí cuando el punto corresponde claramente a una zona predominantemente empresarial o comercial."},
      {key:"nivel_seguridad",section:"ubicacion",label:"Percepción de seguridad de la zona",type:"segmented",options:["1","2","3","4","5"],details:{"1":"Muy insegura: condiciones visibles o percibidas que desaconsejan trabajo operativo sin medidas adicionales.","2":"Insegura: requiere precauciones reforzadas para trabajo en campo.","3":"Intermedia: condiciones mixtas; operar con precaución normal.","4":"Segura: condiciones favorables para trabajo de campo.","5":"Muy segura: condiciones muy favorables y sin alertas evidentes durante la visita."},help:"Percepción operativa del relevador, no una clasificación oficial de seguridad. Selecciona 1 a 5 y se mostrará la descripción."},

      {key:"tipo_despliegue",section:"infraestructura",label:"Tipo de despliegue observado",type:"select",required:true,default:"Aéreo",options:["Aéreo","Canalizado"],help:"Por defecto Aéreo. Si seleccionas Canalizado se omiten las preguntas de postería."},
      {key:"condicion_ocupacion_tendido",section:"infraestructura",label:"Condición de ocupación del tendido",type:"segmented",required:true,showWhen:{field:"tipo_despliegue",equals:"Aéreo"},options:["1","2","3","4","5"],details:{"1":"Crítica / saturada: alta saturación, desorden y/o riesgo eléctrico visible.","2":"Alta ocupación: gran cantidad de cableado y desorden, con menor riesgo evidente.","3":"Ocupación media: cableado importante, pero con cierto orden y espacio disponible.","4":"Baja ocupación: el tendido permite visualmente un despliegue adicional cómodo.","5":"Muy baja ocupación / óptima: postería despejada, ordenada y con amplia disponibilidad visual."},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},
      {key:"condicion_fisica_posteria",section:"infraestructura",label:"Condición física de la postería",type:"segmented",required:true,showWhen:{field:"tipo_despliegue",equals:"Aéreo"},options:["1","2","3","4","5"],details:{"1":"Crítica / no apta: infraestructura improvisada, madera deteriorada, mástiles o condición evidentemente riesgosa.","2":"Deficiente: postería formal con deterioro visible o condición poco favorable.","3":"Aceptable: utilizable y funcional, sujeto a validación técnica.","4":"Buena: concreto en buen estado, alineada y sin deterioro evidente.","5":"Óptima / nueva: excelente condición y capacidad visual para infraestructura adicional."},help:"Selecciona una opción del 1 al 5. Debajo verás el significado de la opción elegida."},

      {key:"tigo_hfc",section:"operadores",label:"TIGO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de TIGO."},
      {key:"tigo_ftth",section:"operadores",label:"TIGO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de TIGO."},
      {key:"claro_hfc",section:"operadores",label:"CLARO HFC",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red HFC de Claro."},
      {key:"claro_ftth",section:"operadores",label:"CLARO FTTH",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa red FTTH de Claro."},
      {key:"movistar",section:"operadores",label:"Movistar",type:"toggle",default:"No",options:["Sí","No"],help:"Indica si se observa presencia de Movistar."},
      {key:"isp_1",section:"operadores",label:"ISP 1",type:"isp-autocomplete",default:"Sin ISP",help:"Primer ISP local o regional identificado."},
      {key:"isp_1_calidad",section:"operadores",label:"Calidad de tendido · ISP 1",type:"segmented",showWhen:{field:"isp_1",notValues:["","Sin ISP","Sin Identificar"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_2",section:"operadores",label:"ISP 2",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_1",notValues:["","Sin ISP"]},help:"Segundo ISP local o regional identificado."},
      {key:"isp_2_calidad",section:"operadores",label:"Calidad de tendido · ISP 2",type:"segmented",showWhen:{field:"isp_2",notValues:["","Sin ISP","Sin Identificar"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_3",section:"operadores",label:"ISP 3",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_2",notValues:["","Sin ISP"]},help:"Tercer ISP local o regional identificado."},
      {key:"isp_3_calidad",section:"operadores",label:"Calidad de tendido · ISP 3",type:"segmented",showWhen:{field:"isp_3",notValues:["","Sin ISP","Sin Identificar"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},
      {key:"isp_4",section:"operadores",label:"ISP 4",type:"isp-autocomplete",default:"Sin ISP",showWhen:{field:"isp_3",notValues:["","Sin ISP"]},help:"Cuarto ISP local o regional identificado."},
      {key:"isp_4_calidad",section:"operadores",label:"Calidad de tendido · ISP 4",type:"segmented",showWhen:{field:"isp_4",notValues:["","Sin ISP","Sin Identificar"]},options:["1","2","3","4","5"],details:{"1":"Muy mala: tendido desordenado, improvisado o con deficiencias evidentes.","2":"Mala: varias deficiencias visibles de orden o instalación.","3":"Aceptable: instalación funcional con calidad media.","4":"Buena: tendido ordenado y bien ejecutado.","5":"Muy buena: instalación prolija, consistente y de alta calidad visual."},help:"Califica solo ISP locales/regionales. No aplica a Tigo, Claro o Movistar."},

      {key:"nota",section:"cierre",label:"Nota",type:"textarea",full:true,help:"Agrega cualquier condición relevante observada en campo."},
      {key:"fotos",section:"cierre",label:"Fotos",type:"photos",full:true,help:"Opcional. Toma hasta 3 fotos de forma secuencial. Cada foto muestra vista previa y permite cambiarla o eliminarla antes de agregar la siguiente."}
    ]
  }
};
