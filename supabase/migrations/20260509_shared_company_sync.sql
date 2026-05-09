create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.sync_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity text not null,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz not null,
  deleted_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity, record_id)
);

insert into public.organizations (slug, name)
values ('vianexo-main', 'ViaNexo')
on conflict (slug) do nothing;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

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

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

drop trigger if exists sync_records_touch_updated_at on public.sync_records;
create trigger sync_records_touch_updated_at
before update on public.sync_records
for each row execute function public.touch_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.sync_records enable row level security;

drop policy if exists "Members can view organizations" on public.organizations;
drop policy if exists "Authenticated users can view organizations" on public.organizations;
create policy "Authenticated users can view organizations"
on public.organizations
for select
to authenticated
using (true);

drop policy if exists "Members can view members" on public.organization_members;
create policy "Members can view members"
on public.organization_members
for select
to authenticated
using (public.is_org_member(organization_id));

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

drop policy if exists "Members can read sync records" on public.sync_records;
create policy "Members can read sync records"
on public.sync_records
for select
to authenticated
using (public.is_org_member(organization_id));

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

revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from authenticated;
revoke execute on function public.is_org_member(uuid) from public;

create index if not exists organization_members_user_id_idx
on public.organization_members(user_id);

create index if not exists sync_records_updated_by_idx
on public.sync_records(updated_by);
