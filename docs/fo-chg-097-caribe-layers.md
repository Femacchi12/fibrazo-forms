# FO-CHG-097 · Estratos Caribe y barrios Turbaco

Solicitud de Edu: continuar el flujo anterior para Barranquilla, Santa Marta y Turbaco; agregar barrios de Turbaco. Se priorizaron fuentes municipales y se mantuvo el criterio referencial CNPV2018 cuando no hubo descarga municipal verificable.

| Ciudad | Fuente de estratos | Originales | Estrato1–6 | Sin estrato con geometría | Sin geometría | Grupos |
|---|---|---:|---:|---:|---:|---:|
| Barranquilla | Alcaldía, Panorama Urbano / ESTRATIFICACIÓN |151224|142304|8919|1|6|
| Santa Marta | Esri Colombia, predominante por manzana CNPV DANE2018 |5310|4549|761|0|6|
| Turbaco | Municipio, rural + conurbación + cabecera |32235|25546|6689|0|4|

Fuentes municipales con propietario verificado `alcaldia_bquilla` y organización `MUNICIPIO DE TURBACO` (`SP_Turbaco`). La vigencia de estratos municipales no está declarada en metadatos; no se deduce de la fecha de edición ni del nombre1994 de otro servicio. Se usa Panorama Urbano ESTRATIFICACIÓN, no Estrato1994_Panorama. Santa Marta conserva etiqueta de referencia2018 y no se presenta como estratificación oficial vigente.

Turbaco barrios: fuente municipal División Política2025, capas2 y3, 170polígonos →162nombres normalizados exactos; se conservan nombres originales legibles, IDs por capa, partes separadas y huecos. No se fusionan nombres aproximados. Nombres de instituciones/sectores existentes en la fuente se mantienen como publicados. No se inventan área geodésica, población, hogares ni comuna ausente. Se cargan filas2:163 de02_BARRIOS previamente vacías; `VALIDADO_TECNICAMENTE_097`, preferida=true, WKT4326/bbox. Esta capa queda utilizable por mapa y resolución territorial existente. Año2025 proviene del título de la división política.

## Fuentes y conservación

- Barranquilla: https://services3.arcgis.com/oGYAc07w6wsvgUYr/ArcGIS/rest/services/PANORAMA_URBANO_AGOL_WFL1/FeatureServer/0
- Santa Marta: https://ags.esri.co/arcgis/rest/services/LivingAtlas/Estrato_predominante_por_manzana_2018/MapServer/0 (filtroID_UNIFICADO_MANZANA47001).
- Turbaco estratos: https://services.arcgis.com/tZIysM5FuHwCeO8Y/arcgis/rest/services/ESTRATO_SOCIOECONOMICO_WFL1/FeatureServer capas2/3/4.
- Turbaco barrios: https://services.arcgis.com/tZIysM5FuHwCeO8Y/arcgis/rest/services/Division_Politica_2025_Bien__vista/FeatureServer capas2/3.

Todos se descargaron por consulta pública, paginación completa eIDs únicos, conoutSR4326. Los originales sonGeoJSON, no se afirma haber encontradoKMZ municipal. Se generaronKMZ unificados propios y paquetes originales+derivados+manifiesto. Se guardaron en Exploración: SantaMarta en su carpeta, Turbaco en2023Pueblos, Barranquilla y archivo de ejecución en00Trabajando.

RuntimeZIP: `1q15PTwABcq-stXsPZrsM6B3EVlPg-X-r`,10168625bytes; SHA256`626a81f74fac0d2bdc12d09e06da7924043ff10c7eebe2517971d68d6412a571`. Lectura concedida solo al backend deForms. Descarga de comprobación: SHA coincidente. Manifiesto compilado añade también hash por ciudad.

## Geometría y entrega

Unión por estrato a precisión completa; sin simplificar, rellenar huecos, desplazar límites ni convertir0/N/A/SIN ASIGNA en un estrato. Turbaco: 6651SIN ASIGNA y38N/A. Barranquilla: 8919estrato0 con geometría y registro128922 estrato0 sin geometría, conservado en original y auditado, excluido del dibujo.

Barranquilla requirió GEOS3.13 (`geos-wasm3.1.1`, solo herramienta de preparación) porque los algoritmos JS fallaban con degeneraciones numéricas. GEOS validó los polígonos individuales: ninguna reparación necesaria en los seis grupos; unión robusta, sin tolerancia/snap ni buffer. SantaMarta/Turbaco preparados conpolygon-clipping y verificados finalmente conGEOS. Resultados: BAQ11905componentes; SMR4344; TRB1654, representados como6/6/4FeaturesMultiPolygon. Agrupar no implica hacer contiguos sectores separados.

BAQ gzip completo ~7.78MB excede el límite de respuesta: transporte de un estrato seleccionado por página, hasta6páginas, tres solicitudes paralelas. Mayor página real2689285bytes; SMR1663039bytes; TRB781088bytes. Cliente reúne/verifica cantidad, IDs, número de página yversión antes de dibujar o marcar cobertura completa. Movimiento/zoom reutiliza la capa completa. Se mantienen filtros y colores vigentes.

Las tres nuevas capas de estratos son visuales (`canonical:false`), conforme al flujo anterior; no se insertan en03_ESTRATOS ni se cambian los valores automáticos/manuales o capturas históricas. Origen municipal se muestra como tal, con vigencia no declarada. Esto no altera aprobaciones094/095 ni referencias096. No hay cambios en cola offline, fotos, precios, IDs de relevamiento o conciliación de competencia.

## Validación y reversión

Suite completa `npm run test:forms` pasa, incluyendo nueva regresión097: permisos antes de descarga, fuentes/año,4/6grupos, filtros, índice, todas las páginas, páginas inválidas, caché compartida, SHA y aislamiento de ciudades anteriores. Archivos reales:178controles interiores, validezGEOS de16grupos+162barrios, XML/KMZ completos, hash de ZIP descargado y cada respuesta bajo3.5MB. NativeSheets barrios:162filas, todos los valores leídos coinciden con lo preparado. No se realizó prueba física Android ni importación manualMyMaps ni se inspeccionaron logs de producción.

Publicación prevista SW0.8.152 /20261023-caribe097. Vercommit/despliegueREADY y comprobación de dominio enCAMBIOS97 y manuales centrales al completar. Para revertir: volver acommitd280bd5e01f0a4e9a89147754e5ff66da8bed074; quitar solo las filas nuevas2:163 de02_BARRIOS y fuente097 deTurbaco; restaurar únicamente celdas modificadas del maestro desde nota de auditoría097. Conservar paquetes y trazabilidad.
