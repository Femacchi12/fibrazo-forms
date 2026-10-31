# FO-CHG-115 — Superficies neutras y continuidad con Competencia

Fecha: 31/10/2026. Forms 0.8.167. Base de reversión: 4ad420b / producción 0.8.166 (7426e9).

Se reemplazan superficies verdosas de tarjetas, desplegables, mapa y cuenta por grises acromáticos. Se conserva verde FIBRAZO para acciones/selección, colores de clasificación del mapa y bordes blancos. Abrir y Ver detalles comparten dimensiones, radio y tipografía; el detalle mantiene su posición. Flechas CSS consistentes en formularios activos/inactivos y tarjetas. Navegación con alturas/alineación homogéneas. A 600 px o menos, título sobre acciones para evitar nombres partidos; mantiene botones táctiles de 44 px.

Competencia adopta el mismo lenguaje mediante una capa CSS específica y un shell que mueve los controles existentes al menú Mi cuenta. Incluye navegación cruzada Forms/Mapa/Competencia, cabecera sin marco, superficies neutras, pestañas sobrias y espaciado compacto. No cambia autenticación, permisos, datos, API, sincronización, filtros ni colores semánticos de gráficos. No se trasladan polígonos; el desfase cartográfico sigue pendiente de contrastar con la fuente.

Verificación: suite test:forms completa PASS; tres comprobaciones de Competencia PASS (acceso ciudades, consolidación, enlaces territoriales). Navegador con fixtures sintéticos locales, escrituras bloqueadas: catálogo, detalle, administración y cuenta; botón detalle 124×44 y posición (956.5,124) idéntica cerrado/abierto en escritorio. Competencia con estilos dinámicos de resumen cargados y filtros sintéticos. Vista 390×844 revisada; no implica GPS físico ni validación con sesión real. Fixtures fuera de ambos repositorios y de producción. Estado de publicación se agrega después de verificar dominios.
