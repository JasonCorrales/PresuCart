create or replace function public.ensure_active_purchase_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_purchase_id uuid;
begin
  target_purchase_id := case when tg_op = 'DELETE' then old.purchase_id else new.purchase_id end;

  if not exists (
    select 1
    from public.purchases
    where id = target_purchase_id
      and status = 'activa'
  ) then
    raise exception 'purchase items can only be changed while the purchase is active';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger purchase_items_require_active_purchase
  before insert or update or delete on public.purchase_items
  for each row execute function public.ensure_active_purchase_item_mutation();

create or replace function public.prevent_finalized_purchase_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'activa' then
    raise exception 'finalized purchases are read-only';
  end if;

  if new.status = 'finalizada' and new.finished_at is null then
    raise exception 'finalized purchases require finished_at';
  end if;

  return new;
end;
$$;

create trigger finalized_purchases_are_read_only
  before update on public.purchases
  for each row execute function public.prevent_finalized_purchase_changes();

create or replace function public.prevent_finalized_purchase_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'finalizada' then
    raise exception 'finalized purchases cannot be deleted';
  end if;

  return old;
end;
$$;

create trigger finalized_purchases_cannot_be_deleted
  before delete on public.purchases
  for each row execute function public.prevent_finalized_purchase_delete();
