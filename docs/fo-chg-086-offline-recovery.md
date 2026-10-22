# FO-CHG-086 · 22/10/2026 · Villavicencio / preparación Neiva

Edu autoriza revisar sincronización, mejorar acceso offline, contraer «Ver estados» y publicar en producción. Base de partida: c1e989599081f357885b77b346f7b93a090ee360 (FO-CHG-084). No se crean respuestas productivas de prueba ni se borra IndexedDB.

## Auditoría de datos recibidos

Lectura nativa de Forms y seis tablas de Competencia, con valores UNFORMATTED_VALUE para conservar coordenadas completas. 370 respuestas reales elegibles: 306 exploraciones y64 fichas técnicas. Materializaciones:370 relevamientos EXF,370 evidencias FZF,1346 observaciones FZO y791 presencias CVF. El mismo buildPlan que usa producción calcula cero cambios en las seis tablas. No fue necesario reescribirlas.

Villavicencio:146 exploraciones reales y40 fichas técnicas, total186; todos tienen relevamiento/evidencia derivados.178 contienen fotos,8 no las tienen (opcionales). Tres fichas técnicas históricas siguen sin GPS; no se inventa la coordenada. No hay IDs de exploración duplicados. Siete exploraciones QA de Villavicencio se excluyen de los186 reales. Los dos puntos cercanos RODEO se conservan como visitas diferentes.

Entre00:04 y00:07 del22/10 hora Colombia se recibieron cinco exploraciones y tres fichas de Villavicencio. Son ocho recepciones verificables en servidor; el «aproximadamente14» mostrado por el teléfono pudo incluir envíos ya recibidos pendientes de consolidación/reintento. No afirmar equivalencia exacta ni cola local vacía sin leer ese dispositivo. La base no puede inventariar registros que solo existen en IndexedDB del teléfono.

## Causas y correcciones

La cola anterior solo avanzaba con la página ejecutándose. Se añade Background Sync `fibrazo-queue-v1` en el service worker, usando la misma cola IndexedDB v1, el mismo lease transaccional, los mismos IDs idempotentes y las mismas políticas territoriales/QA. No se copian credenciales a payloads ni al código: Firebase Auth restaura su sesión persistida, y la API conserva las validaciones de usuario/permisos. El SDK compat12.19.0 pasa de CDN a archivos locales fijados, compartidos por página y worker.

El worker procesa lotes de hasta3 registros, con presupuesto de25s antes de iniciar otro; un registro en vuelo mantiene sus propios timeouts. Vuelve a registrar el evento si queda otro lote; errores rechazan waitUntil para permitir el reintento del navegador. Los reintentos comparten el lease con páginas abiertas. Un cambio de cuenta se comprueba antes y después de obtener el token. Conserva fotos y snapshot hasta confirmación del servidor. Los recibidos con revisión territorial (`sent_master_pending`) siguen bajo su revisión existente, sin recreación automática.

Android/Chrome pueden aplazar eventos por ahorro de batería, cierre forzado, permisos o límites del navegador; no es un servicio permanente ni un envío garantizado al instante. Si Background Sync no está disponible, siguen funcionando apertura, foco, retorno visible, evento online, temporizador y botón manual. Un aviso compacto amarillo junto a pendientes explica el guardado local y la recuperación al abrir.

El SW anterior esperaba la red para HTML y scripts sin límite. Ahora sirve primero el shell de la caché instalada atómicamente para su versión; soporta rutas privadas y públicas, normaliza consultas de versión solo para assets conocidos del shell y no reutiliza cachés antiguas. Las peticiones que necesitan red tienen timeout; APIs autenticadas y manejador Firebase no se cachean. Se conserva actualización del SW sin recargar a la fuerza un formulario abierto. Fuentes tipográficas opcionales cargan sin bloquear. Una sesión con permisos locales vigentes (misma cuenta, máximo7d) abre enseguida mientras se revalida; denegación403 sigue cerrando acceso. Primera autorización y renovación vencida necesitan conexión.

«Ver estados» se contrae al abrir/salir/cambiar formulario, click o foco fuera del bloque y Escape. Las interacciones dentro del historial conservan su expansión. No altera las respuestas.

## Pruebas y límites de evidencia

- Regresión `npm run test:forms`: completa, incluidos20 casos de cola persistente y22 aserciones de consolidación.
- `docs/check-offline-recovery-086.cjs`: Chromium local, servidor y credenciales ficticias. Cambio/salida/reentrada del historial; permiso de red retenido sin bloquear dashboard; recarga offline y entrada al formulario (~70ms en fixture); cinco registros procesados por worker sin ventanas abiertas en lotes; manuales preservados.
- SDK Firebase real fijado: sesión creada contra emulador REST local de prueba, persistida en IndexedDB desde página y restaurada por el worker con el mismo propietario. No se usa la identidad real de Edu.
- El evento sync se despacha en el worker real de Chromium; la reinscripción se simula porque Background Sync está deshabilitado en el navegador de pruebas. No equivale a certificar la planificación del Android físico. Requiere instalar el nuevo SW con conexión y reabrir la PWA para usar el nuevo shell.

Reproducir navegador: instalar Playwright1.56.1 en entorno de pruebas, Chromium correspondiente y ejecutar desde raíz `node docs/check-offline-recovery-086.cjs`. No incorpora Playwright al bundle productivo.

Fuentes: https://firebase.google.com/docs/auth/web/service-worker-sessions y https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API .

Rollback: restaurar los archivos modificados al commit084 y aumentar la versión SW. Preservar la cola IndexedDB y las sesiones; nunca limpiar datos del sitio para resolver una sincronización. El esquema de datos y los payloads permanecen compatibles.
