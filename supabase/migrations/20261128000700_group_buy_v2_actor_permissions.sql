-- Draft internal authorization. Staff grants require explicit administrator provisioning.
create table public.group_buy_v2_staff_permissions (
 user_id uuid not null references auth.users(id),
 permission text not null check(permission in ('verify_payment','expire_order','review_refund','resolve_dispute','approve_settlement')),
 primary key(user_id,permission)
);
alter table public.group_buy_v2_staff_permissions enable row level security;
revoke all on public.group_buy_v2_staff_permissions from public,anon,authenticated,service_role;
-- Authenticated identity is derived from the session, never supplied by the caller.
create function public.group_buy_v2_actor_transition(
 p_order uuid,p_request uuid,p_event text,p_amount numeric default null,p_reference text default null
) returns text language plpgsql security invoker set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_order public.group_buy_v2_orders%rowtype;
 v_proposal public.group_buy_proposals_v2%rowtype;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select p.* into v_proposal from public.group_buy_proposals_v2 p
 join public.group_buy_v2_orders o on o.proposal_id=p.id where o.id=p_order for update of p;
 if not found then raise exception 'Forbidden'; end if;
 select * into strict v_order from public.group_buy_v2_orders where id=p_order for update;
 case p_event
 when 'cancel','confirm_delivery' then
 if v_order.buyer_id<>v_actor then raise exception 'Forbidden'; end if;
 when 'dispatch' then
 if v_proposal.proposer_user_id<>v_actor then raise exception 'Forbidden'; end if;
 when 'bank_verified','expire' then
 if not exists(select 1 from public.group_buy_v2_staff_permissions where user_id=v_actor and permission=case when p_event='bank_verified' then 'verify_payment' else 'expire_order' end) then raise exception 'Forbidden'; end if;
 else raise exception 'Forbidden';
 end case;
 return public.group_buy_v2_transition(p_order,p_request,v_actor,p_event,p_amount,p_reference);
end $$;
revoke all on function public.group_buy_v2_actor_transition(uuid,uuid,text,numeric,text) from public,anon,authenticated,service_role;
-- No grants: staff provisioning, verified seller delegation and authenticated execution boundary require integration tests.
