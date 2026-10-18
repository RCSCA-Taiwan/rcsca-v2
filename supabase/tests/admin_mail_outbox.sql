begin;
select set_config('rcsca.mail_member',:'member_id',true);
do $$begin
 if has_table_privilege('authenticated','private.admin_mail_outbox','SELECT') or has_table_privilege('anon','private.admin_mail_attempts','SELECT') or has_function_privilege('anon','public.admin_mail_claim()','EXECUTE') then raise exception 'outbox_exposed';end if;
 if (select count(*) from pg_trigger where tgname='capture_admin_mail_submission')<>8 then raise exception 'missing_source_trigger';end if;
end$$;
insert into public.enterprise_applications(requester_user_id,company_name,tax_id,contact_name,contact_email)
values(:'member_id','Synthetic rollback mail source','MAIL-'||gen_random_uuid()::text,'Synthetic','mail@example.invalid') returning set_config('rcsca.mail_source',id::text,true);
update public.enterprise_applications set company_name='Synthetic updated' where id=current_setting('rcsca.mail_source')::uuid;
do $$begin
 if (select count(*) from private.admin_mail_outbox where source_id=current_setting('rcsca.mail_source')::uuid)<>1 then raise exception 'duplicate_submission';end if;
end$$;
update public.enterprise_applications set status='needs_info' where id=current_setting('rcsca.mail_source')::uuid;
update public.enterprise_applications set status='submitted' where id=current_setting('rcsca.mail_source')::uuid;
do $$begin
 if not exists(select 1 from private.admin_mail_outbox where source_id=current_setting('rcsca.mail_source')::uuid and submission=1 and state='cancelled') or
 not exists(select 1 from private.admin_mail_outbox where source_id=current_setting('rcsca.mail_source')::uuid and submission=2 and state='pending') then raise exception 'resubmission_or_cancellation_failed';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',:'member_id','role','authenticated')::text,true);
set local role authenticated;
do $$begin
 begin perform public.admin_mail_queue();raise exception 'member_queue_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_mail_claim();raise exception 'member_claim_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_mail_set_manual(true,true);raise exception 'member_enable_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_mail_retry(gen_random_uuid(),true);raise exception 'member_retry_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_mail_finish(gen_random_uuid(),gen_random_uuid(),'accepted',null);raise exception 'member_finish_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
end$$;
reset role;
insert into public.admin_roles(user_id,role_key) values(:'member_id','admin');
insert into private.site_mail_routing(recipient_email) values('mail-recipient@example.invalid') on conflict(singleton) do update set recipient_email=excluded.recipient_email;
set local role authenticated;
do $$begin
 if (public.admin_mail_queue()->>'manual_enabled')::boolean then raise exception 'unexpected_delivery_enabled';end if;
 begin perform public.admin_mail_claim();raise exception 'disabled_claim_allowed';exception when raise_exception then if sqlerrm<>'manual_delivery_disabled' then raise;end if;end;
 begin perform public.admin_mail_set_manual(true,false);raise exception 'missing_receipt_confirmation';exception when raise_exception then if sqlerrm<>'receipt_confirmation_required' then raise;end if;end;
end$$;
select public.admin_mail_set_manual(true,true);
select set_config('rcsca.mail_claim',public.admin_mail_claim()::text,true);
do $$declare c jsonb:=current_setting('rcsca.mail_claim')::jsonb;begin
 if c->>'recipient_email'<>'mail-recipient@example.invalid' then raise exception 'wrong_private_recipient';end if;
 if public.admin_mail_claim() is not null then raise exception 'duplicate_claim';end if;
 begin perform public.admin_mail_finish((c->>'id')::uuid,gen_random_uuid(),'accepted',null);raise exception 'wrong_lease_allowed';exception when raise_exception then if sqlerrm<>'stale_mail_attempt' then raise;end if;end;
 perform public.admin_mail_finish((c->>'id')::uuid,(c->>'lease_id')::uuid,'failed','authentication_failed');
 begin perform public.admin_mail_retry((c->>'id')::uuid,false);raise exception 'cooldown_ignored';exception when raise_exception then if sqlerrm<>'mail_retry_unavailable' then raise;end if;end;
end$$;
reset role;
update private.admin_mail_outbox set retry_after=now()-interval '1 second' where id=(current_setting('rcsca.mail_claim')::jsonb->>'id')::uuid;
set local role authenticated;
select public.admin_mail_retry((current_setting('rcsca.mail_claim')::jsonb->>'id')::uuid,false);
select set_config('rcsca.mail_second',public.admin_mail_claim()::text,true);
do $$declare old_c jsonb:=current_setting('rcsca.mail_claim')::jsonb;c jsonb:=current_setting('rcsca.mail_second')::jsonb;begin
 if c->>'id'<>old_c->>'id' or c->>'lease_id'=old_c->>'lease_id' then raise exception 'retry_lease_not_rotated';end if;
 begin perform public.admin_mail_finish((old_c->>'id')::uuid,(old_c->>'lease_id')::uuid,'accepted',null);raise exception 'old_attempt_overwrite';exception when raise_exception then if sqlerrm<>'stale_mail_attempt' then raise;end if;end;
