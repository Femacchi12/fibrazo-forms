# FO-CHG-136 — Focus Group FIBRAZO · Cartagena (12/11/2026)

## Alcance
- Formulario público independiente: `/focus-group.html` (4 pasos, responsive), diseñado con Montserrat, negro #000 y verde #43FFA5 conforme VIS-021.
- Título: «Tu hogar, tu voz». Tema: hábitos y consumos de servicios del hogar.
- Convocatoria: Cartagena, 28 y 29 de noviembre 2026, sede por confirmar; reconocimiento económico de COP $100.000 por asistencia y finalización de sesión de 90 minutos. La preinscripción no asegura plaza.
- Perfil: mayores de 30 años, viviendas de estratos 3 a 6, decisores o codecisores, no clientes actuales de FIBRAZO.
- Datos de preinscripción: nombre, apellido, edad, celular repetido, correo opcional, barrio, dirección, estrato de factura de energía, condición de decisor, operador actual, disponibilidad, origen y aceptación de privacidad.
- Teléfono: 10 dígitos iniciados con 3, admite prefijo +57, espacios o guiones, se guarda como +57XXXXXXXXXX; ambos campos deben coincidir.
- Correo: `autocomplete=email`, validación sintáctica HTML y servidor, sin acceso silencioso a sesión del navegador. No se exige Google Sign-In.
- Aviso y consentimiento: https://www.fibrazo.com.co/privacy-policy/
- API nueva: `/api/focus-group` POST, validación servidor, honeypot, guarda en pestaña separada RESP_FOCUS_GROUP_2026 de la base existente de Forms; GET restringido a administradores base mediante token Firebase.
- Los datos no se envían al dashboard territorial, no se reutilizan para ventas y no se comparten públicamente.
- No se solicita documento de identidad en la preinscripción por minimización de datos.
- GPS opcional: la solicitud de permiso del navegador se dispara al enfocar el campo Dirección; se informa el uso en el texto de ayuda. Si acepta, coordenadas, precisión, fecha y estado se registran en columnas S:W. Si rechaza, el formulario sigue igual. La posición corresponde al dispositivo al responder, NO acredita la ubicación de la vivienda ni su estrato.
- Se agregó enlace al formulario dentro de `index.html` (dashboard autenticado). El público abre `/focus-group` sin autenticación.

## Corrección de despliegue — 12/11/2026
- Diagnóstico comprobado en Vercel: `exceeded_serverless_functions_per_deployment`; Hobby limita a 12 funciones. Los primeros despliegues de la función `api/focus-group.js` fallaron por exceder el límite.
- Se eliminó `api/focus-group.js` y se reutilizó `api/public.js`, conservando el endpoint público por rewrite. No se requiere upgrade de plan.

## Verificación pendiente
- Confirmar despliegue de Vercel READY asociado al commit de formulario.
- Probar accesibilidad en móvil y escritorio y POST de prueba con datos ficticios expresamente identificados como prueba (sin contaminar reclutamiento real).
- Verificar creación de la pestaña en Google Sheets, permisos de la cuenta de servicio, y la vista privada de respuestas para administradores.
- Revisar política de retención de candidatos y procedimiento para borrado posterior a la convocatoria.

## Riesgos
- La validación de un número telefónico es sintáctica, no OTP ni verificación de que la línea exista.
- Autocomplete del navegador solo propone correos conocidos localmente; no permite leer la cuenta Google del visitante.
- No afirmar publicación ni recepción correcta hasta QA end-to-end.
