# FO-CHG-107 · Asistente de consulta en los dos dashboards

Autorizado por Edu el 24 de octubre de 2026. Forms 0.8.160.

## Comportamiento

Botón «Consultar datos» para sesiones iniciadas. Componente compartido por Forms/exploración y competencia. Permite seleccionar ciudad, escribir preguntas y usar botones de consulta básica sin llamadas de IA. Contexto de ciudad y corte de la última pregunta; una ciudad elegida reinicia ese contexto. Conversación temporal, se vacía al cambiar/cerrar sesión. Las respuestas se construyen a partir de cálculos del servidor: el modelo interpreta filtros, no calcula estadísticas ni recibe registros individuales, fotos, coordenadas o correos.

- Exploración: registros únicos recibidos, pruebas excluidas, estrato observado prioritario, referencia cercana explícita, operadores por estrato y notas de alcance. Usuarios sin rol administrador ven únicamente sus registros y formularios autorizados.
- Competencia: presencia consolidada por ciudad y corte, ofertas mensuales de Internet sin TV por defecto; promoción y paquetes son categorías separadas. Último corte disponible por ciudad si no se pide otro. Precio cero, vacío, vencido y modalidad diaria excluidos. Ofertas «Por validar» conservan esa etiqueta. No se afirma vigencia comercial ni cuota de mercado.
- Las preguntas de precios por operador o estrato se explican como fuera del alcance de la primera versión; nunca se aplican silenciosamente filtros incompletos.
- No ejecuta cambios. Fuentes enlazadas a las filas de Sheets, fecha de lectura visible. Caché del conjunto de datos de 120 segundos, permisos verificados antes de servirlo. El catálogo no muestra ciudades de registros ajenos en exploración.

## Integración y consumo

Ruta `GET/POST /api/access?chat=1`, reutiliza una función existente (no aumenta el límite de 12 funciones). CORS solo dominio oficial y origen GitHub Pages de competencia. Token Firebase verificado por servidor, autorización por formulario; competencia exige acceso a Inteligencia de operadores. Preflight no lee datos. Sin caché HTTP de respuestas.

AI SDK 7.0.153, modelo Gateway `openai/gpt-5.4-mini`, comprobado en `/v1/models` el 24/10/2026. OIDC automático de Vercel o `AI_GATEWAY_API_KEY`; modelo modificable con `AI_GATEWAY_MODEL`. No se crea cuenta, clave, recarga ni pago automático. Si no hay autenticación, crédito o disponibilidad del proveedor, funciona la clasificación básica y se informa de ese modo. La presencia de un token no prueba que exista crédito.

Máximo 1200 caracteres por pregunta, 600 tokens de salida, una llamada de IA, sin reintentos automáticos y timeout de 10 segundos para interpretación. Intentos reservados de forma persistente con un contador diario COT y lease de Sheets: 20 por usuario, 100 globales. También cuentan los intentos fallidos. Son límites de solicitudes, no un presupuesto exacto en dólares. Botones básicos no consumen IA. Contadores sin correo ni pregunta en metadatos.

Metadatos en Forms: `2082107 / FIBRAZO_CHAT_LEASE_107` temporal, `2082108 / FIBRAZO_CHAT_ATTEMPTS_107` persistente. No se modifica el contenido de las respuestas de campo.

## Validación

Pruebas de prioridad manual, deduplicación, exclusión de QA, permisos por usuario/formulario, origen CORS, comparación de precio regular/promocional, corte más reciente, exclusión de ofertas vencidas/diarias, concurrencia y límites persistentes. Prueba visual del componente en escritorio y móvil con respuestas controladas. Flujo de login y petición real a Gateway debe distinguirse de pruebas con sesión simulada.

Reversión: quitar los dos tags de `dashboard-chat.js` de los índices; el resto del relevamiento funciona de manera independiente. No borrar IndexedDB, pendientes ni almacenamiento del teléfono.
