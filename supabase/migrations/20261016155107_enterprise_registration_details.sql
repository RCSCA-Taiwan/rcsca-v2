-- Detailed enterprise registration remains private to its owner and enterprise reviewers.
alter table public.enterprise_applications
  add column industry text,
  add column address text,
  add column website_url text,
  add column contact_title text,
  add column phone_extension text,
  add column mobile text,
  add column contribution_kind text,
  add column contribution_description text,
  add column registration_key uuid unique,
  add column registration_hash text;

alter policy "enterprise applications own read" on public.enterprise_applications
to authenticated using (
  requester_user_id=(select auth.uid()) or private.is_admin('enterprise_reviewer') or private.is_admin('admin')
);

create function private.submit_enterprise_registration(p_details jsonb,p_request uuid,p_application uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); existing public.enterprise_applications%rowtype;
  field text; value jsonb; normalized jsonb:='{}'; fingerprint text; result uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null)
     or not exists(select 1 from public.profiles where id=actor and is_active) then raise exception 'verified_account_required'; end if;
  if p_request is null or p_details is null or jsonb_typeof(p_details)<>'object' or octet_length(p_details::text)>16000 then raise exception 'invalid_registration'; end if;
  for field,value in select * from jsonb_each(p_details) loop
    if field <> all(array['company_name','tax_id','industry','address','website_url','contact_name','contact_title','contact_email','contact_phone','phone_extension','mobile','region','contribution_kind','contribution_description','direction'])
      or jsonb_typeof(value)<>'string' then raise exception 'invalid_registration'; end if;
    normalized:=normalized||jsonb_build_object(field,btrim(p_details->>field));
  end loop;
  foreach field in array array['company_name','tax_id','industry','address','contact_name','contact_title','contact_email','contact_phone','mobile','region','contribution_kind','contribution_description'] loop
    if coalesce(normalized->>field,'')='' then raise exception 'required_fields_missing'; end if;
  end loop;
  foreach field in array array['company_name','industry','contact_name','contact_title','region'] loop
    if length(normalized->>field)>160 then raise exception 'field_too_long'; end if;
  end loop;
  if length(normalized->>'address')>500 or length(normalized->>'website_url')>500 or length(normalized->>'contribution_description')>3000 then raise exception 'field_too_long'; end if;
  if normalized->>'tax_id' !~ '^[0-9]{8}$' then raise exception 'invalid_tax_id'; end if;
  if normalized->>'contact_email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(normalized->>'contact_email')>254 then raise exception 'invalid_email'; end if;
  if normalized->>'contact_phone' !~ '^\+?[0-9 ()-]{6,30}$' or normalized->>'mobile' !~ '^\+?[0-9 ()-]{8,30}$'
     or coalesce(normalized->>'phone_extension','') !~ '^[0-9]{0,10}$' then raise exception 'invalid_phone'; end if;
  if coalesce(normalized->>'website_url','')<>'' and normalized->>'website_url' !~ '^https?://[^[:space:]/?#]+([/?#][^[:space:]]*)?$' then raise exception 'invalid_website'; end if;
  if normalized->>'contribution_kind' not in ('product','service','both') then raise exception 'invalid_contribution'; end if;
  if coalesce(normalized->>'direction','consult') not in ('care','connection','esg','consult') then raise exception 'invalid_direction'; end if;
  fingerprint:=md5(normalized::text||coalesce(p_application::text,''));
  perform pg_advisory_xact_lock(hashtextextended('enterprise-registration:'||actor::text,0));
  select * into existing from public.enterprise_applications where registration_key=p_request for update;
  if found then
    if existing.requester_user_id<>actor or existing.registration_hash<>fingerprint then raise exception 'request_conflict'; end if;
    return existing.id;
  end if;
  if p_application is not null then
    select * into existing from public.enterprise_applications where id=p_application for update;
    if not found or existing.requester_user_id<>actor then raise exception 'application_not_found'; end if;
    if existing.status<>'needs_info' then raise exception 'application_not_editable'; end if;
  end if;
  if exists(select 1 from public.enterprise_applications where requester_user_id=actor and tax_id=normalized->>'tax_id'
    and status not in ('rejected','cancelled') and id is distinct from p_application) then raise exception 'application_already_exists'; end if;
  if p_application is null then
    insert into public.enterprise_applications(requester_user_id,company_name,tax_id,contact_name,contact_email)
      values(actor,normalized->>'company_name',normalized->>'tax_id',normalized->>'contact_name',lower(normalized->>'contact_email')) returning id into result;
  else result:=p_application; end if;
  update public.enterprise_applications set
    company_name=normalized->>'company_name',tax_id=normalized->>'tax_id',industry=normalized->>'industry',address=normalized->>'address',
    website_url=nullif(normalized->>'website_url',''),contact_name=normalized->>'contact_name',contact_title=normalized->>'contact_title',
    contact_email=lower(normalized->>'contact_email'),contact_phone=normalized->>'contact_phone',phone_extension=nullif(normalized->>'phone_extension',''),
    mobile=normalized->>'mobile',region=normalized->>'region',contribution_kind=normalized->>'contribution_kind',contribution_description=normalized->>'contribution_description',
    share_options=case normalized->>'contribution_kind' when 'product' then array['產品'] when 'service' then array['服務'] else array['產品','服務'] end,
    direction=coalesce(normalized->>'direction','consult'),status='submitted',review_note=null,enterprise_id=null,updated_at=now(),registration_key=p_request,registration_hash=fingerprint
  where id=result;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
    values(actor,'applicant',case when p_application is null then 'enterprise_registration_submitted' else 'enterprise_registration_resubmitted' end,'enterprise_application',result::text,'Enterprise registration submitted for private review');
  return result;
end;$$;
create function public.submit_enterprise_registration(p_details jsonb,p_request uuid,p_application uuid default null)
returns uuid language sql security invoker set search_path='' as $$select private.submit_enterprise_registration(p_details,p_request,p_application);$$;
revoke all on function private.submit_enterprise_registration(jsonb,uuid,uuid),public.submit_enterprise_registration(jsonb,uuid,uuid) from public,anon;
grant execute on function private.submit_enterprise_registration(jsonb,uuid,uuid),public.submit_enterprise_registration(jsonb,uuid,uuid) to authenticated;

-- Approved industry may be used by the enterprise network; contact details stay in the private application.
create function private.enterprise_registration_approved() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='approved' and old.status is distinct from new.status and new.enterprise_id is not null and new.industry is not null then
    if not (private.is_admin('enterprise_reviewer') or private.is_admin('admin')) then raise exception 'admin_required'; end if;
    update public.enterprises set industry=new.industry,updated_at=now() where id=new.enterprise_id;
  end if;
  return new;
end;$$;
revoke all on function private.enterprise_registration_approved() from public,anon,authenticated;
create trigger enterprise_registration_approval after update of status on public.enterprise_applications
for each row execute function private.enterprise_registration_approved();
