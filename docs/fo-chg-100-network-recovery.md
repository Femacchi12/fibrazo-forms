# FO-CHG-100 · Recuperación de conexión · 23/10/2026

Problema informado por Edu: desaparece Administración y no hay ciudades aunque GPS y mapa base funcionan. El código ocultaba Administración ante cualquier fallo de su única consulta y el catálogo solo se solicitaba al abrir el mapa, sin caché ni reintento. Las capturas son compatibles con ese comportamiento; no se accedió a la sesión ni a los logs del teléfono para atribuir una causa concreta de red.

Cambios: Administración distingue rechazo403 de falla temporal; conserva navegación según capacidades verificadas para la misma cuenta, acota token/red/JSON a12s y reintenta con exclusión de llamadas simultáneas. Eventos online/focus/visible/access-ready y tick30s recuperan consultas fallidas.403 real sigue ocultando acceso y el servidor conserva autorización de lectura/escritura. Un403 de alguien no administrador no navega fuera de Mapa.

Ciudades: una consulta en vuelo, caché por correo hasta7d para continuidad, reintento30s visible con red, errores visibles, descarte de otra cuenta.401/403 eliminan copia; no se crean nombres ni se supone ubicación por cercanía. Actualizar consulta catálogo; recuperación GPS si no existe selección, sin reemplazar selección manual. Se conserva deadline25s del mapa y el filtro por ciudad099. Se restaura meta de permisos en fallback de app.

Cabecera y pie alineados con SW0.8.155/tag20261023-recovery100, motor3.5. Los números0.8.90/0.8.91 de las capturas eran textos estáticos antiguos: no prueban por sí solos una caché antigua.

Validación: test:forms completo y check-network-recovery-100.cjs (funciones reales en contexto simulado: red fallida, recuperación,403, token bloqueado, cuenta distinta, catálogo persistente y borrado por rechazo). No se afirma prueba físicaAndroid ni acceso a pendientes del teléfono. Publicación y estado se verifican al completar.

Sin cambios en encuestas, precios, coordenadas, evidencias, permisos de servidor ni colas. Reversión:6e7da4ac5b23b2c63b6b42190b5f5023069eda3b con nuevo identificadorSW; nunca borrar IndexedDB.
