# FIBRAZO Forms · MVP 0.1

Centro de formularios y relevamientos de FIBRAZO.

## Diseño
La interfaz replica la lógica visual del Dashboard de Impacto Social: Inter, fondo negro, superficies carbón, verde FIBRAZO `#00f29a`, controles compactos, paneles de 14 px y jerarquías equivalentes.

## Formularios
- **Churn** — Sincelejo / Montería, con preguntas condicionales.
- **Exploración** — infraestructura, operadores, GPS y hasta 3 fotos.

## Datos
Google Sheet: `1eBp7jwvRbY76z0Sfo-fi45PgyP91aGM4wn7L0w_Za7g`

Fotos Churn: `1TjeivEUFO3qBrelBSPQWPTyjlZBOYlJA`

Fotos Exploración: `13pukWwj7xEOoAKiIvVoSec9oFNXeqcj0`

## GitHub Pages
URL prevista: `https://femacchi12.github.io/fibrazo-forms/`

En GitHub Pages las respuestas se guardan en `localStorage` para utilizar el sitio como vista previa sin aparentar una escritura real en Google Sheets.

## Backend Vercel
El repositorio incluye una API serverless en `api/submissions.js`.

Variables requeridas: ver `.env.example`.

Para habilitar escritura real:
1. Conectar el repositorio a Vercel.
2. Configurar las variables de entorno.
3. Compartir el Sheet y las carpetas de fotos con la cuenta de servicio de Google.
4. Validar una respuesta de Churn y una de Exploración desde celular.

## Estado
- Frontend: preparado.
- GitHub Pages: configuración en curso.
- Backend: preparado para Vercel.
- Google Sheets / Drive: estructuras creadas.
