begin;
select set_config('rcsca.cm',gen_random_uuid()::text,true),set_config('rcsca.co',gen_random_uuid()::text,true),set_config('rcsca.ca',gen_random_uuid()::text,true),set_config('rcsca.cp',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['rcsca.cm','rcsca.co','rcsca.ca']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.ca')::uuid,'admin');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.community_posts','select') or has_table_privilege('authenticated','private.donation_records','select') then raise exception 'private_content_exposed';end if;
 begin perform public.community_post_submit(current_setting('rcsca.cp')::uuid,'Synthetic post','Synthetic body','sharing',array[]::uuid[],false);raise exception 'publication_consent_bypassed';exception when raise_exception then if sqlerrm<>'publication_consent_required' then raise;end if;end;
 begin perform public.community_image_register(current_setting('rcsca.co')||'/00000000-0000-4000-8000-000000000000.jpg');raise exception 'foreign_image_registered';exception when raise_exception then if sqlerrm<>'invalid_image_path' then raise;end if;end;
 begin perform public.admin_donation_overview();raise exception 'donation_admin_exposed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 if public.donation_contribution_self()->>'verified_total'<>'0' then raise exception 'donation_unexpected_balance';end if;
end $$;
select public.community_post_submit(current_setting('rcsca.cp')::uuid,'Synthetic post','Synthetic body','sharing',array[]::uuid[],true);
-- Retry is idempotent.
select public.community_post_submit(current_setting('rcsca.cp')::uuid,'Synthetic post','Synthetic body','sharing',array[]::uuid[],true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.co'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.community_posts_list(false)::text like '%Synthetic post%' then raise exception 'pending_post_visible_to_other';end if;
 begin perform public.community_post_withdraw(current_setting('rcsca.cp')::uuid);raise exception 'foreign_post_withdrawn';exception when raise_exception then if sqlerrm<>'post_not_withdrawable' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_community_post_review(current_setting('rcsca.cp')::uuid,'approved','Synthetic consent and content checked');
select set_config('rcsca.drecord',public.admin_donation_record(current_setting('rcsca.cm')||'@example.invalid',1000,(now() at time zone 'Asia/Taipei')::date,current_setting('rcsca.cp'),'Synthetic verified bank receipt',true)::text,true);
do $$ begin
 begin perform public.admin_donation_record(current_setting('rcsca.cm')||'@example.invalid',1000,current_date,current_setting('rcsca.cp'),'Duplicate',true);raise exception 'duplicate_donation_counted';exception when raise_exception then if sqlerrm<>'duplicate_donation_reference' then raise;end if;end;
 begin perform public.admin_donation_record(current_setting('rcsca.ca')||'@example.invalid',1000,current_date,gen_random_uuid()::text,'Self',true);raise exception 'self_donation_verified';exception when raise_exception then if sqlerrm<>'cannot_verify_own_donation' then raise;end if;end;
end $$;
select set_config('rcsca.drule',public.admin_donation_badge_rule(null,'Synthetic test badge',1000,'lifetime',current_date,true,'draft','Synthetic draft only',false)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.donation_contribution_self()->>'verified_total'<>'1000' or public.donation_contribution_self()->>'rules_active'<>'false' or public.donation_contribution_self()->'badges'<>'[]'::jsonb then raise exception 'draft_badge_awarded';end if;
end $$;
select public.community_post_report(current_setting('rcsca.cp')::uuid,'Synthetic report');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_donation_badge_rule(current_setting('rcsca.drule')::uuid,'Synthetic test badge',1000,'lifetime',current_date,true,'active','Synthetic approved fixture',false);raise exception 'unapproved_policy_activated';exception when raise_exception then if sqlerrm<>'policy_approval_required' then raise;end if;end;
end $$;
select public.admin_donation_badge_rule(current_setting('rcsca.drule')::uuid,'Synthetic test badge',1000,'lifetime',current_date,true,'active','Synthetic approved fixture',true);
select public.admin_community_post_review(current_setting('rcsca.cp')::uuid,'hidden','Synthetic report evaluated');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.donation_contribution_self()->'badges'->0->>'label'<>'Synthetic test badge' then raise exception 'verified_badge_missing';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.co'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.community_posts_list(false)::text like '%Synthetic post%' then raise exception 'hidden_post_visible';end if;
 if public.donation_contribution_self()->>'verified_total'<>'0' then raise exception 'foreign_donation_leaked';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_donation_void(current_setting('rcsca.drecord')::uuid,'Synthetic duplicate reconciliation');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.donation_contribution_self()->>'verified_total'<>'0' or public.donation_contribution_self()->'badges'<>'[]'::jsonb then raise exception 'void_donation_retained_badge';end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.point_transactions where user_id in (current_setting('rcsca.cm')::uuid,current_setting('rcsca.ca')::uuid)) or exists(select 1 from public.xp_transactions where user_id=current_setting('rcsca.cm')::uuid) then raise exception 'donation_or_post_changed_points_xp';end if;
 if (select count(*) from private.community_posts where id=current_setting('rcsca.cp')::uuid)<>1 then raise exception 'duplicate_post_created';end if;
end $$;
rollback;
