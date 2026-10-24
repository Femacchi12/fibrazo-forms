# FO-CHG-104 · Preload the full operator catalogue

The full shared operator list was fetched afresh at each form opening, but only individually confirmed names were cached. A slow/mobile request could make operators appear only when another territorial response arrived; an already-open dropdown did not repaint when the shared catalogue completed.

0.8.157 loads the full authenticated catalogue independently at access-ready/startup and form opening. It restores a same-account catalogue synchronously before rendering, refreshes in the background, coalesces requests and reuses a successful refresh for one minute. The 10-second deadline covers token acquisition, headers and body; network errors retain the local catalogue. Explicit authorization denials remove the shared cache, and late responses cannot cross accounts. Already-open suggestion lists repaint without replacing the input or its value.

No form submission, recorded GPS, pending queue, territory rules, operator identities or captured data changes. The first successful download is still needed when no catalogue exists locally. Test104 uses the actual catalogue-loading functions to exercise persistence/reset, in-flight cache visibility, coalescing, weak-network retention, account switching and explicit denial. Full test:forms remains required before publication.
