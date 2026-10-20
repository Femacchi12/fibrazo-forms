# Referencia visual de formularios · FO-CHG-078

Regla común solicitada por Edu el 19/10/2026 (COT): etiquetas 17 px / peso 650; valores 16 px / peso 450; ayudas 12 px. Campo de una línea: mínimo 40 px, 44 px en puntero táctil; textarea mínimo 76 px. Mantener texto de entrada en 16 px para legibilidad y evitar zoom automático móvil. Aplicar mediante forms-field-scale.css en acceso autenticado y público.

Municipio, barrio y estrato: label arriba, campo y Copiar en la misma fila (minmax(0,1fr) auto), ayudas y errores debajo. GPS ejecutivo y coordenadas: dato y acciones en la misma fila. Operadores mantienen toggle compacto y etiqueta con la escala común. No reducir objetivos táctiles por debajo de 44 px.

Ícono PWA v7: derivado visual de referencias enviadas por Edu mediante generación/edición de imagen; fbz más separado y punto sobre el cuerpo de b. PNG 192 y 512, sin dependencia de fuentes del sistema. El resultado es una adaptación para PWA, no un nuevo logo maestro. Manifest y caché versionados. La actualización del ícono instalado depende de Chrome/Android; no certificar el cambio físico hasta verlo en el teléfono.

Fuentes rectoras: https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit . Trazabilidad: Manual y Changelog centrales de FIBRAZO Forms. Código listo; cierre de despliegue y verificación se registran en esas fuentes.

## FO-CHG-079 · Compactación adicional · 19/10/2026 22:20 COT

Por nueva solicitud de Edu, esta escala reemplaza los tamaños FO-CHG-078: etiquetas 17 px; respuestas 14 px; ayuda 11 px; campos de una línea mínimo 34 px (38 px en puntero táctil); textarea mínimo 64 px. Copiar/acciones GPS: texto 11 px, caja visible 30 px (32 px táctil), con pseudo-elemento transparente que amplía la zona de pulsación a 44 px. Opciones 14 px; segmentados mínimo32 px; Sí/No operador 48×30 px (32 px táctil). No se fuerza tipografía de entrada 16 px: prevalece el nuevo tamaño aprobado de 14 px. Revisar comportamiento en cada dispositivo; no desactivar zoom del navegador. Mismo CSS en todos los formularios y rutas públicas. Se conservan títulos, disposición en línea, lógica y datos.
