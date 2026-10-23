# FO-CHG-098 · Integración territorial operativa

Edu autoriza integrar las fuentes disponibles para que dashboard, formularios y nuevos puntos usen la misma información automática. Se conserva el Maestro Territorial01_CIUDADES para ruteo y los libros por ciudad para barrios/municipios/troncales; estratos grandes se resuelven directamente desde los archivos unificados ya usados por el mapa. No se copian cientos de miles de WKT aSheets.

## Registro y fuentes

`api/territorial-sources.json`:10catálogos/13municipios, proveedor,año,tipo,aprobación ydepartamento. `_territorial-sources.js` es el acceso común al motor y a la aprobación visible del mapa. Las fuentes anteriores094/095 mantienen su resolución. Se activan BAQ,SMR,TRB,MTR,SCL con aprobación operativa098. Los archivos originales096/097 se conservan sin modificación y con sus hashes. El origen censal2018 nunca se presenta como certificación municipal. La vigencia de las capas municipales BAQ/TRB sigue no declarada.

| Catálogo | Fuente usada para automático | Grupos |
|---|---|---:|
|BAQ|Panorama Urbano municipal|6|
|SMR|CNPV2018 / Esri Colombia|6|
|TRB|Municipio: rural,conurbación,cabecera|4|
|MTR|CNPV2018 / Esri Colombia|6|
|SCL|CNPV2018 / Esri Colombia|6|

La geometría archivada retiene sus propiedades originales de procedencia. Respuestas del mapa agregan`operationalApproved`,catálogo,versión yalcance de aprobación; la etiqueta censal2018 se mantiene. Resultado del motor identifica`canonical:true` como canónica operativa FIBRAZO,`municipalCertification:false`,año/tipo/fuente yversión098. Son significados distintos: aprobación de uso interno no es certificación pública.

## Regla de asignación

Motor3.5: antes de resolver un estrato exige municipio`DENTRO` de geometría municipal validada. Para nuevas fuentes usa índice de bbox por componente cacheado sobre la misma geometría de mapa; comprueba pertenencia real con huecos. Un único valor →DENTRO/asignado; varios valores →AMBIGUO/sin asignación; ningún valor →FUERA/sin asignación. No toma el polígono más cercano ni usa la sugerencia de otra ciudad. Los0,N/A,SIN ASIGNA y sectores sin cobertura siguen sin asignación.

`/api/exploration` consume el motor existente y los formularios/background aplican su resultado sin nueva lógica paralela. Exploración virtual/presencial guarda los campos automáticos y de auditoría existentes. La lista estática de catálogos aprobados para guardado se reemplaza por el registro común.

Inteligencia de operadores: servidor verifica el punto antes de subir fotos/crear una respuesta nueva; reutiliza esa misma resolución durante el guardado para evitar consultas duplicadas y resultados inconsistentes. El estrato automático se deriva del motor y el observado se conserva separado. Ediciones autorizadas usan GPS original o corrección explícita y mantienen ID,fecha,propietario,fotos yprecios según flujo existente. Fallo de fuente antes del alta no escribe una nueva ficha; la cola puede reintentar con el mismoID. Contratos de locks e idempotencia conservados.

## Auditoría y consolidación

Se amplía RESP_INTELIGENCIA_OPERADOR de32a36columnas sin cambiar A:AF ni rellenar registros históricos. Nuevos encabezados AG:AJ:Territorial_Version,Estrato_Estado,Estrato_Fuente,Estrato_Fuente_Version. Se generan por servidor para fichas nuevas/ediciones autorizadas. Competencia lee hastaAJ; para las cinco nuevas ciudades solo acepta estrato numérico con auditoría DENTRO yversiónFO-CHG-098. Un número antiguo sin auditoría no se promueve retrospectivamente. Estrato observado/manual yfuente quedan diferenciados en evidencia. Departamentos salen del mismo registro, incluidos Caribe. No se crea precio,cobertura niidentidad legal inferida.

No se reescribieron relevamientos,observaciones,coordenadas,fotos oestratos históricos. Activación prospectiva; ediciones yreintentos expresamente autorizados siguen sus flujos existentes. No se ejecutó conciliación masiva de registros previos.

## Verificación y publicación

Suite completa`test:forms` pasa, con regresiones anteriores y098. Se actualizaron los fixtures089(import del nuevo registro) y070(expectativa de versión3.5), manteniendo sus comprobaciones.

Regresión098motor: rutas reales para5catálogos, interior,huecos,superposición,fuera,protección municipal,año/fuente/alcance yflatten; no promoción de números históricos; preservación manual yproveniencia aCompetencia. Regresión098guardado: rutas reales de alta/edición,autorrelleno verificado,manual/precio/GPS/ID/fecha conservados,reintento idempotente,AMBIGUO sin asignar yfallo de fuente antes de escrituras. Datos reales:28controles interiores (6+6+4+6+6),5controles externos,archivos compartidos descargados2veces en total yhash verificados; geometría exactamente compartida con el mapa. No hay prueba físicaAndroid ni nueva encuesta de prueba enproducción.

VersiónSW0.8.153 /20261023-integrated098. Publicación ydominio se verifican al completar; detalles enCAMBIOS98 ymanuales centrales. Registro17_FUENTES_OPERATIVAS_098 del maestro documenta el snapshot desplegado; no es una segunda edición independiente de geometrías. Cambios de fuente futuros requieren versión/aprobación ypruebas de coincidencia antes de publicar.

Reversión: volver acommitc1174883ce889ca8cc94aee67504ce983fe5b97c. Mantener columnas nuevas ydatos de auditoría; el código anterior las ignora, no reducir columnas ni borrar fichas. Restaurar estados/notas098 delmaestro/libros desde respaldo ennota17_FUENTES_OPERATIVAS_098!N1. Conservar fuentes y aprobaciones previas. No borrar colas locales.
