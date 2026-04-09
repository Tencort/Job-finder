-- 통역/번역 공고 통합 서치 서비스 초기 스키마

-- jobs 테이블
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  title text not null,
  company text not null,
  start_date date,
  end_date date,
  url text not null,
  external_id text unique not null,
  created_at timestamptz default now() not null
);

create index idx_jobs_platform on public.jobs (platform);
create index idx_jobs_created_at on public.jobs (created_at desc);
create index idx_jobs_end_date on public.jobs (end_date);

-- bookmarks 테이블
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, job_id)
);

-- blocked_companies 테이블
create table public.blocked_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  created_at timestamptz default now() not null,
  unique (user_id, company_name)
);

-- user_settings 테이블
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email_alert boolean default true not null,
  updated_at timestamptz default now() not null
);

-- crawl_logs 테이블
create table public.crawl_logs (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  status text not null check (status in ('success', 'error')),
  error_message text,
  jobs_found integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_crawl_logs_platform_date on public.crawl_logs (platform, created_at desc);

-- RLS 활성화
alter table public.jobs enable row level security;
alter table public.bookmarks enable row level security;
alter table public.blocked_companies enable row level security;
alter table public.user_settings enable row level security;

-- jobs: 인증된 사용자 전원 읽기
create policy "jobs_select" on public.jobs for select to authenticated using (true);

-- bookmarks: 본인 데이터만
create policy "bookmarks_select" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);

-- blocked_companies: 본인 데이터만
create policy "blocked_select" on public.blocked_companies for select to authenticated using (auth.uid() = user_id);
create policy "blocked_insert" on public.blocked_companies for insert to authenticated with check (auth.uid() = user_id);
create policy "blocked_delete" on public.blocked_companies for delete to authenticated using (auth.uid() = user_id);

-- user_settings: 본인 데이터만
create policy "settings_select" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "settings_update" on public.user_settings for update to authenticated using (auth.uid() = user_id);
create policy "settings_insert" on public.user_settings for insert to authenticated with check (auth.uid() = user_id);
