# FO-CHG-103 · Field synchronization and review references

Problem: optional geographic lookup could stop a pending form before POST, while every received form awaited a full competition materialization. Autocomplete persisted incomplete names on blur/change.

Changes:
- Optional lookup gets a 5 second deadline; transient/incomplete results fall through to the authenticated receiver with original GPS, photos and manual observations. Auth/account/restart checks still block invalid sends. Server remains authoritative.
- Queue requests defer competition work. Received records retain a durable `sent_competition_pending` phase; one authorized consolidation handles the received batch. Failure retries this phase without resending forms/photos. Legacy clients keep the existing synchronous response behavior.
- Explicit choices and successfully queued/saved names populate a new confirmed suggestion cache. Typing/blur do not. Existing source spelling is retained for user review.
- Approved closure references use separate columns (Exploration FH:FP, Intelligence AK:AS). Methods DENTRO/CERCANO/OBSERVADO and distances stay explicit, originals untouched. Stored GPS fingerprint invalidates references after coordinate edits. Map and competition consume the same reference data; raw exact-containment fields remain unchanged.

Data backfill is private operational data, not checked into this repository. No operator identities are merged by this change. This closure pass does not add automatic nearest-reference writes for future records.

Validation: complete `npm run test:forms`; IDB queue tests cover failed optional lookup, interruption/lost ACK, owner isolation, batch failure/retry without resending, and separate geometry/manual/reference semantics. Production status and shell version require deployment readback. Physical Android cellular scheduling has not been reproduced in the test environment; Chrome still controls worker wakeup/duration.