end$$;
reset role;
update private.admin_mail_outbox set lease_until=now()-interval '1 second',retry_after=now()-interval '1 second' where id=(current_setting('rcsca.mail_second')::jsonb->>'id')::uuid;
set local role authenticated;
select public.admin_mail_queue();
do $$declare c jsonb:=current_setting('rcsca.mail_second')::jsonb;begin
 if public.admin_mail_claim() is not null then raise exception 'expired_lease_auto_retried';end if;
 begin perform public.admin_mail_retry((c->>'id')::uuid,false);raise exception 'unknown_retry_without_confirmation';exception when raise_exception then if sqlerrm<>'duplicate_confirmation_required' then raise;end if;end;
 perform public.admin_mail_retry((c->>'id')::uuid,true);
end$$;
select set_config('rcsca.mail_third',public.admin_mail_claim()::text,true);
select public.admin_mail_finish((current_setting('rcsca.mail_third')::jsonb->>'id')::uuid,(current_setting('rcsca.mail_third')::jsonb->>'lease_id')::uuid,'accepted',null);
do $$begin
 begin perform public.admin_mail_retry((current_setting('rcsca.mail_third')::jsonb->>'id')::uuid,true);raise exception 'accepted_retry_allowed';exception when raise_exception then if sqlerrm<>'mail_retry_unavailable' then raise;end if;end;
 if public.admin_mail_claim() is not null then raise exception 'accepted_reclaimed';end if;
 if public.admin_mail_queue()::text like '%recipient_email%' or public.admin_mail_queue()::text like '%source_id%' then raise exception 'queue_leaks_private_fields';end if;
end$$;
reset role;
do $$begin
 if (select count(*) from private.admin_mail_attempts where outbox_id=(current_setting('rcsca.mail_third')::jsonb->>'id')::uuid)<>3 then raise exception 'attempt_history_missing';end if;
 if (select count(*) from private.admin_mail_actions where action in ('enable_manual','retry_failed','retry_unknown'))<>3 then raise exception 'action_history_missing';end if;
end$$;
update public.enterprise_applications set status='needs_info' where id=current_setting('rcsca.mail_source')::uuid;
update public.enterprise_applications set status='submitted' where id=current_setting('rcsca.mail_source')::uuid;
set local role authenticated;
select set_config('rcsca.mail_old_unknown',public.admin_mail_claim()::text,true);
select public.admin_mail_finish((current_setting('rcsca.mail_old_unknown')::jsonb->>'id')::uuid,(current_setting('rcsca.mail_old_unknown')::jsonb->>'lease_id')::uuid,'unknown','unconfirmed');
reset role;
update private.admin_mail_outbox set retry_after=now()-interval '1 second' where id=(current_setting('rcsca.mail_old_unknown')::jsonb->>'id')::uuid;
update public.enterprise_applications set status='needs_info' where id=current_setting('rcsca.mail_source')::uuid;
update public.enterprise_applications set status='submitted' where id=current_setting('rcsca.mail_source')::uuid;
set local role authenticated;
do $$begin
 begin perform public.admin_mail_retry((current_setting('rcsca.mail_old_unknown')::jsonb->>'id')::uuid,true);raise exception 'old_submission_revived';exception when raise_exception then if sqlerrm<>'stale_mail_submission' then raise;end if;end;
end$$;
select set_config('rcsca.mail_final',public.admin_mail_claim()::text,true);
select public.admin_mail_finish((current_setting('rcsca.mail_final')::jsonb->>'id')::uuid,(current_setting('rcsca.mail_final')::jsonb->>'lease_id')::uuid,'failed','rejected');
reset role;
update private.admin_mail_outbox set attempts=5,retry_after=now()-interval '1 second' where id=(current_setting('rcsca.mail_final')::jsonb->>'id')::uuid;
set local role authenticated;
do $$begin
 begin perform public.admin_mail_retry((current_setting('rcsca.mail_final')::jsonb->>'id')::uuid,true);raise exception 'retry_limit_ignored';exception when raise_exception then if sqlerrm<>'mail_retry_unavailable' then raise;end if;end;
end$$;
reset role;
update public.enterprise_applications set status='needs_info' where id=current_setting('rcsca.mail_source')::uuid;
do $$begin
 if not exists(select 1 from private.admin_mail_outbox where id=(current_setting('rcsca.mail_final')::jsonb->>'id')::uuid and state='cancelled') then raise exception 'reviewed_source_retry_survived';end if;
end$$;
select 'PASS: eight-source outbox, no backfill, role denial, disabled delivery, receipt confirmation, dedup/resubmission, single claim, rotated leases, cooldown, expired-result uncertainty, explicit retry and audit; rolled back';
rollback;
