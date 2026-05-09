create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Authenticated users can create bootstrap organizations" on public.organizations;

revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from authenticated;
revoke execute on function public.is_org_member(uuid) from public;

create index if not exists organization_members_user_id_idx
on public.organization_members(user_id);

create index if not exists sync_records_updated_by_idx
on public.sync_records(updated_by);

drop policy if exists "Members can invite members or claim empty organization" on public.organization_members;
create policy "Members can invite members or claim empty organization"
on public.organization_members
for insert
to authenticated
with check (
  public.is_org_member(organization_id)
  or (
    user_id = (select auth.uid())
    and not exists (
      select 1
      from public.organization_members existing
      where existing.organization_id = organization_members.organization_id
    )
  )
);

drop policy if exists "Members can insert sync records" on public.sync_records;
create policy "Members can insert sync records"
on public.sync_records
for insert
to authenticated
with check (public.is_org_member(organization_id) and updated_by = (select auth.uid()));

drop policy if exists "Members can update sync records" on public.sync_records;
create policy "Members can update sync records"
on public.sync_records
for update
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id) and updated_by = (select auth.uid()));
