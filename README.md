# FIBRAZO Forms · v0.8.6

Centro interno de formularios, relevamientos y resultados de FIBRAZO.

## Arquitectura

- **Forms** administra formularios, usuarios, permisos, respuestas originales, evidencias y seguridad.
- **Exploración** es la fuente maestra de municipio, barrio, estrato, territorio y criterios de relevamiento.
- **Competencia** es la fuente maestra de operadores, ISP y presencia competitiva.
- Los **proyectos ciudad** reciben resultados procesados cuando corresponde, sin reemplazar la respuesta original guardada en Forms.

La respuesta enviada por el usuario se conserva en `RESP_*`. Los enriquecimientos posteriores agregan estado, proyecto, ID de punto y datos geográficos sin eliminar el registro crudo.

## Fuente de verdad de las preguntas

Mientras no exista un editor/builder de preguntas en Administración, la configuración productiva de preguntas vive en:

`forms-config.js`

La hoja `PREGUNTAS` de Google Sheets se conserva como referencia histórica/documental y **no modifica el formulario productivo**.

## Formularios activos

- **Churn** — visitas a clientes que dejaron de recargar.
- **Exploración virtual** — Street View, infraestructura, operadores/ISP, barrio/estrato automático cuando existe fuente preferida y fotos opcionales.
- **Exploración presencial** — GPS, infraestructura, operadores/ISP y evidencia fotográfica.

## Geografía

El enriquecimiento automático respeta las fuentes territoriales preferidas. Una capa candidata no se presenta como barrio validado.

En el proyecto Bucaramanga/AMB, el estrato solo se asigna cuando la coordenada cae **dentro** de un polígono oficial. Si no existe coincidencia geométrica, se registra **Sin información**; no se asigna el polígono más cercano.

## Datos y evidencias

- Respuestas: Google Sheets `FIBRAZO Forms - Base de datos`.
- Fotos: Google Drive.
- Máximo configurable: hasta 3 fotos por respuesta.
- Las respuestas offline se almacenan temporalmente en el dispositivo y se sincronizan al recuperar conexión.

## Acceso y seguridad

La configuración se administra desde **Administrar**.

Permisos:
- **Ver**: puede abrir el formulario.
- **Editar configuración**: puede cambiar estado, experiencia y evidencia; no modifica preguntas.
- **Permisos**: puede administrar accesos/publicación.
- **Base**: puede abrir la hoja de respuestas.

Los modos de acceso son `PRIVADO`, `CORREOS`, `DOMINIO` y `PUBLICO`.

## PWA y sesión

- PWA instalable con service worker.
- Cola offline persistente en IndexedDB.
- Firebase usa persistencia local.
- Ante fallas transitorias de red, puede reutilizar permisos previamente validados en el dispositivo durante un período acotado.

## Producción

Vercel: https://fibrazo-forms.vercel.app/

Versión: **0.8.6**

## Flujos

El mapa maestro se mantiene en:

`docs/FIBRAZO_Forms_Flujos.drawio`
