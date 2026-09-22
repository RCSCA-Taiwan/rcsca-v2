# V1430 Notes

- Extended the canonical migration archive from 65 to 67 statements using the
  SQL actually recorded in Production for V1401 and V1420.
- Updated canonical integrity metadata so local and CI verification covers the
  current Production migration baseline.
- Replaced the obsolete single-branch workflow trigger with pull request,
  `main` push and manual verification.
- Kept application build, HTTP smoke tests, Playwright browser coverage and
  disposable empty-database replay in the required CI path.
- Isolated application verification and database replay into independent jobs,
  so one failure cannot hide the other result.
- Gated credentialed browser coverage behind the repository variable
  `RCSCA_E2E_AUTH_ENABLED=true`; public browser checks continue to run while a
  replacement verified test account is prepared.
