# FO-CHG-096 - Sincelejo and Monteria census reference strata

Edu requested public stratum geometry, prioritizing DANE, for the missing cities. Interpreted transcription as Sincelejo and Monteria, then explicitly asked which source to use if no municipal download appeared. Edu selected **Referencia DANE2018**. This authorizes a clearly labeled visual census reference, not municipal certification or automatic reassignment of captured answers.

## Search and source

DANE explains that detailed/current municipal stratification is held by the municipal planning offices. Reviewed DANE, municipal portals, public city services, and ArcGIS catalog metadata. No downloadable current municipal stratum polygons were verified during this search. Existing Monteria and Sincelejo public services inspected contained barrio/other layers, not usable municipal stratum geometry. Census/municipal aggregate layers and geological stratification were not substituted.

Source selected: Esri Colombia Living Atlas, Estrato predominante por manzana 2018, derived from DANE CNPV2018. ArcGIS item 084bb9fdddf64efaa578a692d7387d19.
https://ags.esri.co/arcgis/rest/services/LivingAtlas/Estrato_predominante_por_manzana_2018/MapServer/0
Its own description labels this a non-official reference based on the predominant dwelling stratum per block. It is not a KMZ originally published by the municipality. We downloaded GeoJSON and generated the KMZ derivatives.

## Download and dissolve

Paged queries in EPSG:4326 used ID_UNIFICADO_MANZANA LIKE '70001%' (Sincelejo) and '23001%' (Monteria), sorted by OBJECTID, 500 records per page. Counts matched the service's complete object-ID lists, no duplicates; municipality attributes matched. Coverage is the urban footprint available in the source, not a claim of full municipality/rural or current coverage.

| City | Original blocks | Numeric strata | Without stratum | Unified Features |
|---|---:|---:|---:|---:|
| Sincelejo | 3,878 | 3,295 | 583 | 6 |
| Monteria | 5,091 | 4,418 | 673 | 6 |

Text labels Uno/Dos/Tres/Cuatro/Cinco/Seis were checked against ESTRATO_PREDOMINANTE_INT. Sin Estrato is retained in original files and manifests, not converted into 0 or 1. Polygon union is by city and value, without simplification, buffering or gap filling. Sincelejo has 3,147 disconnected numeric components after union; Monteria 4,392. These are six MultiPolygon Features per city, not six connected areas. Area checks showed no material gain, and symmetric-difference checks preserved coverage. Original block IDs and attributes remain in the download packages.

## Persisted artifacts

Runtime ZIP: https://drive.google.com/file/d/1hXhkBvXgCW3zXfsFz4fapWWdezpSyoD6/view
3,013,665 bytes; SHA256 597c9861a0f56143efbf8cce3043a79e5e9290705104cc4c16dd0bb905c79f0c.
Re-downloaded after upload and verified exact SHA. Reader granted only to the existing backend service account.

Sincelejo city folder: package https://drive.google.com/file/d/1pwp_MVpvNXz7yInBH4JOM3pudfGvPQLm/view ; direct KMZ https://drive.google.com/file/d/1V3adbe_Pqn6BNnunM-EXTqiuViliG-CF/view .
Monteria city folder: package https://drive.google.com/file/d/1__TS6IOIb2xO1nJqok5dn8WmnmVE1dpv/view ; direct KMZ https://drive.google.com/file/d/1RhV1rl6gGVavlfxRNs5MaWtBmutZhaki/view .
Each package contains original GeoJSON, unified GeoJSON, generated KMZ and provenance/count/hash manifest. The KMZ has six placemarks and preserves outer/inner rings. Files are versioned, existing source files untouched.

## Integration and data boundaries

api/_estratos-census-2018.js handles these two cities only through the existing authenticated map-polygons route. Permission is checked before archive download. SHA-verified ZIP cached for ten minutes and shared across city reads; full-city gzip delivery avoids repeated pan/zoom downloads and Vercel payload limits. Existing colors, filters, layer controls and map layout remain unchanged. Both new cities use full-city cache keys and their actual source bounds. UI status, tooltip and polygon popup identify reference CNPV2018 / predominant block stratum. canonical=false throughout.

This handler is visual only. It is not imported by the territorial assignment/submission/competition engine; native 03_ESTRATOS is intentionally not populated with reference data. No submitted GPS, manual/automatic stratum, photo or historical response is changed. Maestro Territorial 01_CIUDADES marks these sources REFERENCIA_CENSAL_2018, with detailed source registry 15_REFERENCIA_CENSO_2018. Previous master CellData F6:M7 is retained as a note on the registry approval header for rollback. Municipal current geometry remains a distinct future gap.

## Validation and release

Full test:forms suite including new check-census-reference-096 passes. New regression exercises actual map route for both names (including accent), gzip, selected stratum filters/index, year/reference metadata, shared download caching, denied permission before download, isolation of other cities, and changed-byte rejection. Real uploaded archive passed twelve point-membership controls, both KMZ XML validations and six placemark counts. Actual all-strata response gzip: Sincelejo 1,054,848 bytes; Monteria 2,024,343 bytes (below response cap).

SW0.8.151 / 20261022-census096. Deployment readiness/domain asset verification are recorded separately in central log and Manual Forms. No physical Android or new authenticated real submission is claimed. Roll back code to FO095, restore only G/H/I/K6:7 in the master from saved prior CellData after checking current state, preserve download artifacts and native original/captured data. No phone storage reset.
