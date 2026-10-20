create table if not exists public.email_mfa_challenges (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id text not null,
 email_to text not null,
 code_hash text not null,
 expires_at timestamptz not null,
 attempt_count integer not null default 0 check (attempt_count between 0 and 5),
 used_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists email_mfa_challenges_user_session_created_idx on public.email_mfa_challenges(user_id,session_id,created_at desc);
alter table public.email_mfa_challenges enable row level security;
revoke all on public.email_mfa_challenges from anon;
revoke all on public.email_mfa_challenges from authenticated;
grant all on public.email_mfa_challenges to service_role;
