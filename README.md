# FIBRAZO Forms · MVP 0.1

Centro de formularios y relevamientos de FIBRAZO.

## Diseño
La interfaz replica la lógica visual del Dashboard de Impacto Social: Inter, fondo negro, superficies carbón, verde FIBRAZO `#00f29a`, controles compactos, paneles de 14 px y jerarquías equivalentes.

## Formularios
- **Churn** — Sincelejo / Montería, con preguntas condicionales.
- **Exploración** — infraestructura, operadores, GPS y hasta 3 fotos.

## Datos
Las respuestas se almacenan en Google Sheets y las evidencias fotográficas en Google Drive.

Los IDs reales y credenciales no se publican en el repositorio. Se cargan como variables privadas del entorno de despliegue.

## GitHub Pages
URL prevista: `https://femacchi12.github.io/fibrazo-forms/`

En GitHub Pages las respuestas se guardan únicamente en `localStorage`; esta publicación funciona como vista previa del frontend.

## Backend Vercel
El repositorio incluye una API serverless en `api/submissions.js`.

Variables requeridas: ver `.env.example`.

Para habilitar escritura real:
1. Conectar el repositorio a Vercel.
2. Configurar las variables de entorno con los valores reales.
3. Compartir el Sheet y las carpetas de fotos con la cuenta de servicio de Google.
4. Validar una respuesta de Churn y una de Exploración desde celular.

## Estado
- Frontend: v0.3 con permisos y formularios públicos.
- GitHub Pages: requiere activación inicial del repositorio.
- Backend: preparado para Vercel.
- Google Sheets / Drive: estructuras creadas.


## Flujos draw.io
El mapa maestro vive versionado junto al código:

`docs/FIBRAZO_Forms_Flujos.drawio`

Abrir/editar directamente en diagrams.net:

`https://app.diagrams.net/?mode=github#HFemacchi12%2Ffibrazo-forms%2Fmain%2Fdocs%2FFIBRAZO_Forms_Flujos.drawio`

Cada formulario debe conservar su propia página dentro del archivo y actualizarse en el mismo cambio que modifique su lógica.

## Seguridad por formulario
La configuración se administra desde **Administrar → Formularios → Permisos** y se persiste en la hoja `FORMULARIOS`.

Modos:
- `PRIVADO`: solo administradores.
- `CORREOS`: lista explícita de correos.
- `DOMINIO`: dominio autorizado.
- `PUBLICO`: acceso directo mediante `/f/<slug>` sin exponer dashboard ni resultados.

Los formularios públicos aplican validación del backend, honeypot, ventana mínima de llenado, rate limit por huella de IP, límites de cantidad/tamaño de fotos y registro en `SECURITY_LOG`.
