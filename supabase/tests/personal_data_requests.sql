begin;
select set_config('rcsca.data_member',gen_random_uuid()::text,true);
select set_config('rcsca.data_admin',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['rcsca.data_member','rcsca.data_admin']) k;
update public.profiles set display_name='Synthetic retained profile' where id=current_setting('rcsca.data_member')::uuid;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.data_admin')::uuid,'admin');
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.data_member')::uuid,'adjust',50,'data_request_test');
insert into public.xp_transactions(user_id,xp,source_type) values(current_setting('rcsca.data_member')::uuid,42,'data_request_test');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_member'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.personal_data_requests','select') then raise exception 'raw_data_requests_exposed';end if;
 if has_function_privilege('anon','public.personal_data_requests_self()','execute') then raise exception 'anonymous_requests_exposed';end if;
 begin perform public.admin_personal_data_requests();raise exception 'admin_requests_exposed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.personal_data_request_submit('reset','{}','Synthetic reset',true,false);raise exception 'single_confirmation_accepted';exception when raise_exception then if sqlerrm<>'two_confirmations_required' then raise;end if;end;
 begin perform public.personal_data_request_submit('delete','{}','Synthetic deletion',false,true);raise exception 'missing_first_confirmation_accepted';exception when raise_exception then if sqlerrm<>'two_confirmations_required' then raise;end if;end;
 begin perform public.personal_data_request_submit('edit','{"membership_type":"lifetime"}','Synthetic edit',false,false);raise exception 'privileged_change_accepted';exception when raise_exception then if sqlerrm<>'invalid_requested_changes' then raise;end if;end;
end $$;
select set_config('rcsca.data_request',public.personal_data_request_submit('reset','{}','Synthetic reset',true,true)::text,true);
do $$ begin
 if public.personal_data_requests_self()->0->>'reset_scope'<>'profile_points_xp_level_footprints' then raise exception 'reset_scope_lost';end if;
 begin perform public.personal_data_request_submit('delete','{}','Duplicate',true,true);raise exception 'duplicate_request_accepted';exception when raise_exception then if sqlerrm<>'existing_data_request_pending' then raise;end if;end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.data_member')::uuid,'admin');
set local role authenticated;
do $$ begin
 begin perform public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'approved','Self approval');raise exception 'self_review_accepted';exception when raise_exception then if sqlerrm<>'cannot_review_own_request' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.personal_data_requests_self()<>'[]'::jsonb then raise exception 'other_user_request_leaked';end if;
 begin perform public.personal_data_request_cancel(current_setting('rcsca.data_request')::uuid);raise exception 'other_user_cancelled';exception when raise_exception then if sqlerrm<>'request_not_cancellable' then raise;end if;end;
 begin perform public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'completed','Skipped execution',true);raise exception 'skipped_processing';exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise;end if;end;
end $$;
select public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'needs_info','Synthetic scope clarification');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_member'),'role','authenticated')::text,true);
set local role authenticated;
select public.personal_data_request_submit('reset','{}','Synthetic clarified reset',true,true,current_setting('rcsca.data_request')::uuid);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'approved','Synthetic approved; execution remains pending');
reset role;
do $$ begin
 if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.data_member')::uuid)<>50 then raise exception 'approval_reset_points';end if;
 if (select sum(xp) from public.xp_transactions where user_id=current_setting('rcsca.data_member')::uuid)<>42 then raise exception 'approval_reset_xp';end if;
 if (select display_name from public.profiles where id=current_setting('rcsca.data_member')::uuid)<>'Synthetic retained profile' then raise exception 'approval_changed_profile';end if;
end $$;
set local role authenticated;
select public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'processing','Synthetic manual processing');
do $$ begin
 begin perform public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'completed','Not confirmed',false);raise exception 'completion_without_confirmation';exception when raise_exception then if sqlerrm<>'execution_confirmation_required' then raise;end if;end;
end $$;
select public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'completed','Synthetic completion receipt only; no real user data changed',true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_member'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.data_request',public.personal_data_request_submit('delete','{}','Synthetic deletion',true,true)::text,true);
select public.personal_data_request_cancel(current_setting('rcsca.data_request')::uuid);
select set_config('rcsca.data_request',public.personal_data_request_submit('edit','{"mobile":"0900000000"}','Synthetic edit',false,false)::text,true);
select public.personal_data_request_cancel(current_setting('rcsca.data_request')::uuid);
rollback;
