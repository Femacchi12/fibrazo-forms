# FO-CHG-106 · Numeric nearby stratum in the operational field

The form kept `Sin información` when the canonical lookup was FUERA, despite displaying a valid nearest stratum and distance below it. User explicitly requested the nearest value in the field with status/distance kept separate.

0.8.159 selects a numeric nearest operational stratum for FUERA with a finite, nonnegative distance within the existing 5 km lookup limit. DENTRO stays exact. Missing/ambiguous/non-numeric classifications remain unassigned; noncanonical QA suggestions still require the test policy. The foreground field and background enrichment use one selector. Review labels retain FUERA rather than claiming inside membership.

Server capture persists separate FO-CHG-106 operational references (existing FH:FP / AK:AS columns), tied to GPS, with value/method/distance. Manual observed stratum has analysis priority. Exact automatic classification, original GPS and photos remain intact. History, map and competition read the reference separately; exact-containment fields are not rewritten as DENTRO. Sidecar failures are logged without discarding an already captured source record.

Full test:forms plus test106 cover value2 at6m, preserved FUERA and evidence, invalid/unknown/ambiguous cases, background enrichment, sidecar round trip, map/competition provenance and manual priority. No new service, permission or serverless function. Existing mobile receipt improvements from105 are retained.
