#!/usr/bin/env node
// QA geométrica del rediseño de las cuatro páginas de formularios.
import fs from "node:fs";

const xml = fs.readFileSync(new URL("./FIBRAZO_Forms_Flujos.drawio", import.meta.url), "utf8");
const manifest = JSON.parse(
  fs.readFileSync(new URL("./flow-sync-manifest.json", import.meta.url), "utf8"),
);
const errors = [];
const formPrefixes = {
  CHURN: "sync_churn",
  EXPLORACION: "sync_exploracion",
  EXPLORACION_PRESENCIAL: "sync_exploracion_presencial",
  INTELIGENCIA_OPERADOR: "sync_inteligencia_operador",
};

const attrs = (source) =>
  Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

for (const [formId, form] of Object.entries(manifest.forms)) {
  const pageMatch = [...xml.matchAll(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g)].find(
    (match) => attrs(match[1]).name === form.page,
  );
  if (!pageMatch) {
    errors.push(`${formId}: falta la página ${form.page}`);
    continue;
  }
  const content = pageMatch[2];
  const model = attrs(content.match(/<mxGraphModel\b([^>]*)>/)?.[1] || "");
  const pageWidth = Number(model.pageWidth || 0);
  const pageHeight = Number(model.pageHeight || 0);
  if (pageWidth !== 3000) errors.push(`${formId}: ancho esperado 3000, recibido ${pageWidth}`);
  if (pageHeight < 3000) errors.push(`${formId}: alto insuficiente ${pageHeight}`);

  const vertices = [...content.matchAll(/<mxCell\b([^>]*\bvertex="1"[^>]*)>([\s\S]*?)<\/mxCell>/g)].map(
    (match) => {
      const cell = attrs(match[1]);
      const geometry = attrs(match[2].match(/<mxGeometry\b([^>]*)\/>/)?.[1] || "");
      return {
        id: cell.id || "",
        style: cell.style || "",
        x: Number(geometry.x || 0),
        y: Number(geometry.y || 0),
        width: Number(geometry.width || 0),
        height: Number(geometry.height || 0),
      };
    },
  );
  const ids = new Set(vertices.map((vertex) => vertex.id));
  for (const suffix of ["title", "reading", "qa_bg", "delivery_bg"]) {
    const expected = `layout_${formId}_${suffix}`;
    if (!ids.has(expected)) errors.push(`${formId}: falta ${expected}`);
  }

  for (const vertex of vertices) {
    if (vertex.width <= 0 || vertex.height <= 0) errors.push(`${formId}: ${vertex.id} sin tamaño útil`);
    if (
      vertex.x < 0 ||
      vertex.y < 0 ||
      vertex.x + vertex.width > pageWidth ||
      vertex.y + vertex.height > pageHeight
    ) {
      errors.push(`${formId}: ${vertex.id} queda fuera del lienzo`);
    }
  }

  const prefix = formPrefixes[formId];
  const fields = vertices.filter((vertex) => vertex.id.startsWith(`${prefix}_field_`));
  for (const field of fields) {
    if (field.width < 600) errors.push(`${formId}: ${field.id} conserva ancho estrecho (${field.width})`);
    const fontSize = Number(field.style.match(/(?:^|;)fontSize=(\d+)/)?.[1] || 0);
    if (fontSize < 13) errors.push(`${formId}: ${field.id} usa tipografía menor a 13 px`);
  }

  const foreground = vertices.filter((vertex) => !vertex.id.startsWith("layout_"));
  for (let i = 0; i < foreground.length; i += 1) {
    for (let j = i + 1; j < foreground.length; j += 1) {
      if (overlaps(foreground[i], foreground[j])) {
        errors.push(`${formId}: superposición entre ${foreground[i].id} y ${foreground[j].id}`);
      }
    }
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    "FIBRAZO FLOW_LAYOUT · 4 páginas · ancho ampliado · campos legibles · sin solapamientos geométricos.",
  );
}
