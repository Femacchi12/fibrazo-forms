#!/usr/bin/env node
// Reorganiza únicamente la presentación de las cuatro páginas de formularios.
// Conserva IDs, textos funcionales, conexiones y marcadores de sincronización.
import fs from "node:fs";

const diagramPath = new URL("./FIBRAZO_Forms_Flujos.drawio", import.meta.url);
const manifestPath = new URL("./flow-sync-manifest.json", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let xml = fs.readFileSync(diagramPath, "utf8");

const PAGE_WIDTH = 3000;
const LEFT = 120;
const RIGHT = 1540;
const PANEL_WIDTH = 1340;
const FIELD_WIDTH = 620;
const FORM_PAGES = {
  CHURN: { prefix: "sync_churn", qa: "qa_churn" },
  EXPLORACION: { prefix: "sync_exploracion", qa: "qa_exploracion" },
  EXPLORACION_PRESENCIAL: {
    prefix: "sync_exploracion_presencial",
    qa: "qa_exploracion_presencial",
  },
  INTELIGENCIA_OPERADOR: {
    prefix: "sync_inteligencia_operador",
    qa: "qa_inteligencia_operador",
  },
};

const styles = {
  title:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=30;fillColor=#070A09;strokeColor=#43FFA5;strokeWidth=3;fontColor=#FFFFFF;fontStyle=1;fontSize=24;",
  reading:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=22;spacingRight=22;fillColor=#EAFBF3;strokeColor=#87DDB5;strokeWidth=2;fontColor=#10241B;fontSize=14;",
  zone:
    "rounded=1;arcSize=14;html=1;whiteSpace=wrap;fillColor=#F7FBF9;strokeColor=#D5E6DE;strokeWidth=2;fontColor=#10241B;",
  zoneTitle:
    "rounded=1;arcSize=18;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=18;fillColor=#DDF8EB;strokeColor=#43C986;strokeWidth=2;fontColor=#10241B;fontStyle=1;fontSize=15;",
  section:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=22;fillColor=#070A09;strokeColor=#43FFA5;strokeWidth=3;fontColor=#FFFFFF;fontStyle=1;fontSize=17;",
  step:
    "rounded=1;arcSize=50;html=1;whiteSpace=wrap;fillColor=#43FFA5;strokeColor=#070A09;strokeWidth=2;fontColor=#070A09;fontStyle=1;fontSize=14;",
  field:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=16;spacingRight=16;fillColor=#FFFFFF;strokeColor=#B9CCC2;strokeWidth=2;fontColor=#101614;fontSize=13;",
  conditionalField:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=16;spacingRight=16;fillColor=#FFF8E6;strokeColor=#FFB600;strokeWidth=2;fontColor=#241C08;fontSize=13;",
  start:
    "ellipse;html=1;whiteSpace=wrap;fillColor=#43FFA5;strokeColor=#070A09;strokeWidth=2;fontColor=#070A09;fontStyle=1;fontSize=15;",
  decision:
    "rhombus;html=1;whiteSpace=wrap;fillColor=#FFF0BF;strokeColor=#E49B00;strokeWidth=3;fontColor=#241C08;fontStyle=1;fontSize=13;",
  branchYes:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=16;spacingRight=16;fillColor=#EAFBF3;strokeColor=#34B878;strokeWidth=2;fontColor=#10241B;fontSize=13;",
  branchNo:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=16;spacingRight=16;fillColor=#F4F6F5;strokeColor=#A7B1AC;strokeWidth=2;fontColor=#303834;fontSize=13;",
  join:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#6E7C75;strokeWidth=2;fontColor=#18201C;fontStyle=1;fontSize=13;",
  qaDecision:
    "rhombus;html=1;whiteSpace=wrap;fillColor=#E8F7FF;strokeColor=#2489C5;strokeWidth=3;fontColor=#0B2738;fontStyle=1;fontSize=13;",
  qaNormal:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=18;fillColor=#EAFBF3;strokeColor=#34B878;strokeWidth=2;fontColor=#10241B;fontSize=13;",
  qaTest:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=18;fillColor=#FFF4D4;strokeColor=#FFB600;strokeWidth=2;fontColor=#241C08;fontSize=13;",
  review:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#E8F7FF;strokeColor=#2489C5;strokeWidth=3;fontColor=#0B2738;fontStyle=1;fontSize=14;",
  fix:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#FFF4D4;strokeColor=#FFB600;strokeWidth=2;fontColor=#241C08;fontSize=13;",
  submit:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#070A09;strokeColor=#43FFA5;strokeWidth=3;fontColor=#FFFFFF;fontStyle=1;fontSize=14;",
  success:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#EAFBF3;strokeColor=#34B878;strokeWidth=2;fontColor=#10241B;fontStyle=1;fontSize=13;",
  queue:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#FFF4D4;strokeColor=#FFB600;strokeWidth=2;fontColor=#241C08;fontStyle=1;fontSize=13;",
  fail:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;fillColor=#FFECEC;strokeColor=#D95151;strokeWidth=2;fontColor=#4A1111;fontStyle=1;fontSize=13;",
  warning:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=18;spacingRight=18;fillColor=#FFF0F0;strokeColor=#D95151;strokeWidth=3;fontColor=#4A1111;fontStyle=1;fontSize=13;",
  guide:
    "rounded=1;arcSize=12;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=22;spacingRight=22;fillColor=#111916;strokeColor=#6C8177;strokeWidth=2;fontColor=#FFFFFF;fontSize=13;",
  edgeMain:
    "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;rounded=1;html=1;endArrow=block;strokeWidth=3;strokeColor=#22A966;opacity=55;fontColor=#163A29;fontStyle=1;fontSize=12;labelBackgroundColor=#FFFFFF;",
  edgeInventory:
    "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;rounded=1;html=1;endArrow=block;strokeWidth=2;strokeColor=#91A39A;dashed=1;opacity=35;fontColor=#28352F;fontSize=12;labelBackgroundColor=#FFFFFF;",
  edgeDecision:
    "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;rounded=1;html=1;endArrow=block;strokeWidth=2;strokeColor=#D99300;fontColor=#6B4800;fontStyle=1;fontSize=12;labelBackgroundColor=#FFFFFF;",
  edgeDelivery:
    "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;rounded=1;html=1;endArrow=block;strokeWidth=3;strokeColor=#2489C5;fontColor=#0B2738;fontStyle=1;fontSize=12;labelBackgroundColor=#FFFFFF;",
  edgeGuide:
    "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;rounded=1;html=1;endArrow=none;startArrow=none;strokeWidth=2;strokeColor=#2489C5;dashed=1;fontColor=#0B2738;fontSize=12;labelBackgroundColor=#FFFFFF;",
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function setAttr(tag, name, value) {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${escapeXml(value)}"`);
  return tag.replace(/\/?>(?=[^>]*$)/, (end) => ` ${name}="${escapeXml(value)}"${end}`);
}

function cellPattern(id) {
  return new RegExp(
    `<mxCell\\b(?=[^>]*\\bid="${escapeRegExp(id)}")[^>]*>[\\s\\S]*?<\\/mxCell>`,
  );
}

function editCell(content, id, { x, y, width, height, style, value } = {}) {
  const pattern = cellPattern(id);
  const found = content.match(pattern)?.[0];
  if (!found) throw new Error(`No se encontró la celda ${id}`);
  let edited = found;
  edited = edited.replace(/^<mxCell\b[^>]*>/, (tag) => {
    let next = tag;
    if (style) next = setAttr(next, "style", style);
    if (value !== undefined) next = setAttr(next, "value", value);
    return next;
  });
  edited = edited.replace(/<mxGeometry\b[^>]*\/>/, (tag) => {
    let next = tag;
    if (x !== undefined) next = setAttr(next, "x", x);
    if (y !== undefined) next = setAttr(next, "y", y);
    if (width !== undefined) next = setAttr(next, "width", width);
    if (height !== undefined) next = setAttr(next, "height", height);
    return next;
  });
  return content.replace(pattern, edited);
}

function editEdge(content, id, style) {
  const pattern = cellPattern(id);
  const found = content.match(pattern)?.[0];
  if (!found) throw new Error(`No se encontró la arista ${id}`);
  const edited = found.replace(/^<mxCell\b[^>]*>/, (tag) => setAttr(tag, "style", style));
  return content.replace(pattern, edited);
}

function geometryFor(content, id) {
  const found = content.match(cellPattern(id))?.[0];
  if (!found) throw new Error(`No se encontró la geometría de ${id}`);
  const geometry = found.match(/<mxGeometry\b([^>]*)\/>/)?.[1] || "";
  const attrs = Object.fromEntries(
    [...geometry.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
  return {
    x: Number(attrs.x || 0),
    y: Number(attrs.y || 0),
    width: Number(attrs.width || 0),
    height: Number(attrs.height || 0),
  };
}

function valueFor(content, id) {
  const found = content.match(cellPattern(id))?.[0];
  if (!found) throw new Error(`No se encontró el valor de ${id}`);
  return found.match(/^<mxCell\b[^>]*\bvalue="([^"]*)"/)?.[1] || "";
}

function displayLineCount(rawValue, charsPerLine = 68) {
  const normalized = rawValue
    .replaceAll("&amp;#xa;", "\n")
    .replaceAll("&#xa;", "\n")
    .replaceAll(/&[^;]+;/g, " ")
    .replaceAll(/<[^>]+>/g, "");
  return normalized.split("\n").reduce((count, line) => {
    return count + Math.max(1, Math.ceil(line.trim().length / charsPerLine));
  }, 0);
}

function vertex(id, value, style, x, y, width, height) {
  return `<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" /></mxCell>`;
}

function sectionPanel(content, formId, page, prefix, section, index, x, y) {
  const fields = page.fields.filter((field) => field.section === section.id);
  const sectionId = `${prefix}_sec_${section.id}`;
  const fieldLayouts = [];
  let cursorY = y + 155;
  for (let offset = 0; offset < fields.length; offset += 2) {
    const row = fields.slice(offset, offset + 2).map((field, column) => {
      const id = `${prefix}_field_${field.key}`;
      const rawValue = valueFor(content, id);
      const height = Math.max(122, 36 + displayLineCount(rawValue) * 19);
      return {
        id,
        x: x + 40 + column * 660,
        y: cursorY,
        width: FIELD_WIDTH,
        height,
        conditional: Boolean(field.showWhen),
      };
    });
    fieldLayouts.push(...row);
    cursorY += Math.max(...row.map((item) => item.height)) + 26;
  }
  const panelHeight = Math.max(300, cursorY - y + 24);
  content = editCell(content, sectionId, {
    x: x + 85,
    y: y + 36,
    width: 1215,
    height: 88,
    style: styles.section,
  });
  for (const field of fieldLayouts) {
    content = editCell(content, field.id, {
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      style: field.conditional ? styles.conditionalField : styles.field,
    });
  }
  const background = vertex(
    `layout_${formId}_section_${section.id}`,
    "",
    styles.zone,
    x,
    y,
    PANEL_WIDTH,
    panelHeight,
  );
  const step = vertex(
    `layout_${formId}_step_${index + 1}`,
    String(index + 1),
    styles.step,
    x + 28,
    y + 48,
    46,
    46,
  );
  return { content, panelHeight, cells: background + step };
}

function collectEdges(content) {
  return [...content.matchAll(/<mxCell\b([^>]*\bedge="1"[^>]*)>[\s\S]*?<\/mxCell>/g)].map(
    (match) => {
      const attrs = Object.fromEntries(
        [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((part) => [part[1], part[2]]),
      );
      return attrs;
    },
  );
}

function restyleEdges(content, prefix, qaPrefix) {
  const deliveryTokens = ["_review", "_valid", "_fix", "_submit", "_outcome", "_success", "_queue", "_fail"];
  for (const edge of collectEdges(content)) {
    const source = edge.source || "";
    const target = edge.target || "";
    let style = styles.edgeInventory;
    if (edge.id === `${qaPrefix}_control_guide`) style = styles.edgeGuide;
    else if (source.startsWith(qaPrefix) || target.startsWith(qaPrefix)) style = styles.edgeDecision;
    else if (source.includes("_cond_") || target.includes("_cond_")) style = styles.edgeDecision;
    else if (deliveryTokens.some((token) => source.endsWith(token) || target.endsWith(token))) {
      style = styles.edgeDelivery;
    } else if (
      source === `${prefix}_begin` ||
      source.includes("_sec_") ||
      target.includes("_sec_")
    ) {
      style = styles.edgeMain;
    }
    content = editEdge(content, edge.id, style);
  }
  return content;
}

function redesignDiagram(diagramXml, formId, page, config) {
  let content = diagramXml;
  const { prefix, qa } = config;
  content = content.replace(
    new RegExp(`<mxCell\\b(?=[^>]*\\bid="layout_${escapeRegExp(formId)}_[^"]+")[^>]*>[\\s\\S]*?<\\/mxCell>`, "g"),
    "",
  );

  content = content.replace(/<mxGraphModel\b[^>]*>/, (tag) => {
    let next = setAttr(tag, "pageWidth", PAGE_WIDTH);
    next = setAttr(next, "pageHeight", 5000);
    next = setAttr(next, "background", "#FFFFFF");
    return next;
  });

  const layoutCells = [];
  layoutCells.push(
    vertex(
      `layout_${formId}_title`,
      `${page.name.toUpperCase()}  ·  MAPA DEL FORMULARIO&#xa;Lectura operativa y referencia técnica sincronizada`,
      styles.title,
      80,
      40,
      2840,
      105,
    ),
  );
  layoutCells.push(
    vertex(
      `layout_${formId}_reading`,
      "CÓMO LEERLO  ·  1 Captura por pasos  →  2 Control previo y envío  →  3 Reglas condicionales.  Las tarjetas ámbar solo aparecen cuando se cumple su condición.",
      styles.reading,
      80,
      170,
      2840,
      82,
    ),
  );

  content = editCell(content, `${prefix}_begin`, {
    x: 1380,
    y: 300,
    width: 240,
    height: 92,
    style: styles.start,
  });

  let rowY = 455;
  for (let index = 0; index < page.sections.length; index += 2) {
    const pair = page.sections.slice(index, index + 2);
    const panels = [];
    for (let column = 0; column < pair.length; column += 1) {
      const panel = sectionPanel(
        content,
        formId,
        page,
        prefix,
        pair[column],
        index + column,
        column ? RIGHT : LEFT,
        rowY,
      );
      content = panel.content;
      layoutCells.push(panel.cells);
      panels.push(panel);
    }
    rowY += Math.max(...panels.map((panel) => panel.panelHeight)) + 150;
  }

  const qaY = rowY;
  layoutCells.push(
    vertex(`layout_${formId}_qa_bg`, "", styles.zone, 120, qaY, 2760, 360),
    vertex(
      `layout_${formId}_qa_title`,
      "2  ·  CONTROL PREVIO A LA REVISIÓN",
      styles.zoneTitle,
      160,
      qaY + 28,
      2680,
      52,
    ),
  );
  content = editCell(content, `${qa}_control`, {
    x: 210,
    y: qaY + 125,
    width: 520,
    height: 165,
    style: styles.qaDecision,
  });
  content = editCell(content, `${qa}_normal`, {
    x: 905,
    y: qaY + 128,
    width: 700,
    height: 155,
    style: styles.qaNormal,
  });
  content = editCell(content, `${qa}_test`, {
    x: 1780,
    y: qaY + 118,
    width: 900,
    height: 175,
    style: styles.qaTest,
  });

  const deliveryY = qaY + 420;
  layoutCells.push(
    vertex(`layout_${formId}_delivery_bg`, "", styles.zone, 120, deliveryY, 2760, 650),
    vertex(
      `layout_${formId}_delivery_title`,
      "REVISIÓN, ENVÍO Y RESULTADO",
      styles.zoneTitle,
      160,
      deliveryY + 28,
      2680,
      52,
    ),
  );
  content = editCell(content, `${prefix}_review`, {
    x: 220,
    y: deliveryY + 145,
    width: 460,
    height: 150,
    style: styles.review,
  });
  content = editCell(content, `${prefix}_valid`, {
    x: 790,
    y: deliveryY + 140,
    width: 330,
    height: 165,
    style: styles.decision,
  });
  content = editCell(content, `${prefix}_fix`, {
    x: 770,
    y: deliveryY + 395,
    width: 370,
    height: 115,
    style: styles.fix,
  });
  content = editCell(content, `${prefix}_submit`, {
    x: 1260,
    y: deliveryY + 145,
    width: 365,
    height: 150,
    style: styles.submit,
  });
  content = editCell(content, `${prefix}_outcome`, {
    x: 1765,
    y: deliveryY + 140,
    width: 315,
    height: 165,
    style: styles.decision,
  });
  content = editCell(content, `${prefix}_success`, {
    x: 2260,
    y: deliveryY + 105,
    width: 480,
    height: 115,
    style: styles.success,
  });
  content = editCell(content, `${prefix}_queue`, {
    x: 2260,
    y: deliveryY + 270,
    width: 480,
    height: 135,
    style: styles.queue,
  });
  content = editCell(content, `${prefix}_fail`, {
    x: 2260,
    y: deliveryY + 455,
    width: 480,
    height: 120,
    style: styles.fail,
  });

  let rulesY = deliveryY + 740;
  const conditionIndexes = [
    ...new Set(
      [...content.matchAll(new RegExp(`id="${escapeRegExp(prefix)}_cond_(\\d+)"`, "g"))].map(
        (match) => Number(match[1]),
      ),
    ),
  ].sort((a, b) => a - b);
  if (conditionIndexes.length) {
    layoutCells.push(
      vertex(
        `layout_${formId}_rules_title`,
        "3  ·  REGLAS CONDICIONALES  ·  REFERENCIA DE VISIBILIDAD",
        styles.zoneTitle,
        120,
        rulesY,
        2760,
        58,
      ),
    );
    rulesY += 95;
    for (let position = 0; position < conditionIndexes.length; position += 1) {
      const conditionIndex = conditionIndexes[position];
      const column = position % 2;
      const row = Math.floor(position / 2);
      const x = column ? RIGHT : LEFT;
      const y = rulesY + row * 460;
      layoutCells.push(
        vertex(
          `layout_${formId}_rule_${conditionIndex}`,
          "",
          styles.zone,
          x,
          y,
          PANEL_WIDTH,
          410,
        ),
        vertex(
          `layout_${formId}_rule_label_${conditionIndex}`,
          `REGLA ${conditionIndex + 1}`,
          styles.step,
          x + 40,
          y + 30,
          120,
          42,
        ),
      );
      content = editCell(content, `${prefix}_cond_${conditionIndex}`, {
        x: x + 50,
        y: y + 135,
        width: 250,
        height: 140,
        style: styles.decision,
      });
      content = editCell(content, `${prefix}_cond_yes_${conditionIndex}`, {
        x: x + 355,
        y: y + 75,
        width: 575,
        height: 145,
        style: styles.branchYes,
      });
      content = editCell(content, `${prefix}_cond_no_${conditionIndex}`, {
        x: x + 355,
        y: y + 245,
        width: 575,
        height: 125,
        style: styles.branchNo,
      });
      content = editCell(content, `${prefix}_cond_join_${conditionIndex}`, {
        x: x + 1030,
        y: y + 165,
        width: 230,
        height: 90,
        style: styles.join,
      });
    }
    rulesY += Math.ceil(conditionIndexes.length / 2) * 460;
  }

  const orphanWarningId = `${prefix}_orphan_warning`;
  if (cellPattern(orphanWarningId).test(content)) {
    layoutCells.push(
      vertex(
        `layout_${formId}_exception_title`,
        "EXCEPCIÓN DOCUMENTADA  ·  NO MODIFICA PRODUCCIÓN",
        styles.zoneTitle,
        120,
        rulesY,
        2760,
        58,
      ),
    );
    content = editCell(content, orphanWarningId, {
      x: 170,
      y: rulesY + 100,
      width: 1320,
      height: 190,
      style: styles.warning,
    });
    content = editCell(content, `${prefix}_field_coordenadas`, {
      x: 1580,
      y: rulesY + 115,
      width: 1250,
      height: 160,
      style: styles.warning,
    });
    rulesY += 350;
  }

  const guideY = rulesY + 20;
  content = editCell(content, `${prefix}_guide`, {
    x: 120,
    y: guideY,
    width: 2760,
    height: 165,
    style: styles.guide,
  });
  const pageHeight = Math.ceil((guideY + 260) / 100) * 100;
  content = content.replace(/<mxGraphModel\b[^>]*>/, (tag) => setAttr(tag, "pageHeight", pageHeight));
  content = restyleEdges(content, prefix, qa);

  const anchorPattern = /<mxCell id="1" parent="0"\s*\/>/;
  if (!anchorPattern.test(content)) throw new Error(`No se encontró el ancla raíz de ${page.page}`);
  content = content.replace(anchorPattern, (anchor) => anchor + layoutCells.join(""));
  return content;
}

for (const [formId, config] of Object.entries(FORM_PAGES)) {
  const page = manifest.forms[formId];
  const pattern = new RegExp(
    `<diagram\\b(?=[^>]*\\bname="${escapeRegExp(page.page)}")[^>]*>[\\s\\S]*?<\\/diagram>`,
  );
  const found = xml.match(pattern)?.[0];
  if (!found) throw new Error(`No se encontró la página ${page.page}`);
  xml = xml.replace(pattern, redesignDiagram(found, formId, page, config));
}

fs.writeFileSync(diagramPath, xml);
console.log("Draw.io reorganizado: 4 páginas de formularios, sin cambios funcionales.");
