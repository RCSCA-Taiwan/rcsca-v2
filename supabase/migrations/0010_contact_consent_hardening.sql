-- V160 hardening: contact consent rows are immutable in identity and notifications are idempotent.

create unique index if not exists uq_user_notifications_related
on public.user_notifications(recipient_user_id,kind,related_type,related_id)
where related_id is not null;

create or replace function private.before_contact_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'UPDATE' and (new.response_id <> old.response_id or new.user_id <> old.user_id) then
    raise exception 'contact_consent_identity_is_immutable';
  end if;
  new.updated_at = now();
  new.consented_at = case when new.consented then coalesce(new.consented_at,now()) else null end;
  return new;
end;
$$;

create or replace function private.sync_contact_exchange(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_response public.network_match_responses%rowtype;
  v_requester uuid;
  v_both boolean;
begin
  select * into v_response from public.network_match_responses where id = p_response_id;
  if not found then return; end if;
  select requester_user_id into v_requester from public.network_requests where id = v_response.request_id;
  if v_requester is null then return; end if;

  select count(*) = 2 into v_both
  from public.network_contact_consents c
  where c.response_id = p_response_id
    and c.consented = true
    and c.user_id in (v_requester, v_response.responder_user_id);

  if not v_both then
    update public.network_match_responses set contact_exchange_allowed=false,updated_at=now() where id=p_response_id;
    delete from public.network_contact_reveals where response_id=p_response_id;
    return;
  end if;

  update public.network_match_responses set contact_exchange_allowed=true,status='matched',updated_at=now() where id=p_response_id;

  insert into public.network_contact_reveals(response_id,visible_to_user_id,counterparty_user_id,counterparty_display_name,counterparty_email,counterparty_mobile)
  select p_response_id,v_requester,p.id,p.display_name,p.email,p.mobile from public.profiles p where p.id=v_response.responder_user_id
  on conflict (response_id,visible_to_user_id) do update set counterparty_display_name=excluded.counterparty_display_name,counterparty_email=excluded.counterparty_email,counterparty_mobile=excluded.counterparty_mobile;

  insert into public.network_contact_reveals(response_id,visible_to_user_id,counterparty_user_id,counterparty_display_name,counterparty_email,counterparty_mobile)
  select p_response_id,v_response.responder_user_id,p.id,p.display_name,p.email,p.mobile from public.profiles p where p.id=v_requester
  on conflict (response_id,visible_to_user_id) do update set counterparty_display_name=excluded.counterparty_display_name,counterparty_email=excluded.counterparty_email,counterparty_mobile=excluded.counterparty_mobile;

  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values
    (v_requester,'network_contact_ready','雙方已同意交換聯絡方式','你可以在媒合頁查看對方已同意公開的聯絡資訊。','network_match_response',p_response_id),
    (v_response.responder_user_id,'network_contact_ready','雙方已同意交換聯絡方式','你可以在媒合頁查看對方已同意公開的聯絡資訊。','network_match_response',p_response_id)
  on conflict do nothing;
end;
$$;
