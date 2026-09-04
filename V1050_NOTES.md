# V1050 — Error states, login localization, and accessibility

- Localized the login flow and team-invitation outcomes in all four languages without exposing raw authentication errors.
- Made the root global-error boundary locale-aware even when the ordinary i18n provider is unavailable.
- Added keyboard and assistive-technology semantics to sign-in mode controls, result messages, and the global error action.
- Added a P0/P1/P2 multilingual residue audit.
- No Supabase schema, RPC, or RLS changes.
