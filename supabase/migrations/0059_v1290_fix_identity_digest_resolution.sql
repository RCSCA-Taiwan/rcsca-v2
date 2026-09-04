-- V1290: pgcrypto is installed in the extensions schema. The fixed search_path
-- previously made request_identity_verification unable to resolve digest().

alter function public.request_identity_verification(text, text)
  set search_path = public, private, extensions;
