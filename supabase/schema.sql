-- Pipeline schema. Run this in the Supabase SQL editor.
-- Every row is owned by a single user and isolated with row level security.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  track text not null check (
    track in ('Software Engineering', 'Cybersecurity', 'Other')
  ),
  resume_version text,
  status text not null check (
    status in (
      'Wishlist', 'Applied', 'OA/Assessment', 'Phone Screen',
      'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'
    )
  ),
  source text not null check (
    source in (
      'LinkedIn', 'Referral', 'Company site',
      'Career fair', 'Cold outreach', 'Other'
    )
  ),
  location text,
  work_mode text check (work_mode in ('Remote', 'Hybrid', 'Onsite')),
  date_applied timestamptz,
  next_action_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.touchpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  contact_name text not null,
  company text not null,
  channel text not null check (
    channel in ('LinkedIn', 'Email', 'In person', 'Referral')
  ),
  type text not null check (
    type in (
      'Cold outreach', 'Warm intro', 'Referral ask',
      'Follow-up', 'Thank you'
    )
  ),
  date timestamptz not null default now(),
  status text not null check (
    status in ('Sent', 'Replied', 'No response', 'Referral confirmed')
  ),
  notes text,
  follow_up_date timestamptz,
  follow_up_done boolean not null default false,
  contact_email text,
  contact_title text,
  contact_linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cached AI search plan (normalized company, LinkedIn slug, target personas).
alter table public.applications
  add column if not exists search_plan jsonb;

-- Existing databases created before follow-ups shipped.
alter table public.touchpoints
  add column if not exists follow_up_date timestamptz;
alter table public.touchpoints
  add column if not exists follow_up_done boolean not null default false;

-- Existing databases created before outreach shipped.
alter table public.touchpoints
  add column if not exists contact_email text;
alter table public.touchpoints
  add column if not exists contact_title text;
alter table public.touchpoints
  add column if not exists contact_linkedin_url text;

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  file_name text not null,
  file_path text not null,
  size_bytes bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity goals. Targets live in phases so a plan can ramp week over week.
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  start_date date not null default current_date,
  end_date date,
  -- ISO weekday numbers, 0 = Sunday. Days outside this set never owe anything.
  active_days smallint[] not null default '{1,2,3,4,5}',
  -- Day boundaries are the user's, not UTC, or evening activity lands tomorrow.
  timezone text not null default 'UTC',
  goal_text text,
  rationale text,
  -- [{ label, weeks, targets: [{ metric, count, period }] }]
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_created_idx
  on public.resumes (user_id, created_at desc);

create index if not exists strategies_user_status_idx
  on public.strategies (user_id, status, start_date desc);

create index if not exists applications_user_updated_idx
  on public.applications (user_id, updated_at desc);
create index if not exists applications_user_status_idx
  on public.applications (user_id, status);
create index if not exists touchpoints_user_date_idx
  on public.touchpoints (user_id, date desc);
create index if not exists touchpoints_application_idx
  on public.touchpoints (application_id);
create index if not exists touchpoints_follow_up_idx
  on public.touchpoints (user_id, follow_up_date)
  where follow_up_done = false;

-- Keeps updated_at honest, which is what drives stale-application highlighting.
-- Only bump updated_at when the user actually changed something. Caching the AI
-- search plan is bookkeeping, and bumping on it would reset stale highlighting.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'search_plan' - 'updated_at')
     is distinct from (to_jsonb(old) - 'search_plan' - 'updated_at') then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists touchpoints_set_updated_at on public.touchpoints;
create trigger touchpoints_set_updated_at
  before update on public.touchpoints
  for each row execute function public.set_updated_at();

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at
  before update on public.strategies
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;
alter table public.touchpoints enable row level security;
alter table public.resumes enable row level security;
alter table public.strategies enable row level security;

drop policy if exists "Users read own applications" on public.applications;
create policy "Users read own applications"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own applications" on public.applications;
create policy "Users insert own applications"
  on public.applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own applications" on public.applications;
create policy "Users update own applications"
  on public.applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own applications" on public.applications;
create policy "Users delete own applications"
  on public.applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own touchpoints" on public.touchpoints;
create policy "Users read own touchpoints"
  on public.touchpoints for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own touchpoints" on public.touchpoints;
create policy "Users insert own touchpoints"
  on public.touchpoints for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own touchpoints" on public.touchpoints;
