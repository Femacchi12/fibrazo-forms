# FO-CHG-137 — Focus Group FIBRAZO · mejoras de convocatoria (12/11/2026)

## Contexto y decisiones
Investigación de hábitos y consumo de servicios del hogar, Cartagena. 4 sesiones, 8 personas nominalmente por grupo; mayores de 30 **inclusive** (edad >=30), estrato de vivienda 3 a 6, decisores o codecisores y NO clientes actuales FIBRAZO. Fechas previstas 28–29/11/2026; incentivo $100.000 COP tras asistir y completar 90 minutos.

## Cambios de UX
- Encabezado «fibrazo · ESTUDIO DE OPINIÓN», descripción explícita de reunión moderada de 6–10 personas, duración, requisitos e incentivo.
- Sede propuesta: Institución Educativa Las Gaviotas (sede principal), Transversal 65 #31-111, Cartagena. Aún sujeta a autorización. Enlace Google Maps. No declarar reserva.
- Formulario público adaptativo, cuatro pasos y enlace desde Forms con tarjeta nativa del listado, icono 💬, acciones «Abrir» y «Ver detalles».
- Etiquetas «Nombres» y «Apellidos»; edad 30 incluida en UI y servidor.
- Validación por campo: campos requeridos, correo electrónico, edad, teléfono colombiano (10 dígitos que comienzan en 3), confirmación de celular, operadores y decisor. Los errores se marcan en rojo y se explican junto al campo, además del resumen.
- Finalización: nueva preinscripción, compartir mediante Web Share API cuando esté disponible, copiar enlace al portapapeles.
- Geolocalización del dispositivo sigue siendo opcional, solicitada mediante permiso del navegador al activar dirección y con descripción del tratamiento; persistencia en columnas S:W sin exposición pública. No presume que sea la dirección del hogar ni se utiliza para inferir automáticamente estrato.

## Prueba de base
En la base canónica FIBRAZO Forms - Base de datos operativa, pestaña RESP_FOCUS_GROUP_2026, se comprobó 1 inscripción con GPS «Autorizado» y coordenadas almacenadas (sin reproducir datos personales). Esta evidencia no sustituye QA funcional integral de la nueva versión.

## Notificaciones
Se agregó el código `docs/FOCUS_GROUP_AVISOS_GMAIL.gs`, diseñado como trigger TEMPORIZADO cada minuto en Google Apps Script de la hoja corporativa, porque las escrituras de Sheets API no disparan onEdit/onChange. Envía un mensaje al correo eduardo@fibrazo.com por cada nueva fila (ID y hora, sin datos personales), con marcador de última fila procesada. **No está activado** hasta que alguien vincule ese script al Sheet y ejecute `instalarAvisosFocusGroup` en la cuenta corporativa, autorizando MailApp. No afirmar que los avisos están funcionando antes de esa autorización y prueba.

## QA / pendientes
- Despliegue final Vercel READY y commit asociado.
- Revisión visual móvil/escritorio, prueba de errores por campo y prueba de enlace Maps.
- Envío E2E con datos de prueba claramente identificados y comprobación de GPS rechazado/autorizado (sin contaminar datos reales de convocatoria).
- Activación/autorización del script de correos y comprobación con correo de prueba.
- Política de retención/borrado y acceso a datos personales.
- Sede aún pendiente de autorización de colegio.

## Ajuste de texto — 12/11/2026
- Invitación separada en párrafos: requisitos, dinámica moderada (6–10 personas), duración, incentivo y aclaración de que no es actividad de ventas; referencia a decisiones «sobre los servicios del hogar».
- Enlace a Maps visualmente secundario, más pequeño y discreto; sede continúa pendiente de autorización.
- Ayuda bajo Dirección reducida a «Usaremos tu dirección para organizar la convocatoria.» La transparencia sobre la ubicación opcional se conserva en el encabezado del paso «Tu barrio y tu hogar» y en el consentimiento final. No se alteró el flujo de solicitud de GPS.

## Control de publicación y botón Copiar — 13/11/2026

- Botón Copiar del Focus Group reutiliza las mismas clases CSS, funcionalidad y señal transitoria «✓ Copiado» de los demás formularios.
- La página pública `/focus-group` no requiere cuenta Google ni autenticación mientras esté habilitada; no se solicita acceso al dashboard al participante.
- Nuevo control de administración para administradores base de FIBRAZO Forms: abrir/cerrar la convocatoria mediante `/api/focus-group?manage=1` con Firebase ID Token, validación de permisos en el servidor. El switch se muestra en **Administrar → Formularios activos → Focus Group · Tu hogar, tu voz**.
- Estado canónico: celda `Y2` de `RESP_FOCUS_GROUP_2026` en la hoja corporativa, encabezado `Y1` = `PUBLIC_ENABLED`. Valor TRUE/FALSE. Predeterminado TRUE cuando aún no fue configurado.
- Endpoint anónimo `GET /api/focus-group?config=1` retorna exclusivamente `publicEnabled`, sin datos personales, y con `Cache-Control: no-store`.
- Con publicación desactivada se oculta la inscripción en la página pública, se muestra aviso de convocatoria cerrada y **el POST es rechazado con HTTP 403 del lado del servidor**, aun si alguien intenta enviar una solicitud manual. Los registros históricos permanecen.
- La tarjeta del listado de formularios muestra PÚBLICO / CERRADO según lectura del estado.
- No se ha usado una nueva Serverless Function: se reutiliza `api/public.js` con helper `api/_focus-group.js`; conserva compatibilidad plan Vercel Hobby.
- QA pendiente: login como administrador, activar/desactivar, probar pantalla y POST desactivado, reactivar y verificar.
