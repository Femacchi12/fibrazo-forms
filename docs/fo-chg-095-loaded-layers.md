# FO-CHG-095 - Approval of all loaded barrio and stratum layers

Edu explicitly accepts all currently loaded barrio and stratum layers as FIBRAZO operational truth (2026-10-22 COT). This supersedes the prior candidate/historical activation restrictions. Source name, URL, year, original geometries and numeric/non-numeric categories remain unchanged. This approval does not claim municipal certification or complete coverage.

## Native acceptance

3,430 barrio rows across nine territorial workbooks now have Preferida_Analisis TRUE and Estado_Calidad VALIDADO_FIBRAZO_095. Cartagena's 214 previously candidate rows use VALIDADO_FIBRAZO_095_COMPLEMENTO; the 191 previously accepted polygons retain priority when two sources contain a point. The accepted complement supplies gaps. Same-tier overlaps keep the established smallest-bounding-box exact-containment rule. They are 405 source geometries, not 405 unique barrios. No source row was deleted or geometry combined across different barrio identities.

All 81 loaded Cartagena stratum rows are accepted (65 numerical and 16 No residencial). Numerical assignment uses the approved full-resolution unified geometry already displayed by the map, including its previously documented geometry repair. Source year stays 2022. Non-residential and unknown categories remain valid source information but never become invented numerical strata. AMB's 9,570 already validated source rows remain authoritative; 2,669 have no numerical classification. The three approved KMZ datasets and exact-lookup engine from FO094 remain active.

Each changed source workbook has AUDIT_APROBACION_095, written atomically with its acceptance changes. Total 3,511 audit rows store original CellData for preference/quality and original source ID/row, plus approved values. Maestro Territorial Central / 14_APROBACION_CAPAS_095 stores approval and prior master rows; 01_CIUDADES reflects the new statuses. Empty Turbaco and other missing stratum layers remain SIN_CAPA, rather than being invented or marked populated. No submission, photo, owner, GPS, timestamp or observed/manual stratum was changed by this adoption.

## Dissolve and map

Full-resolution AMB and Cartagena packages were inspected and their union rerun per municipality/stratum. All 27 groups were already dissolved; a second union preserves component counts. FO094 supplies another nine groups: total 36 numerical MultiPolygon features across eight municipalities. AMB: 6 Bucaramanga, 6 Floridablanca, 4 Giron, 5 Piedecuesta; Cartagena 6; Neiva/Villavicencio/Ibague 3 each. Disconnected areas remain disconnected. No buffers, gap filling or joins across different stratum values.

AMB optimized delivery is now the default for a single supported municipality, including requests without the legacy qaDissolve flag. Versioned SHA256 checks protect the existing approved packages (api/territorial-approval.json). Cartagena map metadata now states operational acceptance with historical source year, and canonical assignment uses the same displayed geometry. Legacy filenames/scopes remain compatible. Frontend status says Estratos unificados. Existing map layout/controls are unchanged.

## Validation and rollback

Basic WKT geometry/coordinate checks: all 3,430 barrio rows populated with polygon geometry and valid geographic coordinate ranges. Real archived full geometry: 21 AMB groups plus six Cartagena groups; six Cartagena exact stratum controls passed and SHA checks passed through the actual handlers. Full test:forms suite plus check-loaded-approval-095 covers accepted source year, outside unassigned, default AMB optimized route, archive caching and integrity rejection, nonnumeric exclusion, and primary barrio priority with complement gap fallback. Existing offline queue/photo/idempotency tests remain included.

Release: SW 0.8.150 / asset tag 20261022-approved095. Production readiness and native readback are separate checks recorded in the central log and Manual Forms. Physical Android, authenticated live submission and Vercel runtime logs are not claimed.

Rollback: revert FO095 code, then restore only changed preference/quality CellData from AUDIT_APROBACION_095 after checking original ID/row and current approved value. Restore master metadata using its recorded previous row. Preserve source geometry/provenance and FO094 data audit. No clearing phone storage. Future additions require their own versioned approval; this is approval of currently loaded data, not unreviewed future files.

Remaining gaps: no loaded strata for Barranquilla, Santa Marta, Monteria, Sincelejo or Turbaco; no barrios for Turbaco; unknown numerical categories and areas outside existing coverage remain explicit. Prior validation tasks for accepted loaded layers are superseded by this decision.
