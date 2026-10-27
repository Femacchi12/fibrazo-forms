# FO-CHG-112 — Identidad y pertenencia de tarjetas

Versión 0.8.165. Reversión: 0.8.164 / 1a4e0d049aeebb99d137827869b188baa6e54607, dpl_6fAubFcFHwg9dmLA1HrBzs1wprvE.

Patrón común de tarjeta sobria: superficie neutra, borde fino, radio pequeño y línea lateral. Estado abierto comparte fondo y línea continua entre título y contenido. Iconos SVG decorativos por ID estable (Churn retorno, virtual pantalla, presencial ubicación, inteligencia señal), diferenciados también en forma; sin reclasificar registros ni introducir paletas ajenas. Reportes y Administradores usan la misma familia visual; los componentes interiores se separan por líneas y sangría. Estado dirty conserva amarillo.

Se preservan paleta institucional, tipografías, controles, aria, IDs y eventos existentes. app.js solo añade dataset del ID para presentación. Sin cambios de datos, API, autenticación, permisos, sincronización ni automatizaciones.

Referencias consultadas: Carbon Accordion guidelines https://www.carbondesignsystem.com/building-blocks/core/components/accordion/guidelines y NN/g https://www.nngroup.com/articles/accordions-on-desktop/ . Se adoptan agrupación, encabezados descriptivos, estados e indicadores claros; no estilos ajenos a FIBRAZO. QA y producción se documentan tras verificar.
