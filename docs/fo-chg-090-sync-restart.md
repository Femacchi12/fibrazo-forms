# FO-CHG-090 · Recuperación de sincronización · 2026-10-22

Edu reporta cola que no avanza con Failed to fetch, señal 4G y un registro Enviando. No existe acceso remoto a la IndexedDB del teléfono: no se afirma cola vacía ni envío forzado desde el servidor. Logs Vercel: consulta rechazada 403; CLI no disponible.

Corrección: el timeout de fetch ahora abarca descarga/lectura JSON, no solamente cabeceras. Se añade Reiniciar sincronización al panel. Cancela solicitudes propias, espera cierre del ciclo y liberación del lease y reintenta manualmente. Conserva payload, fotos pendientes, propietario, ID original e idempotencia del servidor. No elimina registros ni roba el lease de otra pestaña/worker; si otro proceso está enviando muestra espera. Los tokens siguen acotados a 12 s; reinicio puede esperar ese límite. No garantiza recepción con una red caída. No modifica formularios, GPS ni consolidación.

Verificación: test:forms completo previo a publicación PASS; nueva regresión real fake-indexeddb reproduce cabeceras recibidas + cuerpo bloqueado, aborta desde reinicio, confirma mismo ID y datos, una sola entrada local, dos intentos. Endpoints simulados, sin enviar registros reales ni acceder al teléfono.

SW 145 conserva corrección de navegación 087 y GPS 089. Rollback: archivos seleccionados de commit padre 5159433f671e859debe869ad1f1edf549680f227, publicar nueva versión de caché; nunca borrar IndexedDB.
