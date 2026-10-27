# FO-CHG-112 — Identidad y pertenencia de tarjetas

Versión 0.8.165. Reversión: 0.8.164 / 1a4e0d049aeebb99d137827869b188baa6e54607, dpl_6fAubFcFHwg9dmLA1HrBzs1wprvE.

Patrón común de tarjeta sobria: superficie neutra, borde fino, radio pequeño y línea lateral. Estado abierto comparte fondo y línea continua entre título y contenido. Iconos SVG decorativos por ID estable (Churn retorno, virtual pantalla, presencial ubicación, inteligencia señal), diferenciados también en forma; sin reclasificar registros ni introducir paletas ajenas. Reportes y Administradores usan la misma familia visual; los componentes interiores se separan por líneas y sangría. Estado dirty conserva amarillo.

Se preservan paleta institucional, tipografías, controles, aria, IDs y eventos existentes. app.js solo añade dataset del ID para presentación. Sin cambios de datos, API, autenticación, permisos, sincronización ni automatizaciones.

Referencias consultadas: Carbon Accordion guidelines https://www.carbondesignsystem.com/building-blocks/core/components/accordion/guidelines y NN/g https://www.nngroup.com/articles/accordions-on-desktop/ . Se adoptan agrupación, encabezados descriptivos, estados e indicadores claros; no estilos ajenos a FIBRAZO. QA y producción se documentan tras verificar.

QA aprobada: npm run test:forms completa; 191 IDs únicos conservados; sintaxis app/shell/worker y git diff --check. Preview 0d9783e0ebaec83d57a900e3815ff9ed4378200b / dpl_6SZ6LB7MnAQQWwPBmXyj7iLNBRr2 READY. Escritorio: cuatro identidades, exactamente un icono por tarjeta, detalle mantiene x956.5/y124; admin Churn abierto incluye título y contenido bajo mismo marco/fondo/línea; Reportes familia coherente. Móvil iframe 390×844: cuatro iconos, sin overflow de catálogo, detalle mantiene x265/y208 y cuerpo 346 px. Colores computados abiertos rgb(23,33,27) y borde rgb(67,255,165), foco verde translúcido. Cuenta real/teléfono físico pendientes de Edu. Fixture sintética excluida de producción.
