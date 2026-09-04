# V640 — Phase 1 completion gate

- Added route-level loading state so data-backed pages no longer fall back to an unbranded blank transition.
- Added recoverable route error boundary with retry and home escape path.
- Added root global error boundary for failures above ordinary route segments.
- Re-ran phase-one source scans: 68 page routes; all ordinary pages use SiteHeader except the auth callback by design; no TODO/FIXME/coming-soon placeholders found in the app source; no dead `href="#"` placeholders found.
- No schema change in this version.
- Phase 1 (site construction / functional skeleton) is considered complete. Build/runtime QA remains explicitly deferred to Phase 4.
