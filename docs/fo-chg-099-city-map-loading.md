# FO-CHG-099 · Mapa por ciudad · 23/10/2026 COT

Autorización: solicitud de Edu en continuidad de Dash_Work_1, mapa que permanece cargando. Mostrar puntos relevados y estratos 1–3 únicamente de la ciudad filtrada o detectada GPS.

Hallazgos en código: /api/map devolvía puntos de todas las ciudades; recortaba cada origen a sus últimos 2.000 registros antes de aplicar ciudad en el navegador; no existía deadline de fetch/token. GPS usaba enriquecimiento territorial completo, incluidos polígonos y competencia, para descubrir el municipio.

Cambios: filtro cities en servidor antes de límite final y caché local por usuario/ciudad; sin ciudad el cliente no solicita puntos globales. Se conserva selección múltiple explícita. Un cambio cancela petición previa y rechaza respuestas obsoletas. Catálogo conserva selección mientras llega la respuesta. La búsqueda de ciudad también selecciona su filtro. Consulta GPS cityOnly resuelve únicamente municipio con geometrías validadas y fallback DANE existente; no asigna por bbox ni cercanía. Estratos 1–3 usan capas existentes para todas las ciudades soportadas. Límite de 25 segundos cubre token, red y JSON y libera indicador al vencer. Mi ubicación permite reintentar detección. Carga inicial no aleja el mapa del GPS para encuadrar puntos. Caché SW0.8.154, etiqueta20261023-city099.

Alcance: consultas y visualización. No modifica encuestas, fotos, precios, coordenadas, fuentes, reglas de asignación territorial ni sincronización con Competencia. Sheets aún lee los rangos fuente en el servidor; el filtro reduce respuesta y renderizado, no constituye un índice geográfico en Sheets. Se conserva máximo2.000 puntos por consulta, aplicado después del filtro/deduplicación.

Validación: suite completa test:forms y check-city-loading-099.cjs. Fixtures ejecutan handler real: ciudad, acentos, AMB, permisos de propietario, inteligencia, puntoNeiva anterior a2.100puntos de otra ciudad, sin resultados, cambio durante fetch, respuesta antigua ignorada, spinner liberado, token bloqueado termina con error y cityOnly no invoca enriquecimiento completo. No hay prueba físicaAndroid, nuevo envío real ni sesión autenticada del teléfono en este entorno.

Reversión: volver a0297761983f5fd91657dade6339a843b5b9c93c1; no borrar almacenamiento local ni colas offline. Publicación y cotejo de dominio se registran en ManualForms después de READY.
