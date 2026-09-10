-- Pipeline schema. Run this in the Supabase SQL editor.
-- Every row is owned by a single user and isolated with row level security.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
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
  user_id text not null,
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
  user_id text not null,
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
  user_id text not null,
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

-- Resume files. Private bucket; each user owns the folder named after their id.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Clerk. Session tokens replace Supabase Auth. Clerk ids are text (user_2…),
-- not uuids, and they do not live in auth.users, so the FKs have to go.
-- Drop every policy first: leftover auth.uid() = user_id policies fail with
-- "operator does not exist: uuid = text" once user_id is already text.
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in (
            'applications', 'touchpoints', 'resumes', 'strategies', 'usage_counters'
          ))
       or (schemaname = 'storage' and tablename = 'objects' and policyname like '%resume%')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
  end loop;
end $$;

alter table public.applications drop constraint if exists applications_user_id_fkey;
alter table public.touchpoints drop constraint if exists touchpoints_user_id_fkey;
alter table public.resumes drop constraint if exists resumes_user_id_fkey;
alter table public.strategies drop constraint if exists strategies_user_id_fkey;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['applications', 'touchpoints', 'resumes', 'strategies']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'user_id'
        and data_type = 'uuid'
    ) then
      execute format(
        'alter table public.%I alter column user_id type text using user_id::text',
        tbl
      );
    end if;
  end loop;
end $$;

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

-- Friends and per-job chat. Additive; safe to re-run.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  addressee_id text not null,
  requester_email text,
  addressee_email text,
  requester_username text,
  addressee_username text,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships add column if not exists requester_username text;
alter table public.friendships add column if not exists addressee_username text;

create table if not exists public.job_threads (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete set null,
  owner_id text not null,
  peer_id text not null,
  company text not null,
  role text not null,
  job_url text,
  created_at timestamptz not null default now(),
  unique (application_id, peer_id)
);

create table if not exists public.job_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.job_threads (id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists job_threads_owner_idx on public.job_threads (owner_id);
create index if not exists job_threads_peer_idx on public.job_threads (peer_id);
create index if not exists job_messages_thread_idx on public.job_messages (thread_id, created_at);

alter table public.friendships enable row level security;
alter table public.job_threads enable row level security;
alter table public.job_messages enable row level security;

drop policy if exists "Users read own friendships" on public.friendships;
create policy "Users read own friendships"
  on public.friendships for select
  to authenticated
  using (
    (select public.clerk_user_id()) in (requester_id, addressee_id)
  );

drop policy if exists "Users insert friendships" on public.friendships;
create policy "Users insert friendships"
  on public.friendships for insert
  to authenticated
  with check ((select public.clerk_user_id()) = requester_id);

drop policy if exists "Users update own friendships" on public.friendships;
create policy "Users update own friendships"
  on public.friendships for update
  to authenticated
  using (
    (select public.clerk_user_id()) in (requester_id, addressee_id)
  )
  with check (
    (select public.clerk_user_id()) in (requester_id, addressee_id)
  );

drop policy if exists "Users delete own friendships" on public.friendships;
create policy "Users delete own friendships"
  on public.friendships for delete
  to authenticated
  using (
    (select public.clerk_user_id()) in (requester_id, addressee_id)
  );

alter table public.job_threads drop constraint if exists job_threads_application_id_fkey;
alter table public.job_threads
  add constraint job_threads_application_id_fkey
  foreign key (application_id) references public.applications (id) on delete set null;

drop policy if exists "Users read own threads" on public.job_threads;
create policy "Users read own threads"
  on public.job_threads for select
  to authenticated
  using (
    (select public.clerk_user_id()) in (owner_id, peer_id)
  );

drop policy if exists "Users insert threads" on public.job_threads;
create policy "Users insert threads"
  on public.job_threads for insert
  to authenticated
  with check ((select public.clerk_user_id()) = owner_id);

drop policy if exists "Users read thread messages" on public.job_messages;
create policy "Users read thread messages"
  on public.job_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.job_threads t
      where t.id = thread_id
        and (select public.clerk_user_id()) in (t.owner_id, t.peer_id)
    )
  );