create policy "Users update own touchpoints"
  on public.touchpoints for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own touchpoints" on public.touchpoints;
create policy "Users delete own touchpoints"
  on public.touchpoints for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own resumes" on public.resumes;
create policy "Users read own resumes"
  on public.resumes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own resumes" on public.resumes;
create policy "Users insert own resumes"
  on public.resumes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own resumes" on public.resumes;
create policy "Users update own resumes"
  on public.resumes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own resumes" on public.resumes;
create policy "Users delete own resumes"
  on public.resumes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own strategies" on public.strategies;
create policy "Users read own strategies"
  on public.strategies for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own strategies" on public.strategies;
create policy "Users insert own strategies"
  on public.strategies for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own strategies" on public.strategies;
create policy "Users update own strategies"
  on public.strategies for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own strategies" on public.strategies;
create policy "Users delete own strategies"
  on public.strategies for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Resume files. Private bucket; each user owns the folder named after their id.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users read own resume files" on storage.objects;
create policy "Users read own resume files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users upload own resume files" on storage.objects;
create policy "Users upload own resume files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own resume files" on storage.objects;
create policy "Users delete own resume files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Clerk. Session tokens replace Supabase Auth. Clerk ids are text (user_2…),
-- not uuids, and they do not live in auth.users, so the FKs have to go.
-- Policies that mention user_id must be dropped before the type change.
-- ---------------------------------------------------------------------------
drop policy if exists "Users read own applications" on public.applications;
drop policy if exists "Users insert own applications" on public.applications;
drop policy if exists "Users update own applications" on public.applications;
drop policy if exists "Users delete own applications" on public.applications;
drop policy if exists "Users read own touchpoints" on public.touchpoints;
drop policy if exists "Users insert own touchpoints" on public.touchpoints;
drop policy if exists "Users update own touchpoints" on public.touchpoints;
drop policy if exists "Users delete own touchpoints" on public.touchpoints;
drop policy if exists "Users read own resumes" on public.resumes;
drop policy if exists "Users insert own resumes" on public.resumes;
drop policy if exists "Users update own resumes" on public.resumes;
drop policy if exists "Users delete own resumes" on public.resumes;
drop policy if exists "Users read own strategies" on public.strategies;
drop policy if exists "Users insert own strategies" on public.strategies;
drop policy if exists "Users update own strategies" on public.strategies;
drop policy if exists "Users delete own strategies" on public.strategies;

alter table public.applications drop constraint if exists applications_user_id_fkey;
alter table public.touchpoints drop constraint if exists touchpoints_user_id_fkey;
alter table public.resumes drop constraint if exists resumes_user_id_fkey;
alter table public.strategies drop constraint if exists strategies_user_id_fkey;

alter table public.applications alter column user_id type text using user_id::text;
alter table public.touchpoints alter column user_id type text using user_id::text;
alter table public.resumes alter column user_id type text using user_id::text;
alter table public.strategies alter column user_id type text using user_id::text;

alter table public.applications
  alter column user_id set default (auth.jwt()->>'sub');
alter table public.touchpoints
  alter column user_id set default (auth.jwt()->>'sub');
alter table public.resumes
  alter column user_id set default (auth.jwt()->>'sub');
alter table public.strategies
  alter column user_id set default (auth.jwt()->>'sub');

-- RLS matches the Clerk `sub` claim, not auth.uid() from Supabase Auth.
create or replace function public.clerk_user_id()
returns text
language sql
stable
as $$
  select auth.jwt()->>'sub';
$$;

drop policy if exists "Users read own applications" on public.applications;
create policy "Users read own applications"
  on public.applications for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert own applications" on public.applications;
create policy "Users insert own applications"
  on public.applications for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own applications" on public.applications;
create policy "Users update own applications"
  on public.applications for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete own applications" on public.applications;
create policy "Users delete own applications"
  on public.applications for delete
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users read own touchpoints" on public.touchpoints;
create policy "Users read own touchpoints"
  on public.touchpoints for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert own touchpoints" on public.touchpoints;
create policy "Users insert own touchpoints"
  on public.touchpoints for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own touchpoints" on public.touchpoints;
create policy "Users update own touchpoints"
  on public.touchpoints for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete own touchpoints" on public.touchpoints;
create policy "Users delete own touchpoints"
  on public.touchpoints for delete
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users read own resumes" on public.resumes;
create policy "Users read own resumes"
  on public.resumes for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert own resumes" on public.resumes;
