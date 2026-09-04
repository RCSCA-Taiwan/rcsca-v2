-- V440: real enterprise onboarding + protected support intake.
create table if not exists public.enterprise_applications (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  enterprise_id uuid references public.enterprises(id) on delete set null,
  company_name text not null,
  tax_id text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  region text,
  share_options text[] not null default '{}',
  direction text,
  status public.review_status not null default 'submitted',
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.enterprise_applications enable row level security;
create policy "enterprise applications own read" on public.enterprise_applications for select using (requester_user_id=auth.uid() or public.is_admin());

create or replace function public.submit_enterprise_application(
 p_company_name text,p_tax_id text,p_contact_name text,p_contact_email text,p_contact_phone text,p_region text,p_share_options text[],p_direction text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_ent uuid;
begin
 if v_uid is null then raise exception 'authentication required'; end if;
 if nullif(trim(p_company_name),'') is null or nullif(trim(p_tax_id),'') is null or nullif(trim(p_contact_name),'') is null or nullif(trim(p_contact_email),'') is null then raise exception 'required fields missing'; end if;
 select id into v_ent from public.enterprises where tax_id=trim(p_tax_id) limit 1;
 insert into public.enterprise_applications(requester_user_id,enterprise_id,company_name,tax_id,contact_name,contact_email,contact_phone,region,share_options,direction)
 values(v_uid,v_ent,trim(p_company_name),trim(p_tax_id),trim(p_contact_name),trim(p_contact_email),nullif(trim(p_contact_phone),''),nullif(trim(p_region),''),coalesce(p_share_options,'{}'),p_direction)
 returning id into v_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_uid,'applicant','enterprise_application_submitted','enterprise_application',v_id::text,p_company_name);
 return v_id;
end;$$;

grant execute on function public.submit_enterprise_application(text,text,text,text,text,text,text[],text) to authenticated;

create or replace function public.submit_support_case(p_categories text[],p_contact_name text,p_mobile text,p_region text,p_detail text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_case uuid; c text;
begin
 if v_uid is null then raise exception 'authentication required'; end if;
 if coalesce(array_length(p_categories,1),0)=0 or nullif(trim(p_contact_name),'') is null or nullif(trim(p_mobile),'') is null or nullif(trim(p_detail),'') is null then raise exception 'required fields missing'; end if;
 insert into public.support_cases(owner_user_id,title,public_summary,private_detail,privacy,status)
 values(v_uid,'生活支持需求',array_to_string(p_categories,'、')||case when nullif(trim(p_region),'') is not null then '｜'||trim(p_region) else '' end,
 '聯絡人：'||trim(p_contact_name)||E'\n手機：'||trim(p_mobile)||E'\n地區：'||coalesce(trim(p_region),'')||E'\n完整說明：'||trim(p_detail),'restricted','submitted') returning id into v_case;
 foreach c in array p_categories loop insert into public.case_needs(case_id,category,description,status) values(v_case,c,trim(p_detail),'submitted'); end loop;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_uid,'requester','support_case_submitted','support_case',v_case::text,array_to_string(p_categories,'、'));
 return v_case;
end;$$;
grant execute on function public.submit_support_case(text[],text,text,text,text) to authenticated;
