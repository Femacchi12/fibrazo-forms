# GEO-114 — auditoría de alineación, barrios y estratos

Fecha: 2026-10-30. Solicitud de Edu: aparente desplazamiento de polígonos sobre mapa, Cartagena; revisar todas las ciudades y corregir errores verificables.

## Alcance y conclusión

Se leyeron las diez bases activas del catálogo territorial (13 municipios contando AMB), los 3.592 WKT de barrios y sus bbox/procedencia, y los cinco archivos de estratos usados en producción. No se observó inversión de ejes, coordenadas proyectadas tratadas como grados, ni desplazamiento introducido por la conversión WKT→GeoJSON (las coordenadas se transmiten sin traslación). Se auditaron 129.463 vértices de barrios. Los bbox contienen rangos geográficos plausibles; esto no certifica la precisión posicional de cada fuente.

Los cinco SHA256 coinciden con las aprobaciones 095/094/096/097. Sus 64 features numéricos unificados de estratos, distribuidos en 13 municipios, tienen topología válida. No se cambiaron estratos, valores observados ni sus archivos aprobados. No se interpretan ausencia de cobertura, manzanas no clasificadas o fuentes censales 2018 como un error de proyección.

En un fixture local aislado se usaron Leaflet 1.9.4 y exactamente la URL de leaflet-rotate 0.2.4 de producción, pane geográfico, renderer SVG y la geometría real aprobada de Cartagena. El control SVG coincide con el marcador: 0 px a zoom 12/norte; ~0,00003 px a zoom 13/45° una vez terminada la animación. La esquina de tile OSM y control coincidieron a 0 px al inicio. Los tiles OSM del navegador remoto devuelven posteriormente una imagen de bloqueo por política de tiles; por ello no se afirma una comparación visual completa con OSM. La vista satelital Esri existente permitió contraste visual; no se demuestra un desplazamiento global ni una transformación de datum a aplicar. El fixture no contiene relevamientos, sesión real, ni llamadas a APIs privadas y no se publicó en producción.

Cartagena conserva la fuente GeoInformador 2022 explícitamente aprobada en FO095; las diferencias de detalle con calles/costa actuales requieren controles georreferenciados y contraste de la fuente. No se ha resuelto ni certificado toda discrepancia local de la captura. No se traslada ninguna capa a ojo.

## Correcciones realizadas en datos activos

GEOS/Shapely 2.2.0 detectó 56 barrios topológicamente inválidos. Se aplicaron 54 reparaciones conservadoras mediante make_valid(method=structure, keep_collapsed=False), sin buffer, traslación ni cambio de extensión bbox. Se excluyeron casos cuyo cambio respecto al área firmada inválida supera 0,1%. Se contrastaron las caras poligonizadas con la clasificación de anillos original (diferencia tolerada <1e-16 grados²).

| Base | Barrios revisados | Inválidos antes | Reparados | Pendientes |
|---|---:|---:|---:|---:|
| Bucaramanga / AMB | 641 | 2 | 1 | 1 |
| Cartagena | 405 | 1 | 1 | 0 |
| Barranquilla | 91 | 0 | 0 | 0 |
| Santa Marta | 162 | 1 | 1 | 0 |
| Montería | 207 | 0 | 0 | 0 |
| Sincelejo | 196 | 0 | 0 | 0 |
| Turbaco | 162 | 0 | 0 | 0 |
| Neiva | 261 | 2 | 2 | 0 |
| Villavicencio | 554 | 43 | 43 | 0 |
| Ibagué | 913 | 7 | 6 | 1 |
| **Total** | **3.592** | **56** | **54** | **2** |

Se modificó únicamente O{fila} (WKT) y su nota de auditoría en 02_BARRIOS, en seis bases. Identificadores, nombres, procedencia, año, preferencias, calidad, estratos y relevamientos se conservan. Se releen ID y WKT antes de escribir y se rechaza una diferencia concurrente. Las 54 celdas se releen después: igualdad exacta con WKT reparado y nota GEO-114. No hubo recálculo de registros existentes. La nueva geometría se usa tanto en dibujo como en futuras consultas; no hay un ajuste visual distinto del motor.

La bbox de ZONA INDUSTRIAL (Cartagena, fila 186) era unos 18,22 m más amplia que su WKT: es una envolvente conservadora, no una traslación del polígono. Se conserva, pues no excluye la geometría ni explica la captura. La reparación local no desplaza la capa de estratos.

## Validación y límites

`node docs/check-barrio-repairs-114.cjs` usa parseWkt/inGeometry/geometryDistance reales del motor: 53.746 controles de malla y puntos a ~1 m de vértices. Siete clasificaciones cambian por eliminación/reparación de bordes degenerados; todas a ≤0,223 m de un borde (máximo medido 0,2220166971 m). No se afirma identidad absoluta en bordes defectuosos. Todas las geometrías serializadas reparadas son válidas, conservan bbox y varían menos de 0,1% del área firmada original. El ensayo de caras usa tolerancia numérica y no es certificación catastral.

Pendientes, sin modificar: BGF_BARR_0440, nombre FLORIDABLANCA, 02_BARRIOS!O441 (hueco fuera del contorno y área firmada anómala); IBG_BARR_0071, BELENCITO, O72 (área firmada cambia 2,35% al reparar). La fuente original Barrios_AMB.geojson (Drive 19zQkWvR0_PQPU7rTiWnNtsNeTmiGEyrd, OBJECTID 440) contiene el mismo defecto de FLORIDABLANCA: no es un error nuevo del importador. Ambos requieren contraste/reconstrucción de geometría antes de decidir la interpretación. No se convirtieron en fuentes inválidas/no preferidas ni se eliminaron.

La suite completa `npm run test:forms` pasó sin cambios de código de ejecución. La sesión real de producción está protegida por Google en el navegador de pruebas. No se afirma haber revisado visualmente cada barrio o cada calle de las trece municipalidades en una sesión autenticada. El control de renderer es aislado; no demuestra la ausencia de todos los defectos de interacción del dashboard. No se cambió el código de ejecución, autenticación, automatizaciones, sincronización ni despliegue: producción continúa 0.8.166 / 7426e912 / dpl_9pDVYSesaCQySEWqYCGLJgFEvD5R. Las capas tienen caché servidor de diez minutos; recargar/actualizar capas después permite leer los WKT nuevos sin borrar datos de la PWA.

## Evidencia y reversión

`geo-audit-114-summary.json` registra inventario, controles de bbox, defectos, lectura posterior y huellas de archivos; `geo-audit-114-repairs.json` contiene identificación, filas, WKT previo/nuevo y criterio por los 56 casos. Respaldo remoto anterior a escrituras: be6611fdfc42173452292cdc02ce54cba0aaf5ce, rama audit/territorial-geometries-114. Restaurar solo las 54 filas elegibles desde oldWkt si se requiere reversión, verificando antes que el valor siga siendo newWkt; preservar cambios posteriores. No restaurar la base entera. Las notas originales se preservaron y se añadió la anotación GEO-114.
