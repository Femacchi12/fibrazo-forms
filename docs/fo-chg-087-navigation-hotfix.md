# FO-CHG-087 · 22/10/2026 · ERR_FAILED al reabrir

Edu reportó que la PWA abrió una vez y falló al salir/reingresar. Se confirmó una regresión de FO-CHG-086: Vercel cleanUrls redirige /index.html a /. Cache.addAll guardaba esa respuesta con redirected=true bajo /index.html; el SW142 la devolvía a una navegación con redirect=manual y Chrome rechazaba la navegación con ERR_FAILED.

La prueba anterior servía /index.html directamente (HTTP200) y no reprodujo la redirección real del hosting. Se añade308 real al servidor de pruebas: SW142 reproduce el mismo ERR_FAILED; SW143 pasa las pruebas.

Corrección mínima: shell privado usa / como clave canónica; /index.html sale del precache. Se reconstruye toda respuesta de navegación mediante new Response para no arrastrar la marca redirected; se retiran content-encoding/content-length del cuerpo ya decodificado. El resto de assets, sesión Firebase, cola IndexedDB, reglas y payloads se conservan. Nueva caché: fibrazo-forms-v0.8.143-20261022-navigation087.

Verificación: regresión Forms completa; navegador con308 reproduce el defecto anterior; 143 recupera entrada con/sin conexión. Prueba de migración142→143 conserva una respuesta local y no crea duplicados. No se generan respuestas productivas de prueba. Pruebas: docs/check-offline-recovery-086.cjs y docs/check-navigation-recovery-087.cjs (fixture142 bajo docs/fixtures).

Recuperación: abrir con conexión el dominio oficial para permitir actualizar el servicio y volver a cargar. No borrar datos del sitio ni reinstalar: IndexedDB puede contener formularios aún no recibidos por el servidor. «Cola vacía» significa cero trabajos locales pendientes; nunca se confirmó ese estado en el teléfono del usuario desde el servidor.
