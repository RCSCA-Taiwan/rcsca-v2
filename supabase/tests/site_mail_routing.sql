begin;
do $$begin
 if has_function_privilege('anon','public.admin_site_mail_routing()','EXECUTE') or has_table_privilege('authenticated','private.site_mail_routing','SELECT') then raise exception 'routing_exposed';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',:'member_id','role','authenticated')::text,true);
set local role authenticated;
do $$begin
 begin perform public.admin_site_mail_routing();raise exception 'member_read_routing';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
end$$;
reset role;
insert into private.site_mail_routing(recipient_email) values('routing@example.invalid') on conflict(singleton) do update set recipient_email=excluded.recipient_email;
insert into public.admin_roles(user_id,role_key) values(:'member_id','admin');
set local role authenticated;
do $$declare r jsonb:=public.admin_site_mail_routing();begin
 if r->>'recipient_email'<>'routing@example.invalid' or r->>'subject_prefix'<>'【RCSCA官網】' or r->>'delivery_status'<>'sender_setup_pending' then raise exception 'routing_state_incorrect';end if;
end$$;
reset role;
select 'PASS: mail recipient private, ordinary member denied, admin sees subject prefix and honest sender-pending state; rolled back';
rollback;
