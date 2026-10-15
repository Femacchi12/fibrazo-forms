# FIBRAZO Forms · v0.8.14

Centro interno de formularios, relevamientos y resultados de FIBRAZO.

## Arquitectura

- **Forms** administra formularios, usuarios, permisos, respuestas originales, evidencias y seguridad.
- **Maestro Territorial Central** es el router geográfico único para ciudad/municipio y para seleccionar el archivo territorial de cada ciudad.
- **Bases territoriales por ciudad** contienen las capas canónicas de barrio, estrato, troncal y límite municipal.
- **Competencia** conserva la fuente maestra de operadores, ISP y presencia competitiva.
- Los **proyectos ciudad** pueden recibir resultados procesados cuando corresponde, sin reemplazar la respuesta original guardada en Forms.

La respuesta enviada por el usuario se conserva en `RESP_*`. El enriquecimiento territorial se registra en columnas independientes con estado, asignación exacta, polígono cercano y distancia.

## Fuente de verdad de las preguntas

Mientras no exista un editor/builder de preguntas en Administración, la configuración productiva de preguntas vive en:

`forms-config.js`

La hoja `PREGUNTAS` de Google Sheets se conserva como referencia histórica/documental y **no modifica el formulario productivo**.

## Formularios activos

- **Churn** — visitas a clientes que dejaron de recargar.
- **Exploración virtual** — Street View, infraestructura, operadores/ISP y enriquecimiento territorial por coordenadas.
- **Exploración presencial** — GPS, infraestructura, operadores/ISP y evidencia fotográfica.

## Geografía · Motor territorial v3.2

El enriquecimiento automático sigue una regla única:

- **DENTRO**: asigna el polígono exacto.
- **FUERA**: no asigna; informa el polígono canónico más cercano y la distancia al borde.
- **SIN_CAPA**: no existe una capa disponible.
- **SIN_CAPA_CANONICA**: existen datos, pero ninguno está habilitado como canónico.

La proximidad es contextual y nunca sustituye una pertenencia exacta.

El frontend consulta `/api/exploration`, y el backend vuelve a resolver la geografía al guardar la respuesta. De esta manera una respuesta offline o manipulada en el navegador no puede reemplazar el resultado territorial del servidor.

La integración usa:
- Maestro Central: `01_CIUDADES`.
- Archivo territorial seleccionado por el Maestro.
- `11_POLIGONOS_CIUDAD` para el ámbito municipal.
- `02_BARRIOS`, `03_ESTRATOS` y `04_TRONCALES` únicamente con `Preferida_Analisis=TRUE` y calidad oficial/validada cuando existe ese campo.

Las capas históricas o candidatas no se presentan como asignaciones automáticas.

## Trazabilidad de respuestas

`RESP_EXPLORACION` conserva las columnas históricas y agrega desde `AK`:
- versión territorial;
- ID de ciudad/catálogo y archivo territorial;
- estado, asignado, cercano y distancia para ciudad;
- estado, asignado, cercano y distancia para barrio;
- estado, asignado, cercano y distancia para estrato;
- estado, asignado, cercano y distancia para troncal.

El proyecto operativo **Bucaramanga-Exploración** se conserva como destino de sincronización para puntos AMB, pero ya no actúa como fuente geográfica.

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

Versión: **0.8.14**

## Flujos

El mapa maestro se mantiene en:

`docs/FIBRAZO_Forms_Flujos.drawio`


## QA preventivo — 14/10/2026 (no publicado en producción)
- Motor territorial v3.3 en rama QA: pertenencia exacta prioritaria; municipio cercano <=20 km, barrio/estrato <=5 km, troncal <=10 km; fallo de fuentes registrado y FUERA_COBERTURA sin suposiciones. Caché V2 con expiración de cinco minutos.
- Dashboard pendientes: GET /api/pending autenticado, única fuente FIBRAZO Forms - Automatizaciones y control / PENDIENTES; servidor 90 s, cliente 120 s; activos se cuentan, pausados se distinguen, cerrados se excluyen. Sin escrituras de estado ni fallback falso. Requiere validación E2E de permisos y lectura de cuenta de servicio.
- Cambios trazados en FO-CHG-030 (capas), FO-CHG-031 (territorial) y FO-CHG-032 (pendientes); documentación ampliada en docs/FLOW_SYNC.md y docs/brand-compliance-audit.md.


### FO-CHG-033 — Panel Capas compactado, estratos predeterminados y controles fijos (15/10/2026)
En QA, Estratos se inicia con 1, 2 y 3 seleccionados (estrato 0 no figura en las opciones). Se oculta el control Leaflet +/− preservando zoom por gestos. El panel se ancla arriba a la izquierda; abierto se cierra con «−» y contraído solo muestra «☰» para abrir. Se elimina arrastre del panel; Barrios/Estratos se representan como listas desplegables compactas con indicador, sin divisores repetidos, manteniendo búsqueda y selección múltiple. Cambios: map-v01.js, map-controls-ui.js, styles.css, index.html y service-worker.js. Solo rama feat/forms-map-qa-20261013; quedan pruebas visuales desktop/móvil y confirmación de publicación Preview READY; producción no tocada.
