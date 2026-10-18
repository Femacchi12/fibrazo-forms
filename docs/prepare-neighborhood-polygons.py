#!/usr/bin/env python3
"""Normalize public barrio polygons for the FIBRAZO territorial workbook.

The script intentionally uses only Python's standard library so the import can be
reproduced in a clean CI/workstation. It rounds coordinates to 6 decimals and
removes sub-metre collinear vertices, groups split geometries with the same
source name, and emits GeoJSON, KML, a lightweight CSV index, a Sheets row file,
and a ZIP package with provenance.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import math
import re
import shutil
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path


CONFIG = {
    "neiva": {
        "code": "NVA",
        "dane": "41001",
        "city": "Neiva",
        "input": "neiva.geojson",
        "name": "NOM_BARRIO",
        "commune": "NO__COMUNA",
        "origin": "OBJECTID_1",
        "source_type": "TECNICO_POT_GIS",
        "source_name": "ArcGIS Tarea3_AGS · Barrios (atributo FUENTE=POT Neiva)",
        "source_url": "https://www.arcgis.com/home/item.html?id=087577efd2654c079d52c74fc60c315f",
        "year": "2019",
        "quality": "VALIDADO_TECNICO_POT_NEIVA",
        "note": "Capa pública técnica; el propio atributo FUENTE indica POT Neiva. No sustituye certificación municipal.",
    },
    "villavicencio": {
        "code": "VVC",
        "dane": "50001",
        "city": "Villavicencio",
        "input": "villavicencio.geojson",
        "name": "BARRIO",
        "commune": "Comuna",
        "origin": "FID",
        "source_type": "TECNICO_GIS_CRUZADO_OFICIAL",
        "source_name": "ArcGIS Barrios Villavicencio · contraste catálogo abierto Alcaldía",
        "source_url": "https://www.arcgis.com/home/item.html?id=7484093dba8f4430990d69937d693836",
        "year": "2026",
        "quality": "VALIDADO_TECNICO_CRUCE_ALCALDIA",
        "note": "Geometría pública técnica; nombres contrastados con Datos Abiertos de la Alcaldía (x5yx-u8uk).",
    },
    "ibague": {
        "code": "IBG",
        "dane": "73001",
        "city": "Ibagué",
        "input": "ibague.geojson",
        "name": "barrios",
        "commune": "comuna",
        "origin": "FID",
        "source_type": "TECNICO_REFERENCIAL_2023",
        "source_name": "ArcGIS BARRIOS_2023_POLICIA_IBAGUE_A_LA_MANO · contraste visor POT U15",
        "source_url": "https://www.arcgis.com/home/item.html?id=dd05098b1f9d479d84ca7a6c441a3628",
        "year": "2023",
        "quality": "VALIDADO_TECNICO_REFERENCIAL",
        "note": "Copia pública técnica 2023. El visor oficial municipal identifica U15-Barrios (POT 823/2014), pero su servidor no respondió durante la descarga.",
    },
}

HEADERS = [
    "ID_Barrio", "Ciudad", "Barrio", "Comuna_Localidad", "Area_m2", "Area_ha",
    "Poblacion", "Hogares", "Densidad", "Fuente_tipo", "Fuente_nombre", "Fuente_URL",
    "Año_Vigencia", "Preferida_Analisis", "WKT", "Min_Lon", "Min_Lat", "Max_Lon",
    "Max_Lat", "Codigo_Origen", "Estado_Calidad",
]


def norm(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or "").upper())
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Z0-9]+", " ", text).strip()


def clean_label(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).upper()


def point_segment_distance(point, start, end):
    px, py = point
    ax, ay = start
    bx, by = end
    vx, vy = bx - ax, by - ay
    length2 = vx * vx + vy * vy
    if not length2:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / length2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def simplify_ring(raw, tolerance=0.000004):
    points = [[round(float(p[0]), 6), round(float(p[1]), 6)] for p in raw]
    compact = []
    for point in points:
        if not compact or point != compact[-1]:
            compact.append(point)
    if compact and compact[0] == compact[-1]:
        compact.pop()
    changed = True
    while changed and len(compact) > 3:
        changed = False
        keep = []
        size = len(compact)
        for index, point in enumerate(compact):
            before = compact[(index - 1) % size]
            after = compact[(index + 1) % size]
            if size - (len(compact) - len(keep)) <= 3 or point_segment_distance(point, before, after) >= tolerance:
                keep.append(point)
            else:
                changed = True
        if len(keep) >= 3:
            compact = keep
        else:
            break
    if len(compact) < 3:
        return []
    return compact + [compact[0]]


def polygons_from_geometry(geometry, tolerance=0.000004):
    if not geometry:
        return []
    if geometry.get("type") == "Polygon":
        raw_polygons = [geometry.get("coordinates") or []]
    elif geometry.get("type") == "MultiPolygon":
        raw_polygons = geometry.get("coordinates") or []
    else:
        return []
    polygons = []
    for polygon in raw_polygons:
        rings = [simplify_ring(ring, tolerance=tolerance) for ring in polygon]
        rings = [ring for ring in rings if len(ring) >= 4]
        if rings:
            polygons.append(rings)
    return polygons


def geometry_from_polygons(polygons):
    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


def coordinates(geometry):
    def walk(value):
        if isinstance(value, list) and value and isinstance(value[0], (int, float)):
            yield value
        elif isinstance(value, list):
            for child in value:
                yield from walk(child)
    yield from walk(geometry.get("coordinates") or [])


def bbox(geometry):
    pts = list(coordinates(geometry))
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)


def ring_wkt(ring):
    return "(" + ", ".join(f"{p[0]:.6f} {p[1]:.6f}" for p in ring) + ")"


def geometry_wkt(geometry):
    if geometry["type"] == "Polygon":
        return "POLYGON (" + ", ".join(ring_wkt(ring) for ring in geometry["coordinates"]) + ")"
    polygons = []
    for polygon in geometry["coordinates"]:
        polygons.append("(" + ", ".join(ring_wkt(ring) for ring in polygon) + ")")
    return "MULTIPOLYGON (" + ", ".join(polygons) + ")"


def ring_area(ring):
    return abs(sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1))) / 2


def geometry_area(geometry):
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    total = 0.0
    for polygon in polygons:
        if not polygon:
            continue
        total += ring_area(polygon[0]) - sum(ring_area(ring) for ring in polygon[1:])
    return max(0.0, total)


def kml_geometry(geometry):
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    rendered = []
    for polygon in polygons:
        outer = " ".join(f"{p[0]},{p[1]},0" for p in polygon[0])
        holes = "".join(
            "<innerBoundaryIs><LinearRing><coordinates>" +
            " ".join(f"{p[0]},{p[1]},0" for p in ring) +
            "</coordinates></LinearRing></innerBoundaryIs>" for ring in polygon[1:]
        )
        rendered.append("<Polygon><outerBoundaryIs><LinearRing><coordinates>" + outer + "</coordinates></LinearRing></outerBoundaryIs>" + holes + "</Polygon>")
    return rendered[0] if len(rendered) == 1 else "<MultiGeometry>" + "".join(rendered) + "</MultiGeometry>"


def process(slug, cfg, input_root: Path, output_root: Path):
    raw_path = input_root / cfg["input"]
    data = json.loads(raw_path.read_text(encoding="utf-8"))
    grouped = defaultdict(lambda: {"polygons": [], "features": [], "communes": set(), "origins": []})
    skipped = []
    original_vertices = 0

    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        label = clean_label(props.get(cfg["name"]))
        polygons = polygons_from_geometry(feature.get("geometry"))
        if not label or not polygons:
            skipped.append(props.get(cfg["origin"]))
            continue
        key = norm(label)
        item = grouped[key]
        item["label"] = label
        item["polygons"].extend(polygons)
        item["features"].append(feature)
        commune = clean_label(props.get(cfg["commune"]))
        if commune:
            item["communes"].add(commune)
        origin = props.get(cfg["origin"])
        if origin not in (None, ""):
            item["origins"].append(str(origin))
        original_vertices += sum(1 for _ in coordinates(feature.get("geometry") or {}))

    normalized = []
    rows = []
    max_wkt = 0
    simplified_vertices = 0
    total_area = 0.0
    for position, (_, item) in enumerate(sorted(grouped.items(), key=lambda pair: pair[1]["label"]), 1):
        geometry = geometry_from_polygons(item["polygons"])
        simplified_vertices += sum(1 for _ in coordinates(geometry))
        bounds = bbox(geometry)
        wkt = geometry_wkt(geometry)
        max_wkt = max(max_wkt, len(wkt))
        total_area += geometry_area(geometry)
        barrio_id = f"{cfg['code']}_BARR_{position:04d}"
        commune = "; ".join(sorted(item["communes"]))
        origin = ";".join(item["origins"][:20])
        properties = {
            "ID_Barrio": barrio_id,
            "Ciudad": cfg["city"],
            "Barrio": item["label"],
            "Comuna_Localidad": commune,
            "Fuente_tipo": cfg["source_type"],
            "Fuente_nombre": cfg["source_name"],
            "Fuente_URL": cfg["source_url"],
            "Año_Vigencia": cfg["year"],
            "Codigo_Origen": origin,
            "Estado_Calidad": cfg["quality"],
        }
        normalized.append({"type": "Feature", "id": barrio_id, "properties": properties, "geometry": geometry})
        rows.append([
            barrio_id, cfg["city"], item["label"], commune, "", "", "", "", "",
            cfg["source_type"], cfg["source_name"], cfg["source_url"], cfg["year"], True,
            wkt, *bounds, origin, cfg["quality"],
        ])

    if not normalized:
        raise RuntimeError(f"{slug}: no valid polygon was produced")
    if max_wkt >= 50000:
        raise RuntimeError(f"{slug}: a WKT cell exceeds the Google Sheets 50,000 character limit ({max_wkt})")
    expected = {"neiva": (-75.40, 2.80, -75.10, 3.10), "villavicencio": (-73.80, 3.95, -73.40, 4.30), "ibague": (-75.60, 4.20, -74.80, 4.75)}[slug]
    actual = (
        min(bbox(f["geometry"])[0] for f in normalized), min(bbox(f["geometry"])[1] for f in normalized),
        max(bbox(f["geometry"])[2] for f in normalized), max(bbox(f["geometry"])[3] for f in normalized),
    )
    if not (actual[0] >= expected[0] and actual[1] >= expected[1] and actual[2] <= expected[2] and actual[3] <= expected[3]):
        raise RuntimeError(f"{slug}: city bounds validation failed: {actual}")

    city_dir = output_root / slug
    city_dir.mkdir(parents=True, exist_ok=True)
    output_geojson = city_dir / f"barrios-{slug}-fibrazo.geojson"
    output_geojson.write_text(json.dumps({"type": "FeatureCollection", "features": normalized}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (city_dir / f"barrios-{slug}-sheets.json").write_text(json.dumps({"headers": HEADERS, "rows": rows}, ensure_ascii=False), encoding="utf-8")

    dane_path = input_root / f"dane-{cfg['dane']}.geojson"
    dane_data = json.loads(dane_path.read_text(encoding="utf-8"))
    dane_feature = (dane_data.get("features") or [])[0]
    dane_polygons = polygons_from_geometry(dane_feature.get("geometry"), tolerance=0.0001)
    if not dane_polygons:
        raise RuntimeError(f"{slug}: DANE city polygon is empty")
    dane_geometry = geometry_from_polygons(dane_polygons)
    dane_wkt = geometry_wkt(dane_geometry)
    if len(dane_wkt) >= 50000:
        raise RuntimeError(f"{slug}: DANE city WKT exceeds Sheets cell limit ({len(dane_wkt)})")
    dane_bounds = bbox(dane_geometry)
    city_headers = ["ID_Ciudad_Poligono", "Ciudad", "Municipio", "Fuente_tipo", "Fuente_nombre", "Fuente_URL", "Año_Vigencia", "Preferida_Analisis", "WKT", "Min_Lon", "Min_Lat", "Max_Lon", "Max_Lat", "Estado_Calidad", "Observaciones"]
    city_row = [
        f"DANE_MPIO_{cfg['dane']}", cfg["city"], cfg["city"].upper(), "OFICIAL_GEOESTADISTICA",
        "DANE · MGN 2025 · Municipio",
        "https://geoportal.dane.gov.co/mparcgis/rest/services/Hosted/Serv_Mpio_MGN_2025/FeatureServer/317",
        2025, True, dane_wkt, *dane_bounds, "VALIDADO_DANE_MGN2025",
        "WKT local de respaldo simplificado ≈11,1 m. La resolución de ciudad usa DANE en vivo para pertenencia exacta.",
    ]
    (city_dir / f"ciudad-{slug}-sheets.json").write_text(json.dumps({"headers": city_headers, "rows": [city_row]}, ensure_ascii=False), encoding="utf-8")

    with (city_dir / f"barrios-{slug}-indice.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["ID_Barrio", "Ciudad", "Barrio", "Comuna_Localidad", "Codigo_Origen", "Estado_Calidad"])
        for row in rows:
            writer.writerow([row[0], row[1], row[2], row[3], row[19], row[20]])

    placemarks = []
    for feature in normalized:
        p = feature["properties"]
        placemarks.append(
            "<Placemark><name>" + html.escape(p["Barrio"]) + "</name><description>" +
            html.escape(f"{cfg['city']} · {p['Comuna_Localidad']} · {cfg['quality']}") +
            "</description>" + kml_geometry(feature["geometry"]) + "</Placemark>"
        )
    kml = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + html.escape(f"Barrios {cfg['city']} · FIBRAZO") + "</name>" + "".join(placemarks) + "</Document></kml>"
    (city_dir / f"barrios-{slug}-fibrazo.kml").write_text(kml, encoding="utf-8")

    report = {
        "city": cfg["city"], "source_url": cfg["source_url"], "source_quality": cfg["quality"],
        "source_features": len(data.get("features", [])), "output_neighborhoods": len(normalized),
        "skipped_features": len(skipped), "grouped_duplicate_features": len(data.get("features", [])) - len(skipped) - len(normalized),
        "original_vertices": original_vertices, "output_vertices": simplified_vertices,
        "vertex_reduction_percent": round((1 - simplified_vertices / max(1, original_vertices)) * 100, 2),
        "max_wkt_characters": max_wkt, "bbox": actual, "note": cfg["note"],
        "city_wkt_characters": len(dane_wkt),
    }
    (city_dir / "validacion.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    readme = f"""# Barrios de {cfg['city']} · FIBRAZO

