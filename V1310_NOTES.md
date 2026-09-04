# V1310 Notes

- Added validated SSR session middleware for private routes.
- Added safe post-login return-path handling for password and email-link flows.
- Verified anonymous redirects, private no-store caching, health response, and Staging Data API boundaries.
- Confirmed public aggregate access, zero anonymous profile rows, and HTTP 401 for direct writes and privileged RPCs.
- Production remains unchanged.
