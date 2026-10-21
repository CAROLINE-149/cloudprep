-- CloudPrep AI: core schema (PostgreSQL / Supabase)
create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

-- ========== SHARED CONTENT (read-only to users) ==========
create table topics (
  id uuid primary key default gen_random_uuid(),
  skill_area text not null check (skill_area in ('cloud_concepts','architecture_services','management_governance')),
  slug text unique not null,
  title text not null,
  objective text,
  sort_order int default 0,
  source_url text,
  last_verified date
);
create table skill_area_weights (
  skill_area text primary key,
  weight_min int not null, weight_max int not null  -- fill from official study guide
);
create table resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete set null,
  kind text not null check (kind in ('video','doc','module')),
  title text not null, description text,
  url text not null, embed_url text, duration_min int,
  source text not null, last_verified date
);
create table questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade, -- null = shared bank
  topic_id uuid not null references topics(id),
  qtype text not null check (qtype in ('mcq','true_false','matching','scenario')),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  stem text not null,
  options jsonb not null,            -- [{id,text,why_wrong?}]
  correct jsonb not null,            -- ["b"] or matching pairs
  explanation text not null,
  source_ref text,
  origin text not null default 'bank' check (origin in ('bank','ai','user')),
  created_at timestamptz default now()
);
create index on questions(topic_id, difficulty);

-- ========== USER DATA ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, timezone text default 'UTC',
  exam_date date, daily_goal_min int default 45,
  study_days smallint[] default '{1,2,3,4,5}',
  knowledge_level text default 'beginner',
  preferred_methods text[] default '{}',
  onboarded boolean default false,
  theme text default 'system',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table topic_status (
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  confidence smallint check (confidence between 1 and 5),
  state text default 'not_started' check (state in ('not_started','learning','understood','needs_revision')),
  updated_at timestamptz default now(),
  primary key (user_id, topic_id)
);
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  title text not null default 'Untitled', body_md text default '',
  pinned boolean default false, is_draft boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on notes(user_id, updated_at desc);
create index notes_fts on notes using gin (to_tsvector('english', title || ' ' || coalesce(body_md,'')));
create table uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_id uuid references notes(id) on delete set null,
  filename text not null, mime text not null, size_bytes int not null check (size_bytes <= 10485760),
  storage_path text not null, extracted_text text, status text default 'pending',
  error text, created_at timestamptz default now()
);
create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exam_date date not null, status text default 'active' check (status in ('active','paused','archived')),
  settings jsonb default '{}', created_at timestamptz default now()
);
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid references study_plans(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  title text not null, objective text, activity text,
  starts_at timestamptz not null, duration_min int not null check (duration_min between 5 and 480),
  status text default 'planned' check (status in ('planned','completed','missed','skipped')),
  completed_at timestamptz, actual_min int, recurrence_rule text,
  link_type text, link_id uuid
);
create index on study_sessions(user_id, starts_at);
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid unique references study_sessions(id) on delete cascade, -- keeps plan and calendar in sync
  title text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  reminder_min int, recurrence_rule text, link_type text, link_id uuid,
  check (ends_at > starts_at)
);
create index on calendar_events(user_id, starts_at);

-- AI
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text default 'New conversation', created_at timestamptz default now(), updated_at timestamptz default now()
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null,
  created_at timestamptz default now()
);
create table tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id uuid references topics(id), difficulty text, goal text, mode text default 'standard',
  transcript jsonb default '[]', summary text, status text default 'active',
  started_at timestamptz default now(), ended_at timestamptz
);
create table ai_usage (
  user_id uuid references auth.users(id) on delete cascade,
  day date default current_date, calls int default 0,
  primary key (user_id, day)
);

-- Flashcards
create table flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade, -- null = shared deck
  topic_id uuid references topics(id), title text not null
);
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references flashcard_decks(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id), note_id uuid references notes(id) on delete set null,
  front text not null, back text not null
);
create table card_schedule (   -- per-user SM-2 state
  user_id uuid references auth.users(id) on delete cascade,
  card_id uuid references flashcards(id) on delete cascade,
  ease real default 2.5, interval_days int default 0, reps int default 0, lapses int default 0,
  due_at timestamptz default now(),
  primary key (user_id, card_id)
);
create index on card_schedule(user_id, due_at);
create table flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references flashcards(id) on delete cascade,
  rating text not null check (rating in ('know','almost','practice')),
  reviewed_at timestamptz default now()
);

-- Quizzes, bank practice, practice tests (one attempts model)
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text, config jsonb default '{}', source_note_id uuid references notes(id) on delete set null,
  created_at timestamptz default now()
);
create table quiz_questions (
  quiz_id uuid references quizzes(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  position int, primary key (quiz_id, question_id)
);
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('quiz','practice_test','bank_practice')),
  quiz_id uuid references quizzes(id) on delete set null,
  mode text default 'learning', time_limit_min int,
  started_at timestamptz default now(), submitted_at timestamptz,
  score_pct numeric(5,2), question_count int
);
create index on attempts(user_id, submitted_at desc);
create table attempt_answers (
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  answer jsonb, is_correct boolean, flagged boolean default false, time_s int,
  primary key (attempt_id, question_id)
);
create table saved_questions (
  user_id uuid references auth.users(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  primary key (user_id, question_id)
);

-- Engagement
create table video_progress (
  user_id uuid references auth.users(id) on delete cascade,
  resource_id uuid references resources(id) on delete cascade,
  watchlist boolean default false, watched boolean default false, position_s int default 0,
  primary key (user_id, resource_id)
);
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game text not null, level int default 1, score int default 0, duration_s int,
  details jsonb default '{}', played_at timestamptz default now()
);
create table achievements (
  user_id uuid references auth.users(id) on delete cascade,
  code text, earned_at timestamptz default now(), primary key (user_id, code)
);

-- ========== ROW-LEVEL SECURITY ==========
do $$
declare t text;
begin
  -- strictly private tables (user_id = auth.uid())
  foreach t in array array['topic_status','notes','uploads','study_plans','study_sessions','calendar_events',
    'conversations','messages','tutor_sessions','card_schedule','flashcard_reviews','quizzes','attempts',
    'attempt_answers','saved_questions','video_progress','game_sessions','achievements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
alter table ai_usage enable row level security;
create policy "read own usage" on ai_usage for select using (user_id = auth.uid()); -- writes via service role only

-- shared + owned content
alter table topics enable row level security;            create policy "read" on topics for select using (true);
alter table skill_area_weights enable row level security; create policy "read" on skill_area_weights for select using (true);
alter table resources enable row level security;         create policy "read" on resources for select using (true);
alter table questions enable row level security;
create policy "read shared or own" on questions for select using (owner_id is null or owner_id = auth.uid());
create policy "write own" on questions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table flashcard_decks enable row level security;
create policy "read shared or own" on flashcard_decks for select using (owner_id is null or owner_id = auth.uid());
create policy "write own" on flashcard_decks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table flashcards enable row level security;
create policy "read shared or own" on flashcards for select using (owner_id is null or owner_id = auth.uid());
create policy "write own" on flashcards for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table quiz_questions enable row level security;
create policy "via own quiz" on quiz_questions for all
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()))
  with check (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()));

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger as $$
begin insert into profiles(id, display_name) values (new.id, split_part(new.email,'@',1)); return new; end $$
language plpgsql security definer set search_path = public;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create trigger t_profiles_upd before update on profiles for each row execute function set_updated_at();
create trigger t_notes_upd before update on notes for each row execute function set_updated_at();
