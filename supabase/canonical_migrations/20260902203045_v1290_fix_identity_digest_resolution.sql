-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902203045; name: v1290_fix_identity_digest_resolution

alter function public.request_identity_verification(text, text)
  set search_path = public, private, extensions;
