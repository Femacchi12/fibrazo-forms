/**
 * FIBRAZO Focus Group — avisos por cada preinscripción registrada.
 * Vincular este script a "FIBRAZO Forms - Base de datos operativa" usando
 * la cuenta eduardo@fibrazo.com (Extensiones > Apps Script).
 * EJECUTAR instalarAvisosFocusGroup una sola vez y autorizar.
 * Se ejecuta cada minuto, porque los cambios efectuados por Sheets API
 * NO activan automáticamente los triggers onEdit/onChange.
 * No incluye datos personales de participantes en los emails.
 */
const FG_TAB = 'RESP_FOCUS_GROUP_2026';
const FG_RECIPIENT = 'eduardo@fibrazo.com';
const FG_LINK = 'https://docs.google.com/spreadsheets/d/1E66QjQVPT61j-2MdyL3V6s9iXKaX15wBKOujga8p4SY/edit#gid=171767959';
const FG_PROPERTY = 'FOCUS_GROUP_LAST_NOTIFIED_ROW_2026';

function instalarAvisosFocusGroup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(FG_TAB)) throw new Error('No existe ' + FG_TAB);
  const props = PropertiesService.getScriptProperties();
  const last = ss.getSheetByName(FG_TAB).getLastRow();
  props.setProperty(FG_PROPERTY, String(last)); // ignora históricos al habilitar
  ScriptApp.getProjectTriggers()
    .filter(t=>t.getHandlerFunction()==='notificarNuevasInscripcionesFocusGroup')
    .forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('notificarNuevasInscripcionesFocusGroup').timeBased().everyMinutes(1).create();
}

function notificarNuevasInscripcionesFocusGroup() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FG_TAB);
    if (!sheet) throw new Error('Hoja no encontrada');
    const props = PropertiesService.getScriptProperties();
    let processed = Number(props.getProperty(FG_PROPERTY) || 1);
    if (!Number.isSafeInteger(processed) || processed < 1) processed = 1;
    const last = sheet.getLastRow();
    if (last <= processed) return;
    for (let row = processed + 1; row <= last; row++) {
      const [date, id] = sheet.getRange(row, 1, 1, 2).getValues()[0];
      if (!id) {
        props.setProperty(FG_PROPERTY, String(row));
        continue;
      }
      MailApp.sendEmail({
        to: FG_RECIPIENT,
        subject: 'FIBRAZO Focus Group · nueva preinscripción ' + String(id),
        body: 'Se registró una nueva preinscripción en Focus Group FIBRAZO.\n' +
          'Referencia: ' + String(id) + '\n' +
          'Fecha: ' + (date instanceof Date ? date.toISOString() : String(date)) + '\n\n' +
          'Revisar los datos en la base corporativa autorizada:\n' + FG_LINK +
          '\n\nEste aviso no incluye información personal del participante.'
      });
      props.setProperty(FG_PROPERTY, String(row)); // avanzar solo tras envío exitoso
    }
  } finally {
    lock.releaseLock();
  }
}
