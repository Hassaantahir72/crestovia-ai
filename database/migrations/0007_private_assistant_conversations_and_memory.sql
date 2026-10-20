create table if not exists public.assistant_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'New conversation' check (length(trim(title)) between 1 and 160),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, user_id)
);
create table if not exists public.assistant_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('user','assistant')),
 content text not null check (length(trim(content)) between 1 and 20000),
 created_at timestamptz not null default now(),
 foreign key (conversation_id,user_id) references public.assistant_conversations(id,user_id) on delete cascade
);
create table if not exists public.assistant_memories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null default 'general' check (length(trim(category)) between 1 and 80),
 title text not null check (length(trim(title)) between 1 and 160),
 content text not null check (length(trim(content)) between 1 and 12000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists assistant_conversations_user_updated_idx on public.assistant_conversations(user_id,updated_at desc);
create index if not exists assistant_messages_conversation_created_idx on public.assistant_messages(conversation_id,created_at);
create index if not exists assistant_memories_user_updated_idx on public.assistant_memories(user_id,updated_at desc);
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_memories enable row level security;
revoke all on public.assistant_conversations from anon;
revoke all on public.assistant_messages from anon;
revoke all on public.assistant_memories from anon;
grant select,insert,update,delete on public.assistant_conversations to authenticated;
grant select,insert,update,delete on public.assistant_messages to authenticated;
grant select,insert,update,delete on public.assistant_memories to authenticated;
create policy "users manage their assistant conversations" on public.assistant_conversations for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "users manage their assistant messages" on public.assistant_messages for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "users manage their assistant memories" on public.assistant_memories for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
