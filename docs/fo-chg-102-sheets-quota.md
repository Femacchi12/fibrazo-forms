# FO-CHG-102 · Contención de cuota de lectura · 23/10/2026

Evidencia: captura móvil13:11 muestra GoogleSheets Read requests per minute per user excedida. Teléfono ya está en0.8.155 conAdministrar;22pendientes. En lectura nativa se confirma recepción deJoséAntonioGalán12:52 yNuevaGranada13:13COT. No se afirma que22pendientes estén ya recibidos ni se accedió al teléfono. Respaldo descargado reportado porEdu, todavía no inspeccionado.

Cambio mínimo operativo: _core agrupaFORMULARIOS,USUARIOS yPERMISOS_FORMULARIO en una consulta batchGet; comparte petición concurrente ycachea snapshot15segundos como máximo porinstancia. La autorización porusuario se sigue evaluando conlasfunciones existentes. No sirve permisos vencidos siSheets falla. Invalidación porgeneración evita repoblar caché conlectura previa aescritura; mutaciones deAdministración invalidan antes de releer. Otrasinstancias pueden conservar snapshot hasta15s; no haycaché distribuida ni promesa de eliminación total de429. Cambios directos enSheets sepropagan al expirar15s.

_territorial comparte solicitudes concurrentes de catálogo, municipios, bundle porarchivo ymetadatos porarchivo/capa. Mantiene TTLgeográfico10min existente, geometrías yreglas exactas. Errorlibera promesa para reintento; no agrega fallbackni asignación ficticia. No se cachean capturas ni respuestaspersonales enesta modificación.

Sin cambios frontend/SW, preguntas, coordenadas, precios, fotos, colas oestadoshistóricos. La mejora seaplica alas próximas peticiones backend sin borrar datos oexigir reinstalación. No cambia cuota deGoogle, planVercel niinfraestructura. Optimización general aplazada hasta acabar el relevamiento segúnEdu.

Validación: suitecompleta test:forms yregresión102:60consumidores concurrentes deconfiguración→1lectura; permisos porusuario conservados; expiración conerror falla cerrado; recuperación y invalidación;20lecturas territoriales simultáneas→1lectura; fallos liberan. No es medición deproducción ni prueba físicaAndroid. Publicación/dominio secomprueban alcerrar.

Reversión:8b031618c7743ef4b5d239e3412206d0d0aa3ccf. No tocar IndexedDB ni respaldo.
