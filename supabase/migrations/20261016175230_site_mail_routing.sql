-- Private operational routing; do not embed the operator's address in public source.
create table private.site_mail_routing (
 singleton boolean primary key default true check(singleton),
 recipient_email text not null check(length(recipient_email)<=254 and recipient_email~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 subject_prefix text not null default '【RCSCA官網】' check(length(subject_prefix) between 1 and 80),
 gmail_label text not null default 'RCSCA官網',
 updated_at timestamptz not null default now()
);
alter table private.site_mail_routing enable row level security;
revoke all on private.site_mail_routing from public,anon,authenticated;
create function public.admin_site_mail_routing()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_build_object('recipient_email',recipient_email,'subject_prefix',subject_prefix,'gmail_label',gmail_label,'delivery_status','sender_setup_pending') from private.site_mail_routing where singleton),jsonb_build_object('delivery_status','recipient_not_configured'));
end;$$;
revoke all on function public.admin_site_mail_routing() from public,anon;
grant execute on function public.admin_site_mail_routing() to authenticated;
