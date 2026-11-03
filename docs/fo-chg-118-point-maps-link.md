# FO-CHG-118 — Ir junto a las coordenadas

Solicitud de Edu, 03/11/2026. Forms 0.8.170. El enlace Ir a Google Maps del pie del detalle de punto se mueve a la derecha de las coordenadas y muestra solo Ir. Conserva apertura en pestaña nueva, marcador de Google Maps con latitud/longitud a seis decimales y nombre accesible explicativo. La copia de coordenadas y los enlaces de evidencia/fotos se conservan. Diseño compacto flexible para permitir ajuste del texto en pantallas estrechas. No modifica datos, permisos ni sincronización.

Validación: generador real popupHtml con coordenadas de la captura, un solo enlace Maps dentro de la fila de coordenadas, URL exacta, etiqueta Ir, copia y fotos conservadas. Controles check-map-qa y gestos113 aprobados; sintaxis y diff sin errores. No se afirma prueba autenticada ni teléfono físico. Publicación se registra al cierre. Reversión: restaurar map-v01.js, territorial-map.css, índice y caché desde f660e30300881aceb0ef8535cbd25b8a9e5d8b29, sin borrar almacenamiento ni cola.

Publicado y cotejado: commit 9b8a4c9a1a6d8bed5b8044eada1304de2cf09837; despliegue dpl_3kGxTGhr4MjTNam7uCKgcGkDt9SX READY con alias fibrazo-forms.vercel.app. map-v01.js, territorial-map.css, HTML, worker y version.json descargados del dominio coinciden byte a byte con los archivos probados.
