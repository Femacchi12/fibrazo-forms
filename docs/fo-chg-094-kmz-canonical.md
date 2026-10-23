# FO-CHG-094 - Canonical operational KMZ strata

Edu explicitly approved the Exploration shared-drive KMZs as FIBRAZO operational truth for Neiva, Villavicencio and Ibague on 2026-10-22 Colombia. This supersedes the former municipal-source activation prerequisite for these three datasets only; it does not assert municipal certification.

## Sources and geometry

The versioned manifest api/strata-kmz-approved.json records original Drive IDs, SHA256 values and the approved archive. Originals remain untouched. Counts: Neiva 4,021 (1,226/2,422/373 by strata 1/2/3); Villavicencio 5,066 (1,811/1,557/1,698); Ibague 4,578 (1,004/2,527/1,047). Total 13,665 original polygons, unioned into three MultiPolygon features per city without additional simplification. VVC source 221965 contains two LinearRing children under one innerBoundaryIs: both are holes. The previous derivative omitted this polygon; the approved derivative includes it.

Approved archive: https://drive.google.com/file/d/1nONNr2pmxZgr5H-iK7cIPyvNOUOHak0p/view
SHA256: 423a9ffc4e7c859b74029d1c96f530a12c8bfaa729b190acbafca54ccdedf554
Size: 5,692,891 bytes versus 20,737,371 previously. Geometry display and map controls remain unchanged. Legacy QA scope identifiers remain only for compatible routing/cache keys; source metadata identifies approved operational KMZ.

## Runtime and data contract

The canonical source is the approved ZIP plus compiled manifest, registered in Maestro Territorial Central / 13_FUENTES_ESTRATOS_KMZ. Empty legacy city 03_ESTRATOS tabs do not disable this source. The backend verifies archive SHA256 before parsing and shares its cache with the optimized map layer. Exact inside membership returns canonical operational strata. Outside, holes and overlaps remain unassigned; no nearest-polygon inference. Only strata 1/2/3 exist in these files, not necessarily throughout each municipality.

New and edited submissions in these three cities derive automatic strata from original valid GPS and the approved engine, overriding stale client automatic values. Observed/manual strata remain separate. Intel consolidation accepts the derived automatic column only for these cities with valid GPS; its manual column remains independent. Other cities and barrio/troncal sources are unchanged.

## Historical reconciliation and rollback

225 physical source rows had derived territorial fields recalculated. The atomic source transaction also wrote AUDIT_ESTRATOS_KMZ_094 in the Forms operative spreadsheet, including exact old/new values and preserved manual strata. GPS, IDs, timestamps, owners, photos and manual observations were preserved and read back. Ventilador control 2.9232767,-75.2751733 resolves to stratum 2. No GPS was invented for historical missing coordinates. Outside records remain without automatic strata.

Competencia reconciliation updated 66 evidence rows and 233 project-city derived rows under the existing distributed metadata lock; no new operator/presence/relevamiento records were introduced. Recalculate again with the versioned engine if a concurrent older client changes derived rows before release.

Rollback: revert this commit/manifest, retain originals and versioned archives; use each audit row's Antes JSON to restore only derived fields after validating current IDs and values. Do not clear phone storage. Future source revisions require a new approved manifest/hash, geometry controls, audited recalculation and documentation.

## Verification

Full test:forms suite passes, including nine city/stratum controls, shared archive caching, holes/outside/overlap, other-city isolation, real territorial routing and changed-byte rejection. The real approved archive passed nine additional geometry controls and the Ventilador control. Historical readback: 225 rows, zero mismatches, original/manual fields preserved. Production release: SW 0.8.149, asset tag 20261022-kmz094. No physical Android test or authenticated real submission was fabricated. Browser-local queues cannot be certified remotely.