drop policy if exists "Users insert thread messages" on public.job_messages;
create policy "Users insert thread messages"
  on public.job_messages for insert
  to authenticated
  with check (
    (select public.clerk_user_id()) = user_id
    and exists (
      select 1 from public.job_threads t
      where t.id = thread_id
        and (select public.clerk_user_id()) in (t.owner_id, t.peer_id)
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.job_messages;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Contacts. One person you know; touchpoints are the messages you sent them.
-- Re-runnable. Existing outreach is backfilled from email, then name+company.
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt()->>'sub'),
  name text not null,
  email text,
  linkedin_url text,
  company text not null default '',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contacts_user_email_uidx
  on public.contacts (user_id, lower(email))
  where email is not null and length(trim(email)) > 0;

create index if not exists contacts_user_name_idx
  on public.contacts (user_id, lower(name));

alter table public.touchpoints
  add column if not exists contact_id uuid references public.contacts (id) on delete set null;

create index if not exists touchpoints_contact_idx
  on public.touchpoints (contact_id);

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

drop policy if exists "Users read own contacts" on public.contacts;
create policy "Users read own contacts"
  on public.contacts for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert own contacts" on public.contacts;
create policy "Users insert own contacts"
  on public.contacts for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own contacts" on public.contacts;
create policy "Users update own contacts"
  on public.contacts for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete own contacts" on public.contacts;
create policy "Users delete own contacts"
  on public.contacts for delete
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

-- Email first: one contact per address.
insert into public.contacts (user_id, name, email, linkedin_url, company, title)
select distinct on (t.user_id, lower(trim(t.contact_email)))
  t.user_id,
  t.contact_name,
  lower(trim(t.contact_email)),
  t.contact_linkedin_url,
  t.company,
  t.contact_title
from public.touchpoints t
where t.contact_email is not null
  and length(trim(t.contact_email)) > 0
order by t.user_id, lower(trim(t.contact_email)), t.date desc
on conflict do nothing;

update public.touchpoints t
set contact_id = c.id
from public.contacts c
where t.contact_id is null
  and t.user_id = c.user_id
  and t.contact_email is not null
  and length(trim(t.contact_email)) > 0
  and lower(trim(t.contact_email)) = c.email;

-- No email: one contact per name + company.
insert into public.contacts (user_id, name, company, title, linkedin_url)
select distinct on (t.user_id, lower(t.contact_name), lower(t.company))
  t.user_id,
  t.contact_name,
  t.company,
  t.contact_title,
  t.contact_linkedin_url
from public.touchpoints t
where t.contact_id is null
  and not exists (
    select 1
    from public.contacts c
    where c.user_id = t.user_id
      and lower(c.name) = lower(t.contact_name)
      and lower(c.company) = lower(t.company)
      and c.email is null
  )
order by t.user_id, lower(t.contact_name), lower(t.company), t.date desc;

update public.touchpoints t
set contact_id = c.id
from public.contacts c
where t.contact_id is null
  and t.user_id = c.user_id
  and lower(t.contact_name) = lower(c.name)
  and lower(t.company) = lower(c.company)
  and c.email is null;

-- ---------------------------------------------------------------------------
-- Notifications + pods. Additive; safe to re-run.
-- Pods are 2–5 people. Each person keeps their own board; the pod shows
-- everyone's status on a shared job list.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  actor_id text,
  actor_handle text,
  type text not null check (type in ('job_share', 'pod_job')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create table if not exists public.pods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pod_members (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods (id) on delete cascade,
  user_id text not null,
  handle text,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invited_by text,
  created_at timestamptz not null default now(),
  unique (pod_id, user_id)
);

create or replace function public.in_pod(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pod_members m
    where m.pod_id = p
      and m.user_id = public.clerk_user_id()
  );
$$;

create or replace function public.is_pod_member(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pod_members m
    where m.pod_id = p
      and m.user_id = public.clerk_user_id()
      and m.status = 'accepted'
  );
$$;

revoke all on function public.in_pod(uuid) from public;
revoke all on function public.is_pod_member(uuid) from public;
grant execute on function public.in_pod(uuid) to authenticated;
grant execute on function public.is_pod_member(uuid) to authenticated;

create table if not exists public.pod_jobs (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods (id) on delete cascade,
  added_by text not null,
  company text not null,
  role text not null,
  job_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.pod_job_saves (
  id uuid primary key default gen_random_uuid(),
  pod_job_id uuid not null references public.pod_jobs (id) on delete cascade,
  user_id text not null,
  application_id uuid references public.applications (id) on delete set null,
  status text not null default 'Wishlist' check (
    status in (
      'Wishlist', 'Applied', 'OA/Assessment', 'Phone Screen',
      'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'
    )
  ),
  updated_at timestamptz not null default now(),
  unique (pod_job_id, user_id)
);

create table if not exists public.pod_messages (
  id uuid primary key default gen_random_uuid(),
  pod_job_id uuid not null references public.pod_jobs (id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists pod_members_user_idx on public.pod_members (user_id);
create index if not exists pod_jobs_pod_idx on public.pod_jobs (pod_id, created_at desc);
create index if not exists pod_job_saves_app_idx on public.pod_job_saves (application_id);
create index if not exists pod_messages_job_idx on public.pod_messages (pod_job_id, created_at);

drop trigger if exists pod_job_saves_set_updated_at on public.pod_job_saves;
create trigger pod_job_saves_set_updated_at
  before update on public.pod_job_saves
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.pods enable row level security;
alter table public.pod_members enable row level security;
alter table public.pod_jobs enable row level security;
alter table public.pod_job_saves enable row level security;
alter table public.pod_messages enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users insert notifications as actor" on public.notifications;
create policy "Users insert notifications as actor"
  on public.notifications for insert
  to authenticated
  with check ((select public.clerk_user_id()) = actor_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Members read pods" on public.pods;
create policy "Members read pods"
  on public.pods for select
  to authenticated
  using (
    (select public.clerk_user_id()) = created_by
    or public.in_pod(id)
  );

drop policy if exists "Users insert pods" on public.pods;
create policy "Users insert pods"
  on public.pods for insert
  to authenticated
  with check ((select public.clerk_user_id()) = created_by);

drop policy if exists "Creators update pods" on public.pods;
create policy "Creators update pods"
  on public.pods for update
  to authenticated
  using ((select public.clerk_user_id()) = created_by);

drop policy if exists "Creators delete pods" on public.pods;
create policy "Creators delete pods"
  on public.pods for delete
  to authenticated
  using ((select public.clerk_user_id()) = created_by);

drop policy if exists "Participants read pod members" on public.pod_members;
create policy "Participants read pod members"
  on public.pod_members for select
  to authenticated
  using (public.in_pod(pod_id));

drop policy if exists "Members insert pod members" on public.pod_members;
create policy "Members insert pod members"
  on public.pod_members for insert
  to authenticated
  with check (
    (select public.clerk_user_id()) = user_id
    or (
      (select public.clerk_user_id()) = invited_by
      and public.is_pod_member(pod_id)
    )
  );

drop policy if exists "Users update own pod membership" on public.pod_members;
create policy "Users update own pod membership"
  on public.pod_members for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users delete pod membership" on public.pod_members;
create policy "Users delete pod membership"
  on public.pod_members for delete
  to authenticated
  using (
    (select public.clerk_user_id()) = user_id
    or public.is_pod_member(pod_id)
  );

drop policy if exists "Members read pod jobs" on public.pod_jobs;
create policy "Members read pod jobs"
  on public.pod_jobs for select
  to authenticated
  using (public.is_pod_member(pod_id));

drop policy if exists "Members insert pod jobs" on public.pod_jobs;
create policy "Members insert pod jobs"
  on public.pod_jobs for insert
  to authenticated
  with check (
    (select public.clerk_user_id()) = added_by
    and public.is_pod_member(pod_id)
  );

drop policy if exists "Members read pod job saves" on public.pod_job_saves;
create policy "Members read pod job saves"
  on public.pod_job_saves for select
  to authenticated
  using (
    exists (
      select 1 from public.pod_jobs j
      where j.id = pod_job_id and public.is_pod_member(j.pod_id)
    )
  );

drop policy if exists "Users insert own pod job saves" on public.pod_job_saves;
create policy "Users insert own pod job saves"
  on public.pod_job_saves for insert
  to authenticated
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Users update own pod job saves" on public.pod_job_saves;
create policy "Users update own pod job saves"
  on public.pod_job_saves for update
  to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);

drop policy if exists "Members read pod messages" on public.pod_messages;
create policy "Members read pod messages"
  on public.pod_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.pod_jobs j
      where j.id = pod_job_id and public.is_pod_member(j.pod_id)
    )
  );

drop policy if exists "Members insert pod messages" on public.pod_messages;
create policy "Members insert pod messages"
  on public.pod_messages for insert
  to authenticated
  with check (
    (select public.clerk_user_id()) = user_id
    and exists (
      select 1 from public.pod_jobs j
      where j.id = pod_job_id and public.is_pod_member(j.pod_id)
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.pod_messages;
exception
  when duplicate_object then null;
end $$;

