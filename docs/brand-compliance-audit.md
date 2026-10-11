# Auditoría de identidad visual FIBRAZO — 2026-10-10

## Fuente única y alcance
- [Guía de marca y registro maestro](https://docs.google.com/document/d/1vgYxAB-KhkhHMb-zd-eGJLk_UX6QcSjznZ2WnFRd9m8/edit).
- [Estándar visual de dashboards](https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit).
- [Gobierno y control de cambios](https://docs.google.com/document/d/1rH6nH6qsXolzkq04jCOmej8xeez0JJAJwnjiiiYS1Ps/edit).

Identidad principal documentada: verde `#43FFA5`, negro `#000000`, gris `#58595B`; fuente Montserrat para interfaz general (adaptada de guía documental), Poppins para tablas. Complementarios observados en recursos: morado `#E94CFF`, amarillo `#FFB600`, fucsia `#FF005C` y naranja `#FF5400`. No reemplazar colores de significado funcional en gráficas, prioridades o estados sin revisar accesibilidad.

## Regla de trabajo
Consultar las referencias y documentar propuesta antes de tocar componentes. El contrato de tokens versionado localmente NO sincroniza automáticamente con Drive. Probar diseño de escritorio/móvil y las funciones antes de declarar cierre.

## Estado de implementación
- Los archivos `design/fibrazo-brand.tokens.json` y `brand-alignment.css` se encontraron en el repositorio y la interfaz los referencia directa o indirectamente.
- En Forms y Competencia se agregó la capa «shared shell v1.2» para tipografías, tablas y tokens compatibles con estilos heredados.
- Impacto Social importa `brand-alignment.css` desde `theme-executive.css`; mantener esta ruta.
- Redmine incorpora directamente `brand-alignment.css` en `index.html`.
- Esta auditoría confirma el estado del código, **no una validación visual de despliegue o regresión autenticada**.

## Pendientes de verificación
1. Inspeccionar escritorio y móvil con sesión autorizada: inicio, navegación, filtros, KPI, tablas, gráficos, mapas donde existan.
2. Confirmar publicación del commit en el hosting asociado a cada repositorio.
3. Revisar HEX directos y estilos `Inter` remanentes que anulen tokens por especificidad o estilos inline.
4. Registrar evidencia de captura antes/después y contraste de estado: EN CÓDIGO / PUBLICADO / VERIFICADO.
5. Si cambia el registro de marca, crear cambio controlado y actualizar los cuatro snapshots; no confiar en sincronización automática.

## Ajuste móvil 2026-10-10 — capturas del usuario
Se compactaron los botones de navegación, se limitaron tamaños KPI, se redujo padding en cards, se normalizó el ancho de filtros de lectura de competencia y de últimas respuestas, y se alinearon encabezados dentro del panel. Se implementó en `brand-alignment.css` commit `5f6d6a4c35a8f3fab9ca874d5526fe51d17b7d5b`, y se actualizó la versión de caché en `index.html` commit `101c8452a6ec9e0d27140213451db0a25d96c959`. Se conservaron funciones/datos. Estado: en código, pendiente revisión de todos los apartados sobre dispositivos y producción. No dar por cerrada la auditoría móvil hasta inspección visual.

## FBZ-UI-DENSITY-20261010-03 — tamaños móviles estandarizados
Solicitud aprobada por usuario tras capturas: compactar Abrir formulario y bloques TIGO/CLARO Sí/No, aplicando reglas coherentes a Forms. Token CSS: primario 46px, secundario 44px, selector visual 54px, radio 12px, separación 10px. Nombres operador 13px, valor Sí/No 17px, hint 11px, padding tarjeta 12px, cards generales 14px, KPI 88px min. Mantener un área táctil ≥44px y semántica de operador. Archivo modificado: `brand-alignment.css` commit `eb7336d1bfb8ccd07fe11e123c856e27aa9a162f`. Cache bust `index.html` commit `10fbb8432f8fffcc837a966041b1a4c7850d5d2e`. Control de cambio: `FO-CHG-004` en hoja Cambios Forms. Estado: implementado en GitHub, pendiente prueba de móvil autenticada y despliegue; no se modificaron cálculos ni backend.


## FO-CHG-005 — Previews minimizadas y escala móvil compacta (2026-10-10)
- Solicitud: mostrar solo **título + Abrir formulario + Ver detalles** inicialmente. Descripción, categoría, estado, enlace, Copiar y Base de datos se consultan al desplegar; los chips informativos no se generan.
- Implementación: `app.js` usa `<details>` nativo cerrado, mantiene `.form-card .form-open-button` y eventos de Copiar, junto a permisos existentes de Base de datos. CSS `brand-alignment.css` escala tarjeta a 10px de padding móvil, CTA 38px, controles Sí/No 46px, acciones generales ~40px.
- Actualización de caché: `index.html` solicita `app.js?v=2026.10.10.05` y `brand-alignment.css?v=20261010-05`; `service-worker.js` cambia nombre de caché e incorpora CSS.
- Commits: `1ad5f461` (preview), `b3eecb2b` (CSS), `e1bd407f` (asset versions), `91d5dda7` (SW cache).
- Historial Drive: [FO-CHG-005](https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit), preferencias [VIS-006/007/008](https://docs.google.com/spreadsheets/d/1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c/edit).
- Estado: **implementado y comprobado en repositorio**. Pendiente publicación verificada y QA móvil de apertura, despliegue, copiar, permisos de Base de datos, auth, GPS, respuestas, PWA/offline, y pruebas en tamaños pequeños. No afirmar cierre de producción.


## FO-CHG-006 — Densidad ejecutiva móvil (2026-10-10)
Estado: **implementado en código**, aún **sin verificar en producción**.

Fuente: nuevas capturas de formularios de operadores, ISP, puntuaciones y navegación. Contrato visual aprobado por solicitud: compactar barra superior con identidad redundante omitida solo en esa barra, stepper 38px, sección 19px, tarjeta de pregunta 9px, toggle Sí/No 40px, memoria operadores 38px, rating 1–5 37px, input ISP 39px (tipografía 16px para zoom iOS), footer 39px, CTA preview 36px, KPI 74px y botones mapa 38px. Conservar el contraste semántico y el acceso a datos del formulario.

Archivos modificados:
- brand-alignment.css: commit 949943a119f7a160337e6afac98288e4440b503d
- index.html: commit d3b8689c9f00a5465e645fbb28701076a1c51dcf
- service-worker.js: commit 832ef23fd2eaf94d000544c1f41e984ea7ea8b5f

Registros: [FO-CHG-006](https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit), [VIS-009](https://docs.google.com/spreadsheets/d/1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c/edit). CSS comprobado estáticamente, incluyendo balance de llaves, enlaces, cache bust y persistencia de lógica. Falta prueba manual de usabilidad, zoom, offline/PWA, permisos, pasos, mapa/GPS y publicación Vercel. Revertir 3 commits en caso de regresión.
