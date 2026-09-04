-- V590: controlled reward catalog lifecycle.
create or replace function public.admin_upsert_reward_catalog(
  p_reward_id uuid,
  p_category text,
  p_title text,
  p_description text,
  p_point_cost integer,
  p_stock_total integer,
  p_min_level integer,
  p_min_footprints integer,
  p_status public.review_status,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_old public.reward_catalog%rowtype; v_remaining integer;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
 if p_category not in ('daily','selected','rare','secret') then raise exception 'invalid_category'; end if;
 if trim(coalesce(p_title,''))='' then raise exception 'title_required'; end if;
 if coalesce(p_point_cost,-1)<0 or coalesce(p_min_footprints,-1)<0 or coalesce(p_min_level,1) not between 1 and 5 then raise exception 'invalid_eligibility'; end if;
 if p_stock_total is not null and p_stock_total<0 then raise exception 'invalid_stock'; end if;
 if p_starts_at is not null and p_ends_at is not null and p_ends_at<=p_starts_at then raise exception 'invalid_period'; end if;
 if p_status not in ('draft','approved','rejected') then raise exception 'invalid_status'; end if;
 if p_reward_id is null then
   insert into public.reward_catalog(category,title,description,point_cost,stock_total,stock_remaining,min_level,min_footprints,status,starts_at,ends_at)
   values(p_category,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_point_cost,p_stock_total,p_stock_total,coalesce(p_min_level,1),p_min_footprints,p_status,p_starts_at,p_ends_at)
   returning id into v_id;
 else
   select * into v_old from public.reward_catalog where id=p_reward_id for update;
   if not found then raise exception 'reward_not_found'; end if;
   if exists(select 1 from public.reward_redemptions where reward_id=p_reward_id and status in ('submitted','under_review','approved'))
      and (p_point_cost<>v_old.point_cost or p_stock_total is distinct from v_old.stock_total) then
      raise exception 'pending_redemptions_lock_cost_stock';
   end if;
   if p_stock_total is null then v_remaining:=null;
   elsif v_old.stock_total is null then v_remaining:=p_stock_total;
   else v_remaining:=greatest(0,p_stock_total-(v_old.stock_total-coalesce(v_old.stock_remaining,0))); end if;
   update public.reward_catalog set category=p_category,title=trim(p_title),description=nullif(trim(coalesce(p_description,'')),''),point_cost=p_point_cost,
     stock_total=p_stock_total,stock_remaining=v_remaining,min_level=coalesce(p_min_level,1),min_footprints=p_min_footprints,status=p_status,
     starts_at=p_starts_at,ends_at=p_ends_at,updated_at=now() where id=p_reward_id returning id into v_id;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'admin',case when p_reward_id is null then 'create_reward_catalog' else 'update_reward_catalog' end,'reward_catalog',v_id::text,'共享所目錄由管理端受控維護');
 return v_id;
end;$$;
revoke all on function public.admin_upsert_reward_catalog(uuid,text,text,text,integer,integer,integer,integer,public.review_status,timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_upsert_reward_catalog(uuid,text,text,text,integer,integer,integer,integer,public.review_status,timestamptz,timestamptz) to authenticated;
