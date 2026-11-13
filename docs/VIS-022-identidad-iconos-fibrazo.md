# VIS-022 — Identidad visual de íconos FIBRAZO Forms

**Fecha:** 2026-11-13  
**Referencia:** Portal Mi Fibrazo (aprobado por usuario) · FO-CHG-139  
**Estado:** Norma visual activa

## Regla obligatoria para íconos de identidad de formularios
- Contenedor de ícono: **circular**, relación 1:1 y `border-radius: 50%`.
- Fondo: **verde institucional FIBRAZO `#43FFA5`**, sólido.
- Glifo/ícono: **negro `#000000`**, monocolor. En SVG, `stroke: #000`, salvo pictogramas de relleno, que usan `fill: #000`.
- Tamaño de referencia en las tarjetas: círculo 30×30 px; glifo 18×18 px centrado. Los tamaños pueden adaptarse proporcionalmente en otras vistas.
- Mantener contraste y legibilidad; no asignar formas/color diferentes según el tipo de formulario.
- **No usar** glifos verdes sobre fondos negros/gris oscuro, íconos cuadrados, contornos punteados ni variaciones por tipo de formulario.
- **Alcance:** íconos de identificación de formularios y accesos equivalentes en el dashboard; las señales semánticas de estado/error, controles y marcadores del mapa conservan sus propias reglas funcionales. Si la identidad del formulario usa emoji de color, sustituirlo por SVG monocromo.
- Esta norma debe respetarse al crear nuevos formularios, secciones de formularios y tarjetas en FIBRAZO Forms. Se toma como estándar de referencia para homologación con el Portal Mi Fibrazo.

## Implementación
- `executive-shell.css`: definición final específica a `#formCards` y `#adminForms` con prioridad sobre variantes heredadas. 
- `app.js`: ícono del Focus Group sustituido por SVG de línea para respetar el negro monocromo.
- Se preservan los SVG existentes de Inteligencia de operadores, Churn, Exploración virtual y Exploración presencial; el color/fondo y forma se unifican con CSS.

## Criterios de aceptación
1. Todas las tarjetas de formularios muestran un círculo verde completo sin esquinas visibles ni borde punteado.
2. Los glifos de cada tarjeta son negros, no verdes; pictogramas siguen siendo distinguibles.
3. El Focus Group se ve igual que los demás.
4. El estándar se conserva en escritorio y móvil.
5. No se alteran los permisos, el guardado de datos ni las demás funciones del dashboard.

## Pruebas de publicación
Verificar el último despliegue `READY` en Vercel y realizar QA visual móvil/escritorio. El cambio de CSS se limita al sistema de tarjetas del dashboard.