Paquete preparado el 2026-10-18 para carga territorial de FIBRAZO Forms.

- Fuente: {cfg['source_name']}
- URL: {cfg['source_url']}
- Clasificación: {cfg['quality']}
- Polígonos/barrios normalizados: {len(normalized)}
- Sistema de coordenadas: WGS 84 (EPSG:4326)
- Optimización: coordenadas a 6 decimales y eliminación de vértices colineales inferiores a ~0,45 m.
- Advertencia: {cfg['note']}

El paquete incluye GeoJSON y KML para visualización, un índice CSV, el original descargado y el reporte de validación. No debe emplearse como certificación catastral o jurídica.
"""
    (city_dir / "README.md").write_text(readme, encoding="utf-8")
    shutil.copy2(raw_path, city_dir / f"fuente-original-{slug}.geojson")

    package = output_root / f"FIBRAZO_Barrios_{cfg['city'].replace(' ', '_')}_2026-10-18.zip"
    with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(city_dir.iterdir()):
            if not path.name.endswith("-sheets.json"):
                archive.write(path, path.name)
    return report, package


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    args = parser.parse_args()
    reports = {}
    for slug, cfg in CONFIG.items():
        report, package = process(slug, cfg, args.input_root, args.output_root)
        reports[slug] = {**report, "package": str(package)}
    (args.output_root / "validacion-general.json").write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