create policy "Users insert own resumes"
  on public.resumes for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own resumes" on public.resumes;
create policy "Users update own resumes"
  on public.resumes for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete own resumes" on public.resumes;
create policy "Users delete own resumes"
  on public.resumes for delete
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users read own strategies" on public.strategies;
create policy "Users read own strategies"
  on public.strategies for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert own strategies" on public.strategies;
create policy "Users insert own strategies"
  on public.strategies for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own strategies" on public.strategies;
create policy "Users update own strategies"
  on public.strategies for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete own strategies" on public.strategies;
create policy "Users delete own strategies"
  on public.strategies for delete
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users read own resume files" on storage.objects;
create policy "Users read own resume files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (select public.clerk_user_id()) = (storage.foldername(name))[1]
  );

drop policy if exists "Users upload own resume files" on storage.objects;
create policy "Users upload own resume files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (select public.clerk_user_id()) = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own resume files" on storage.objects;
create policy "Users delete own resume files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (select public.clerk_user_id()) = (storage.foldername(name))[1]
  );

-- First Clerk login with the same email as an old Supabase Auth user takes
-- over those rows (and resume files) so existing pipelines are not orphaned.
create or replace function public.claim_legacy_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text := auth.jwt()->>'sub';
  user_email text := coalesce(
    auth.jwt()->>'email',
    auth.jwt()->'user_metadata'->>'email'
  );
  old_id text;
  moved int := 0;
begin
  if new_id is null or user_email is null or user_email = '' then
    return 0;
  end if;

  if exists (select 1 from public.applications where user_id = new_id limit 1)
     or exists (select 1 from public.touchpoints where user_id = new_id limit 1)
     or exists (select 1 from public.strategies where user_id = new_id limit 1)
     or exists (select 1 from public.resumes where user_id = new_id limit 1) then
    return 0;
  end if;

  select id::text into old_id
  from auth.users
  where lower(email) = lower(user_email)
  limit 1;

  if old_id is null or old_id = new_id then
    return 0;
  end if;

  update public.applications set user_id = new_id where user_id = old_id;
  get diagnostics moved = row_count;
  update public.touchpoints set user_id = new_id where user_id = old_id;
  update public.strategies set user_id = new_id where user_id = old_id;
  update public.resumes
    set user_id = new_id,
        file_path = new_id || substr(file_path, length(old_id) + 1)
    where user_id = old_id;
  update storage.objects
    set name = new_id || substr(name, length(old_id) + 1)
    where bucket_id = 'resumes' and name like old_id || '/%';

  return moved;
end;
$$;

revoke all on function public.claim_legacy_data() from public;
grant execute on function public.claim_legacy_data() to authenticated;

-- Shared Gemini / Apollo keys. One row per user per UTC day.
create table if not exists public.usage_counters (
  user_id text not null,
  day date not null default ((timezone('utc', now()))::date),
  ai_calls integer not null default 0,
  apollo_reveals integer not null default 0,
  primary key (user_id, day)
);

alter table public.usage_counters enable row level security;

drop policy if exists "Users read own usage" on public.usage_counters;
create policy "Users read own usage"
  on public.usage_counters for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

create or replace function public.consume_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt()->>'sub';
  today date := (timezone('utc', now()))::date;
  ai_limit int := 40;
  apollo_limit int := 15;
  current_ai int;
  current_apollo int;
begin
  if uid is null then
    return false;
  end if;
  if p_kind not in ('ai', 'apollo') then
    raise exception 'unknown quota kind';
  end if;

  insert into public.usage_counters (user_id, day)
  values (uid, today)
  on conflict (user_id, day) do nothing;

  select ai_calls, apollo_reveals into current_ai, current_apollo
  from public.usage_counters
  where user_id = uid and day = today
  for update;

  if p_kind = 'ai' then
    if current_ai >= ai_limit then
      return false;
    end if;
    update public.usage_counters
      set ai_calls = ai_calls + 1
      where user_id = uid and day = today;
  else
    if current_apollo >= apollo_limit then
      return false;
    end if;
    update public.usage_counters
      set apollo_reveals = apollo_reveals + 1
      where user_id = uid and day = today;
  end if;

  return true;
end;
$$;

revoke all on function public.consume_quota(text) from public;
grant execute on function public.consume_quota(text) to authenticated;
