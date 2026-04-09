# 통역/번역 공고 통합 서치 서비스 — 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6개 채용 플랫폼의 통역/번역 공고를 하루 1회 수집하여 카드형 UI로 통합 조회하는 웹서비스 구축

**Architecture:** Next.js App Router 풀스택 앱. Supabase로 DB/인증, Vercel Cron으로 일일 크롤링, Resend로 이메일 알림. 프론트는 원티드 스타일 라이트 테마 + Pretendard 폰트.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS, Resend, Vercel

**Spec:** `docs/superpowers/specs/2026-04-09-job-search-aggregator-design.md`

---

## 파일 구조

```
01.공고서치/
├── .env.local                          # 환경변수 (Supabase, Resend, API 키)
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vercel.json                         # Cron 설정
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # DB 스키마 + RLS + 인덱스
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # 브라우저용 Supabase 클라이언트
│   │   │   ├── server.ts               # 서버용 Supabase 클라이언트
│   │   │   └── admin.ts                # 서비스 롤 클라이언트 (크롤러용)
│   │   ├── types.ts                    # DB 타입 정의
│   │   └── constants.ts                # 플랫폼 색상, 키워드 등 상수
│   ├── crawlers/
│   │   ├── base.ts                     # 크롤러 공통 인터페이스 + 유틸
│   │   ├── saramin.ts                  # 사람인 크롤러 (API)
│   │   ├── worknet.ts                  # 워크넷 크롤러 (API)
│   │   ├── jobkorea.ts                 # 잡코리아 크롤러 (HTML 파싱)
│   │   ├── linkedin.ts                 # LinkedIn 크롤러 (HTML 파싱)
│   │   ├── indeed.ts                   # Indeed 크롤러 (HTML 파싱)
│   │   └── gsit.ts                     # GSIT 크롤러 (HTML 파싱)
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (Pretendard 폰트)
│   │   ├── login/
│   │   │   └── page.tsx                # 로그인 페이지
│   │   ├── (auth)/                     # 인증 필요 라우트 그룹
│   │   │   ├── layout.tsx              # 인증 체크 + 네비게이션 래퍼
│   │   │   ├── page.tsx                # 메인 공고 목록
│   │   │   ├── bookmarks/
│   │   │   │   └── page.tsx            # 북마크 페이지
│   │   │   └── settings/
│   │   │       └── page.tsx            # 설정 페이지
│   │   └── api/
│   │       ├── cron/
│   │       │   └── route.ts            # 오케스트레이터 (Vercel Cron 진입점)
│   │       ├── crawl/
│   │       │   └── [platform]/
│   │       │       └── route.ts        # 플랫폼별 크롤러 API Route
│   │       ├── notify/
│   │       │   └── route.ts            # 이메일 알림 발송 API Route
│   │       ├── jobs/
│   │       │   └── route.ts            # 공고 목록 조회 API (커서 페이지네이션)
│   │       ├── bookmarks/
│   │       │   └── route.ts            # 북마크 CRUD API
│   │       ├── blocked-companies/
│   │       │   └── route.ts            # 블랙리스트 CRUD API
│   │       └── settings/
│   │           └── route.ts            # 사용자 설정 API
│   └── components/
│       ├── JobCard.tsx                  # 공고 카드 컴포넌트
│       ├── FilterBar.tsx               # 필터/정렬 바
│       ├── JobList.tsx                  # 공고 목록 + 무한 스크롤
│       └── Nav.tsx                     # 상단 네비게이션
```

---

## Chunk 1: 프로젝트 초기화 + DB

### Task 1: Next.js 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`, `.env.local`

- [ ] **Step 1: Git 초기화**

```bash
cd "C:/Users/Walter-I/Documents/Projects/03.ETC/01.공고서치"
git init
```

- [ ] **Step 2: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

프롬프트가 나오면: 기존 파일 덮어쓰기 허용, Turbopack은 No.

- [ ] **Step 3: 추가 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr resend cheerio
npm install -D @types/cheerio
```

- [ ] **Step 4: .env.local 생성**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend
RESEND_API_KEY=your_resend_api_key

# 크롤러 API 키
SARAMIN_API_KEY=your_saramin_api_key
WORKNET_API_KEY=your_worknet_api_key

# 관리자
ADMIN_EMAIL=your_admin_email
CRON_SECRET=your_cron_secret

# 앱
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: .gitignore에 추가**

`.gitignore`에 아래 항목이 없으면 추가:
```
.env.local
.superpowers/
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "프로젝트 초기화 — Next.js + Tailwind + Supabase + Resend 설정"
```

---

### Task 2: Supabase 클라이언트 + 타입 정의

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/types.ts`, `src/lib/constants.ts`

- [ ] **Step 1: DB 타입 정의 작성**

```typescript
// src/lib/types.ts
/**
 * Role: DB 테이블 타입 정의
 * Key Features: jobs, bookmarks, blocked_companies, user_settings, crawl_logs 타입
 * Dependencies: 없음
 */

export type Platform = 'saramin' | 'jobkorea' | 'worknet' | 'linkedin' | 'indeed' | 'gsit';

export interface Job {
  id: string;
  platform: Platform;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  url: string;
  external_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface BlockedCompany {
  id: string;
  user_id: string;
  company_name: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_alert: boolean;
  updated_at: string;
}

export interface CrawlLog {
  id: string;
  platform: Platform;
  status: 'success' | 'error';
  error_message: string | null;
  jobs_found: number;
  created_at: string;
}

// 크롤러가 반환하는 공고 데이터 (DB 저장 전)
export interface CrawledJob {
  platform: Platform;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  url: string;
  external_id: string;
}
```

- [ ] **Step 2: 상수 정의**

```typescript
// src/lib/constants.ts
/**
 * Role: 앱 전역 상수 정의
 * Key Features: 플랫폼 색상, 검색 키워드, 플랫폼 라벨
 * Dependencies: types.ts
 */
import { Platform } from './types';

export const PLATFORMS: { key: Platform; label: string; color: string; bgColor: string; textColor: string }[] = [
  { key: 'saramin', label: '사람인', color: '#e94560', bgColor: '#fff0f3', textColor: '#e94560' },
  { key: 'jobkorea', label: '잡코리아', color: '#f59e0b', bgColor: '#fef3c7', textColor: '#b45309' },
  { key: 'worknet', label: '워크넷', color: '#10b981', bgColor: '#d1fae5', textColor: '#065f46' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0a66c2', bgColor: '#e8f4fd', textColor: '#0a66c2' },
  { key: 'indeed', label: 'Indeed', color: '#2557a7', bgColor: '#e0ecf9', textColor: '#2557a7' },
  { key: 'gsit', label: 'GSIT', color: '#8b5cf6', bgColor: '#ede9fe', textColor: '#5b21b6' },
];

export const SEARCH_KEYWORDS = ['통역', '번역', '통번역', 'translator', 'translation', 'interpreter', 'interpretation'];

export const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'deadline', label: '마감임박순' },
  { key: 'company', label: '회사명순' },
  { key: 'title', label: '제목순' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];
```

- [ ] **Step 3: 브라우저 Supabase 클라이언트**

```typescript
// src/lib/supabase/client.ts
/**
 * Role: 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트
 * Dependencies: @supabase/supabase-js
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: 서버 Supabase 클라이언트**

```typescript
// src/lib/supabase/server.ts
/**
 * Role: 서버 컴포넌트/API Route에서 사용하는 Supabase 클라이언트
 * Dependencies: @supabase/ssr, next/headers
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

- [ ] **Step 5: 어드민 Supabase 클라이언트 (크롤러용)**

```typescript
// src/lib/supabase/admin.ts
/**
 * Role: 서비스 롤 키를 사용하는 Supabase 클라이언트 — 크롤러, 이메일 알림 등 서버 전용
 * Dependencies: @supabase/supabase-js
 * Notes: RLS 우회 — API Route에서만 사용할 것
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/
git commit -m "Supabase 클라이언트 + 타입/상수 정의 — DB 스키마 기반 타입 시스템 구축"
```

---

### Task 3: DB 마이그레이션 SQL

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/001_initial_schema.sql
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
```

- [ ] **Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 프로젝트 생성 후 SQL Editor에서 위 SQL을 실행.

- [ ] **Step 3: 커밋**

```bash
git add supabase/
git commit -m "DB 스키마 마이그레이션 — 5개 테이블 + RLS + 인덱스"
```

---

## Chunk 2: 인증 + 레이아웃

### Task 4: 루트 레이아웃 + Pretendard 폰트

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Tailwind 설정에 Pretendard 폰트 추가**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        pretendard: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', '"Helvetica Neue"', '"Segoe UI"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Malgun Gothic"', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.02em',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: globals.css 정리**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.02em;
}
```

- [ ] **Step 3: 루트 레이아웃**

```tsx
// src/app/layout.tsx
/**
 * Role: 루트 레이아웃 — Pretendard 폰트 CDN + 메타데이터
 * Dependencies: globals.css
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "통역공고 서치",
  description: "통역/번역 채용공고 통합 검색 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-[#f8f8f8] text-gray-900">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 개발 서버 실행 확인**

```bash
npm run dev
```

http://localhost:3000 접속하여 Pretendard 폰트 적용 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/app/layout.tsx src/app/globals.css tailwind.config.ts
git commit -m "루트 레이아웃 — Pretendard 폰트 CDN + Tailwind 설정"
```

---

### Task 5: 로그인 페이지

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 로그인 페이지 구현**

```tsx
// src/app/login/page.tsx
/**
 * Role: 이메일+비밀번호 로그인 페이지
 * Key Features: Supabase Auth 로그인, 에러 표시, 성공 시 메인으로 리다이렉트
 * Dependencies: @supabase/ssr
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-6">통역공고 서치</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/login/
git commit -m "로그인 페이지 — Supabase Auth 이메일+비밀번호 로그인"
```

---

### Task 6: 인증 미들웨어 + 네비게이션

**Files:**
- Create: `src/middleware.ts`
- Create: `src/components/Nav.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: 인증 미들웨어**

```typescript
// src/middleware.ts
/**
 * Role: 미인증 사용자를 /login으로 리다이렉트
 * Dependencies: @supabase/ssr
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: 네비게이션 컴포넌트**

```tsx
// src/components/Nav.tsx
/**
 * Role: 상단 네비게이션 바 — 로고 + 북마크/설정/로그아웃 링크
 * Dependencies: supabase/client
 */
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3.5 flex justify-between items-center">
      <Link href="/" className="text-lg font-bold text-gray-900">
        통역공고 서치
      </Link>
      <div className="flex gap-5 items-center text-sm text-gray-500 font-medium">
        <Link
          href="/bookmarks"
          className={`hover:text-gray-900 transition ${pathname === "/bookmarks" ? "text-gray-900" : ""}`}
        >
          북마크
        </Link>
        <Link
          href="/settings"
          className={`hover:text-gray-900 transition ${pathname === "/settings" ? "text-gray-900" : ""}`}
        >
          설정
        </Link>
        <button onClick={handleLogout} className="hover:text-gray-900 transition">
          로그아웃
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: 인증 라우트 그룹 레이아웃**

```tsx
// src/app/(auth)/layout.tsx
/**
 * Role: 인증 필요 페이지 공통 레이아웃 — Nav 포함
 * Dependencies: Nav 컴포넌트
 */
import Nav from "@/components/Nav";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/middleware.ts src/components/Nav.tsx src/app/\(auth\)/layout.tsx
git commit -m "인증 미들웨어 + 네비게이션 — 미인증 리다이렉트 + 상단 네비게이션 바"
```

---

## Chunk 3: API 엔드포인트 + 공고 목록 UI

### Task 7: 공고 목록 API

**Files:**
- Create: `src/app/api/jobs/route.ts`

- [ ] **Step 1: 공고 목록 API — 커서 기반 페이지네이션 + 필터 + 정렬**

```typescript
// src/app/api/jobs/route.ts
/**
 * Role: 공고 목록 조회 API — 커서 페이지네이션, 플랫폼 필터, 정렬, 블랙리스트 제외
 * Key Features: GET /api/jobs?sort=latest&platform=all&cursor=xxx&limit=30
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SortKey } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const sort = (params.get("sort") || "latest") as SortKey;
  const platform = params.get("platform") || "all";
  const cursor = params.get("cursor");
  const limit = 30;

  // 블랙리스트 조회
  const { data: blocked } = await supabase
    .from("blocked_companies")
    .select("company_name");
  const blockedNames = (blocked || []).map((b) => b.company_name);

  // 쿼리 빌드
  let query = supabase
    .from("jobs")
    .select("*")
    .limit(limit + 1); // 다음 페이지 존재 여부 확인용 +1

  // 만료 공고 제외 (end_date가 오늘 이전이면 숨김, null은 표시)
  const today = new Date().toISOString().split("T")[0];
  query = query.or(`end_date.gte.${today},end_date.is.null`);

  // 플랫폼 필터
  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  // 블랙리스트 제외 — SDK 타입 안전 필터 사용
  if (blockedNames.length > 0) {
    query = query.not("company", "in", blockedNames);
  }

  // 정렬
  switch (sort) {
    case "deadline":
      query = query.order("end_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      break;
    case "company":
      query = query.order("company", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "title":
      query = query.order("title", { ascending: true }).order("created_at", { ascending: false });
      break;
    default: // latest
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  // 커서 페이지네이션 (latest 정렬 기준)
  if (cursor && sort === "latest") {
    const [cursorDate, cursorId] = cursor.split("_");
    query = query.or(`created_at.lt.${cursorDate},and(created_at.eq.${cursorDate},id.lt.${cursorId})`);
  }

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (jobs || []).length > limit;
  const results = hasMore ? jobs!.slice(0, limit) : (jobs || []);
  const nextCursor = hasMore && results.length > 0
    ? `${results[results.length - 1].created_at}_${results[results.length - 1].id}`
    : null;

  // 북마크 상태 조회
  const jobIds = results.map((j) => j.id);
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("job_id")
    .in("job_id", jobIds);
  const bookmarkedIds = new Set((bookmarks || []).map((b) => b.job_id));

  return NextResponse.json({
    jobs: results.map((j) => ({ ...j, is_bookmarked: bookmarkedIds.has(j.id) })),
    nextCursor,
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/jobs/
git commit -m "공고 목록 API — 커서 페이지네이션 + 필터 + 정렬 + 블랙리스트 제외"
```

---

### Task 8: 북마크 + 블랙리스트 + 설정 API

**Files:**
- Create: `src/app/api/bookmarks/route.ts`
- Create: `src/app/api/blocked-companies/route.ts`
- Create: `src/app/api/settings/route.ts`

- [ ] **Step 1: 북마크 API**

```typescript
// src/app/api/bookmarks/route.ts
/**
 * Role: 북마크 토글 API
 * Key Features: POST (추가/삭제 토글), GET (북마크 목록)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*, jobs(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookmarks: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { job_id } = await request.json();

  // 이미 북마크되어 있으면 삭제, 아니면 추가
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", job_id)
    .single();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    return NextResponse.json({ bookmarked: false });
  }

  await supabase.from("bookmarks").insert({ user_id: user.id, job_id });
  return NextResponse.json({ bookmarked: true });
}
```

- [ ] **Step 2: 블랙리스트 API**

```typescript
// src/app/api/blocked-companies/route.ts
/**
 * Role: 블랙리스트 CRUD API
 * Key Features: GET (목록), POST (추가), DELETE (해제)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("blocked_companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { company_name } = await request.json();
  const { error } = await supabase
    .from("blocked_companies")
    .insert({ user_id: user.id, company_name });

  if (error?.code === "23505") return NextResponse.json({ message: "이미 차단된 기업입니다." });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { company_name } = await request.json();
  await supabase
    .from("blocked_companies")
    .delete()
    .eq("user_id", user.id)
    .eq("company_name", company_name);

  return NextResponse.json({ unblocked: true });
}
```

- [ ] **Step 3: 설정 API**

```typescript
// src/app/api/settings/route.ts
/**
 * Role: 사용자 설정 (이메일 알림) API
 * Key Features: GET (현재 설정), PUT (설정 변경)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  let { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // 설정이 없으면 기본값으로 생성
  if (!data) {
    const { data: newSettings } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, email_alert: true })
      .select()
      .single();
    data = newSettings;
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { email_alert } = await request.json();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, email_alert, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/bookmarks/ src/app/api/blocked-companies/ src/app/api/settings/
git commit -m "북마크 + 블랙리스트 + 설정 API — CRUD 엔드포인트"
```

---

### Task 9: 공고 카드 + 필터 바 + 목록 컴포넌트

**Files:**
- Create: `src/components/JobCard.tsx`, `src/components/FilterBar.tsx`, `src/components/JobList.tsx`

- [ ] **Step 1: JobCard 컴포넌트**

```tsx
// src/components/JobCard.tsx
/**
 * Role: 개별 공고 카드 — 플랫폼 배지, 제목, 회사명, D-day, 북마크, 차단 버튼
 * Dependencies: constants.ts, types.ts
 */
"use client";

import { PLATFORMS } from "@/lib/constants";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job & { is_bookmarked: boolean };
  onBookmark: (jobId: string) => void;
  onBlock: (companyName: string) => void;
}

function getDday(endDate: string | null): { text: string; className: string } {
  if (!endDate) return { text: "상시채용", className: "text-emerald-500" };
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "마감", className: "text-gray-400" };
  if (diff <= 14) return { text: `D-${diff}`, className: "text-[#e94560]" };
  return { text: `D-${diff}`, className: "text-amber-500" };
}

export default function JobCard({ job, onBookmark, onBlock }: JobCardProps) {
  const platform = PLATFORMS.find((p) => p.key === job.platform);
  const dday = getDday(job.end_date);

  const formatDate = (d: string | null) => d ? d.slice(5).replace("-", ".") : "";

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer group">
      {/* 플랫폼 컬러바 */}
      <div className="h-1" style={{ backgroundColor: platform?.color }} />

      <div className="p-[18px]">
        {/* 헤더: 배지 + 북마크 */}
        <div className="flex justify-between items-center mb-2.5">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded"
            style={{ backgroundColor: platform?.bgColor, color: platform?.textColor }}
          >
            {platform?.label}
          </span>
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onBlock(job.company); }}
              className="text-xs text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
              title="이 기업 차단"
            >
              ✕
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onBookmark(job.id); }}
              className={`text-base transition ${job.is_bookmarked ? "text-[#e94560]" : "text-gray-300 hover:text-gray-400"}`}
            >
              ♥
            </button>
          </div>
        </div>

        {/* 제목 */}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-semibold text-[15px] text-gray-900 mb-1.5 leading-relaxed hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {job.title}
        </a>

        {/* 회사명 */}
        <p className="text-[13px] text-gray-500 mb-3.5">{job.company}</p>

        {/* 하단: 기간 + D-day */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">
            {formatDate(job.start_date)}{job.start_date ? " ~ " : ""}{formatDate(job.end_date) || (job.start_date ? "" : "")}
          </span>
          <span className={`text-[11px] font-semibold ${dday.className}`}>{dday.text}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: FilterBar 컴포넌트**

```tsx
// src/components/FilterBar.tsx
/**
 * Role: 정렬 탭 + 플랫폼 필터 바
 * Dependencies: constants.ts
 */
"use client";

import { PLATFORMS, SORT_OPTIONS, type SortKey } from "@/lib/constants";
import type { Platform } from "@/lib/types";

interface FilterBarProps {
  sort: SortKey;
  platform: string;
  onSortChange: (sort: SortKey) => void;
  onPlatformChange: (platform: string) => void;
}

export default function FilterBar({ sort, platform, onSortChange, onPlatformChange }: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* 정렬 탭 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              sort === opt.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 플랫폼 필터 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 mr-1">플랫폼</span>
        <button
          onClick={() => onPlatformChange("all")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            platform === "all"
              ? "bg-blue-50 text-blue-600 font-semibold"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          전체
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPlatformChange(p.key)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              platform === p.key
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: JobList 컴포넌트 (무한 스크롤)**

```tsx
// src/components/JobList.tsx
/**
 * Role: 공고 목록 + 무한 스크롤
 * Key Features: 커서 기반 페이지네이션, 스크롤 감지, 로딩 상태
 * Dependencies: JobCard, FilterBar
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import JobCard from "./JobCard";
import FilterBar from "./FilterBar";
import type { Job } from "@/lib/types";
import type { SortKey } from "@/lib/constants";

export default function JobList() {
  const [jobs, setJobs] = useState<(Job & { is_bookmarked: boolean })[]>([]);
  const [sort, setSort] = useState<SortKey>("latest");
  const [platform, setPlatform] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const params = new URLSearchParams({ sort, platform });
    if (!reset && cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();

    setJobs((prev) => reset ? data.jobs : [...prev, ...data.jobs]);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, [sort, platform, cursor, loading]);

  // 필터/정렬 변경 시 리셋
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    setJobs([]);
    // fetchJobs는 다음 렌더에서 observer가 트리거
  }, [sort, platform]);

  // 초기 로드 + 리셋 후 로드
  useEffect(() => {
    if (jobs.length === 0 && hasMore) {
      fetchJobs(true);
    }
  }, [jobs.length, hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤 IntersectionObserver
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchJobs();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchJobs]);

  async function handleBookmark(jobId: string) {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const data = await res.json();
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_bookmarked: data.bookmarked } : j))
    );
  }

  async function handleBlock(companyName: string) {
    if (!confirm(`"${companyName}" 공고를 더 이상 표시하지 않을까요?`)) return;
    await fetch("/api/blocked-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName }),
    });
    // 블랙리스트 추가 후 해당 기업 공고 즉시 제거
    setJobs((prev) => prev.filter((j) => j.company !== companyName));
  }

  return (
    <>
      <FilterBar sort={sort} platform={platform} onSortChange={setSort} onPlatformChange={setPlatform} />
      <div className="px-6 pt-3.5 pb-1">
        <p className="text-[13px] text-gray-400 font-medium">
          {loading && jobs.length === 0 ? "로딩 중..." : `총 ${jobs.length}건의 공고`}
        </p>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onBookmark={handleBookmark} onBlock={handleBlock} />
        ))}
      </div>
      {/* 무한 스크롤 감지 영역 */}
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {loading && jobs.length > 0 && <p className="text-sm text-gray-400">로딩 중...</p>}
        {!hasMore && jobs.length > 0 && <p className="text-sm text-gray-300">모든 공고를 불러왔습니다</p>}
      </div>
    </>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/
git commit -m "공고 카드 + 필터 바 + 목록 컴포넌트 — 원티드 스타일 카드 UI + 무한 스크롤"
```

---

### Task 10: 메인 + 북마크 + 설정 페이지

**Files:**
- Create: `src/app/(auth)/page.tsx`, `src/app/(auth)/bookmarks/page.tsx`, `src/app/(auth)/settings/page.tsx`

- [ ] **Step 1: 메인 페이지**

```tsx
// src/app/(auth)/page.tsx
/**
 * Role: 메인 페이지 — 공고 목록 표시
 * Dependencies: JobList 컴포넌트
 */
import JobList from "@/components/JobList";

export default function HomePage() {
  return <JobList />;
}
```

- [ ] **Step 2: 북마크 페이지**

```tsx
// src/app/(auth)/bookmarks/page.tsx
/**
 * Role: 북마크한 공고 모아보기
 * Dependencies: JobCard 컴포넌트
 */
"use client";

import { useState, useEffect } from "react";
import JobCard from "@/components/JobCard";
import type { Job } from "@/lib/types";

// Supabase select("*, jobs(*)") 응답 구조: { id, user_id, job_id, created_at, jobs: Job }
interface BookmarkWithJob {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
  jobs: Job;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((res) => res.json())
      .then((data) => {
        setBookmarks(data.bookmarks || []);
        setLoading(false);
      });
  }, []);

  async function handleBookmark(jobId: string) {
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.jobs.id !== jobId));
  }

  const jobs = bookmarks.map((b) => ({ ...b.jobs, is_bookmarked: true }));

  return (
    <div className="px-6 py-6">
      <h2 className="text-lg font-bold mb-4">북마크</h2>
      {loading ? (
        <p className="text-sm text-gray-400">로딩 중...</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-400">저장한 공고가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onBookmark={handleBookmark} onBlock={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 설정 페이지**

```tsx
// src/app/(auth)/settings/page.tsx
/**
 * Role: 설정 페이지 — 블랙리스트 관리 + 이메일 알림 ON/OFF
 * Dependencies: blocked-companies API, settings API
 */
"use client";

import { useState, useEffect } from "react";
import type { BlockedCompany } from "@/lib/types";

export default function SettingsPage() {
  const [blocked, setBlocked] = useState<BlockedCompany[]>([]);
  const [emailAlert, setEmailAlert] = useState(true);
  const [newCompany, setNewCompany] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/blocked-companies").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([blockedData, settingsData]) => {
      setBlocked(blockedData.blocked || []);
      setEmailAlert(settingsData.settings?.email_alert ?? true);
      setLoading(false);
    });
  }, []);

  async function handleAddBlock() {
    const name = newCompany.trim();
    if (!name) return;
    await fetch("/api/blocked-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: name }),
    });
    setBlocked((prev) => [{ id: "", user_id: "", company_name: name, created_at: new Date().toISOString() }, ...prev]);
    setNewCompany("");
  }

  async function handleUnblock(companyName: string) {
    await fetch("/api/blocked-companies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName }),
    });
    setBlocked((prev) => prev.filter((b) => b.company_name !== companyName));
  }

  async function handleToggleAlert() {
    const newValue = !emailAlert;
    setEmailAlert(newValue);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_alert: newValue }),
    });
  }

  if (loading) return <p className="p-6 text-sm text-gray-400">로딩 중...</p>;

  return (
    <div className="px-6 py-6 max-w-2xl">
      <h2 className="text-lg font-bold mb-6">설정</h2>

      {/* 이메일 알림 */}
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">이메일 알림</h3>
            <p className="text-xs text-gray-400 mt-1">새로운 공고가 수집되면 이메일로 알려드립니다</p>
          </div>
          <button
            onClick={handleToggleAlert}
            className={`w-11 h-6 rounded-full transition relative ${emailAlert ? "bg-blue-500" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition ${emailAlert ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 블랙리스트 */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">차단된 기업</h3>

        {/* 추가 입력 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
            placeholder="기업명 입력"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddBlock}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            추가
          </button>
        </div>

        {/* 목록 */}
        {blocked.length === 0 ? (
          <p className="text-xs text-gray-400">차단된 기업이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {blocked.map((b) => (
              <li key={b.company_name} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">{b.company_name}</span>
                <button
                  onClick={() => handleUnblock(b.company_name)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/\(auth\)/
git commit -m "메인 + 북마크 + 설정 페이지 — 전체 UI 완성"
```

---

## Chunk 4: 크롤러 + 알림 + 배포

### Task 11: 크롤러 베이스 + 플랫폼 크롤러

**Files:**
- Create: `src/crawlers/base.ts`, `src/crawlers/saramin.ts`, `src/crawlers/worknet.ts`, `src/crawlers/jobkorea.ts`, `src/crawlers/linkedin.ts`, `src/crawlers/indeed.ts`, `src/crawlers/gsit.ts`

- [ ] **Step 1: 크롤러 베이스 인터페이스**

```typescript
// src/crawlers/base.ts
/**
 * Role: 크롤러 공통 인터페이스 + HTTP 요청 유틸
 * Key Features: CrawlerResult 타입, fetchWithUA 함수
 * Dependencies: types.ts
 */
import type { CrawledJob, Platform } from "@/lib/types";
import { SEARCH_KEYWORDS } from "@/lib/constants";

export interface CrawlerResult {
  platform: Platform;
  jobs: CrawledJob[];
  error?: string;
}

export { SEARCH_KEYWORDS };

// User-Agent를 설정한 fetch wrapper
export async function fetchWithUA(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

// 딜레이 유틸
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: 사람인 크롤러 (API 기반)**

```typescript
// src/crawlers/saramin.ts
/**
 * Role: 사람인 공개 API를 통한 공고 수집
 * Dependencies: base.ts
 * Notes: API 키 필요 (SARAMIN_API_KEY 환경변수)
 */
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, type CrawlerResult } from "./base";

export async function crawlSaramin(): Promise<CrawlerResult> {
  const apiKey = process.env.SARAMIN_API_KEY;
  if (!apiKey) return { platform: "saramin", jobs: [], error: "SARAMIN_API_KEY 미설정" };

  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://oapi.saramin.co.kr/recruit?access-key=${apiKey}&keywords=${encodeURIComponent(keyword)}&count=50&output=json`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const jobs = data?.jobs?.job || [];

      for (const job of jobs) {
        allJobs.push({
          platform: "saramin",
          title: job.position?.title || "",
          company: job.company?.detail?.name || "",
          start_date: job["posting-timestamp"] ? new Date(Number(job["posting-timestamp"]) * 1000).toISOString().split("T")[0] : null,
          end_date: job["expiration-timestamp"] ? new Date(Number(job["expiration-timestamp"]) * 1000).toISOString().split("T")[0] : null,
          url: job.url || "",
          external_id: `saramin_${job.id}`,
        });
      }
    } catch {
      // 키워드별 실패는 무시하고 계속 진행
    }
  }

  // 중복 제거 (external_id 기준)
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "saramin", jobs: unique };
}
```

- [ ] **Step 3: 워크넷 크롤러 (API 기반)**

```typescript
// src/crawlers/worknet.ts
/**
 * Role: 워크넷 공개 API를 통한 공고 수집
 * Dependencies: base.ts
 * Notes: API 키 필요 (WORKNET_API_KEY 환경변수)
 */
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, type CrawlerResult } from "./base";

export async function crawlWorknet(): Promise<CrawlerResult> {
  const apiKey = process.env.WORKNET_API_KEY;
  if (!apiKey) return { platform: "worknet", jobs: [], error: "WORKNET_API_KEY 미설정" };

  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://openapi.work.go.kr/opi/opi/opia/wantedApi.do?authKey=${apiKey}&callTp=L&returnType=JSON&keyword=${encodeURIComponent(keyword)}&display=50&startPage=1`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const items = data?.wantedRoot?.wanted || [];

      for (const item of items) {
        allJobs.push({
          platform: "worknet",
          title: item.wantedTitle || "",
          company: item.corpNm || "",
          start_date: item.regDt || null,
          end_date: item.closeDt === "상시채용" ? null : item.closeDt || null,
          url: `https://www.work.go.kr/empInfo/empInfoSrch/detail/empDetailAuthView.do?wantedAuthNo=${item.wantedAuthNo}`,
          external_id: `worknet_${item.wantedAuthNo}`,
        });
      }
    } catch {
      // 키워드별 실패는 무시
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "worknet", jobs: unique };
}
```

- [ ] **Step 4: HTML 파싱 크롤러 (잡코리아, LinkedIn, Indeed, GSIT) 스텁 생성**

각 크롤러는 동일 패턴으로 작성. 구체적 셀렉터는 구현 시 리서치하여 채움. 여기서는 기본 구조만 생성.

```typescript
// src/crawlers/jobkorea.ts
/**
 * Role: 잡코리아 HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 셀렉터는 잡코리아 사이트 구조에 따라 업데이트 필요
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

export async function crawlJobkorea(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}&tabType=recruit`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // TODO: 잡코리아 검색 결과 셀렉터 리서치 후 구현
      // 임시로 빈 배열 반환 — 실제 셀렉터 확인 후 채울 것
      // $(".list-post .post-list-info").each((_, el) => { ... });

      await delay(1500);
    } catch {
      // 실패 시 다음 키워드로
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "jobkorea", jobs: unique };
}
```

```typescript
// src/crawlers/linkedin.ts
/**
 * Role: LinkedIn HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 봇 차단 리스크 있음 — 실패 시 graceful 스킵
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

export async function crawlLinkedin(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=South%20Korea`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // TODO: LinkedIn 비로그인 검색 결과 셀렉터 리서치 후 구현

      await delay(2000);
    } catch {
      // 봇 차단 등 실패 시 스킵
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "linkedin", jobs: unique };
}
```

```typescript
// src/crawlers/indeed.ts
/**
 * Role: Indeed HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 봇 차단 리스크 있음 — 실패 시 graceful 스킵
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

export async function crawlIndeed(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://kr.indeed.com/jobs?q=${encodeURIComponent(keyword)}`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // TODO: Indeed 검색 결과 셀렉터 리서치 후 구현

      await delay(2000);
    } catch {
      // 봇 차단 등 실패 시 스킵
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "indeed", jobs: unique };
}
```

```typescript
// src/crawlers/gsit.ts
/**
 * Role: 한국통번역대학원(GSIT) 게시판 HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 게시판 URL 리서치 필요
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { fetchWithUA, type CrawlerResult } from "./base";

export async function crawlGsit(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  try {
    // TODO: GSIT 게시판 URL 확인 후 구현
    // const html = await fetchWithUA("https://...");
    // const $ = cheerio.load(html);
  } catch {
    // 실패 시 스킵
  }

  return { platform: "gsit", jobs: allJobs };
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/crawlers/
git commit -m "크롤러 모듈 — 사람인/워크넷 API 구현 + 잡코리아/LinkedIn/Indeed/GSIT 스텁"
```

---

### Task 12: 크롤러 API Routes + 오케스트레이터 + Cron 설정

**Files:**
- Create: `src/app/api/crawl/[platform]/route.ts`, `src/app/api/cron/route.ts`, `vercel.json`

- [ ] **Step 1: 플랫폼별 크롤러 API Route**

```typescript
// src/app/api/crawl/[platform]/route.ts
/**
 * Role: 개별 플랫폼 크롤링 실행 API — 오케스트레이터에서 호출
 * Key Features: 크롤링 실행 + DB 저장 + 로그 기록
 * Dependencies: crawlers/*, supabase/admin
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSaramin } from "@/crawlers/saramin";
import { crawlWorknet } from "@/crawlers/worknet";
import { crawlJobkorea } from "@/crawlers/jobkorea";
import { crawlLinkedin } from "@/crawlers/linkedin";
import { crawlIndeed } from "@/crawlers/indeed";
import { crawlGsit } from "@/crawlers/gsit";
import type { Platform } from "@/lib/types";

const crawlers: Record<Platform, () => Promise<any>> = {
  saramin: crawlSaramin,
  worknet: crawlWorknet,
  jobkorea: crawlJobkorea,
  linkedin: crawlLinkedin,
  indeed: crawlIndeed,
  gsit: crawlGsit,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;

  // 시크릿 검증
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const crawl = crawlers[platform as Platform];
  if (!crawl) return NextResponse.json({ error: "알 수 없는 플랫폼" }, { status: 400 });

  const supabase = createAdminClient();

  try {
    const result = await crawl();

    if (result.error) {
      // 에러 로그 기록
      await supabase.from("crawl_logs").insert({
        platform, status: "error", error_message: result.error, jobs_found: 0,
      });
      return NextResponse.json({ platform, status: "error", error: result.error });
    }

    // 공고 저장 (중복은 upsert로 무시)
    let newCount = 0;
    for (const job of result.jobs) {
      const { error } = await supabase.from("jobs").upsert(job, { onConflict: "external_id", ignoreDuplicates: true });
      if (!error) newCount++;
    }

    // 성공 로그 기록
    await supabase.from("crawl_logs").insert({
      platform, status: "success", jobs_found: result.jobs.length,
    });

    return NextResponse.json({ platform, status: "success", total: result.jobs.length, new: newCount });
  } catch (err: any) {
    await supabase.from("crawl_logs").insert({
      platform, status: "error", error_message: err.message, jobs_found: 0,
    });
    return NextResponse.json({ platform, status: "error", error: err.message });
  }
}
```

- [ ] **Step 2: 오케스트레이터 (Cron 진입점)**

```typescript
// src/app/api/cron/route.ts
/**
 * Role: 크롤링 오케스트레이터 — Vercel Cron에서 매일 1회 호출
 * Key Features: 6개 크롤러 병렬 호출 (fire-and-forget) + 30초 후 이메일 알림 트리거
 * Dependencies: crawl/[platform], notify API
 */
import { NextRequest, NextResponse } from "next/server";

const PLATFORMS = ["saramin", "worknet", "jobkorea", "linkedin", "indeed", "gsit"];

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // 6개 플랫폼 fire-and-forget 병렬 호출 — await 없음 (Vercel 10초 제한 회피)
  PLATFORMS.forEach((platform) => {
    fetch(`${baseUrl}/api/crawl/${platform}`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
    }).catch(() => {}); // 개별 실패는 crawl_logs에 기록됨
  });

  // 오케스트레이터는 즉시 반환 — 이메일 알림은 별도 Cron(UTC 23:00)에서 트리거
  return NextResponse.json({ status: "crawlers_triggered" });
}
```

- [ ] **Step 3: vercel.json Cron 설정**

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 22 * * *"
    },
    {
      "path": "/api/notify",
      "schedule": "0 23 * * *"
    }
  ]
}
```

> UTC 22:00 = KST 오전 7:00 — 크롤링 트리거
> UTC 23:00 = KST 오전 8:00 — 크롤링 완료 후 이메일 알림 (1시간 여유)

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/crawl/ src/app/api/cron/ vercel.json
git commit -m "크롤러 API + 오케스트레이터 + Cron 설정 — 매일 KST 7시 6개 플랫폼 병렬 크롤링"
```

---

### Task 13: 이메일 알림 API

**Files:**
- Create: `src/app/api/notify/route.ts`

- [ ] **Step 1: 이메일 알림 발송 API**

```typescript
// src/app/api/notify/route.ts
/**
 * Role: 새 공고 이메일 알림 발송 — 크롤링 후 오케스트레이터에서 호출
 * Key Features: 오늘 수집된 새 공고 조회 → 알림 설정 ON인 사용자에게 HTML 이메일 발송
 * Dependencies: supabase/admin, resend
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { PLATFORMS } from "@/lib/constants";

const resend = new Resend(process.env.RESEND_API_KEY);

// Vercel Cron은 GET으로 호출, 수동 트리거는 POST
async function handleNotify() {
  const supabase = createAdminClient();

  // 3일 연속 실패 플랫폼 감지 → ADMIN_EMAIL 알림
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from("crawl_logs")
    .select("platform, status")
    .gte("created_at", threeDaysAgo)
    .order("created_at", { ascending: false });

  if (recentLogs) {
    const byPlatform: Record<string, string[]> = {};
    for (const log of recentLogs) {
      if (!byPlatform[log.platform]) byPlatform[log.platform] = [];
      byPlatform[log.platform].push(log.status);
    }
    const failedPlatforms = Object.entries(byPlatform)
      .filter(([, statuses]) => statuses.length >= 3 && statuses.every((s) => s === "error"))
      .map(([platform]) => platform);

    if (failedPlatforms.length > 0 && process.env.ADMIN_EMAIL) {
      await resend.emails.send({
        from: "통역공고 서치 <onboarding@resend.dev>",
        to: process.env.ADMIN_EMAIL,
        subject: `[경고] 크롤러 3일 연속 실패: ${failedPlatforms.join(", ")}`,
        html: `<p>다음 플랫폼이 3일 연속 크롤링에 실패했습니다: <strong>${failedPlatforms.join(", ")}</strong></p>`,
      });
    }
  }

  return supabase;
}

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  return notifyUsers(await handleNotify());
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const supabase = await handleNotify();
  return notifyUsers(supabase);
}

async function notifyUsers(supabase: ReturnType<typeof createAdminClient>) {

  // 오늘 수집된 새 공고 조회 (최근 2시간 이내)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: newJobs } = await supabase
    .from("jobs")
    .select("*")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false });

  if (!newJobs || newJobs.length === 0) {
    return NextResponse.json({ status: "no_new_jobs" });
  }

  // 이메일 알림 ON인 사용자 조회
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("email_alert", true);

  if (!settings || settings.length === 0) {
    return NextResponse.json({ status: "no_subscribers" });
  }

  // 사용자 이메일 조회
  const userIds = settings.map((s) => s.user_id);
  const emails: string[] = [];
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid);
    if (data?.user?.email) emails.push(data.user.email);
  }

  if (emails.length === 0) {
    return NextResponse.json({ status: "no_emails" });
  }

  // HTML 이메일 생성
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const jobListHtml = newJobs.slice(0, 20).map((job) => {
    const platform = PLATFORMS.find((p) => p.key === job.platform);
    return `
      <div style="border:1px solid #e8e8e8;border-radius:8px;padding:14px;margin-bottom:10px;">
        <span style="background:${platform?.bgColor};color:${platform?.textColor};font-size:11px;padding:2px 6px;border-radius:3px;font-weight:600;">${platform?.label}</span>
        <div style="font-weight:600;font-size:14px;margin:8px 0 4px;">${job.title}</div>
        <div style="color:#888;font-size:12px;">${job.company}</div>
      </div>
    `;
  }).join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
      <h2 style="font-size:18px;">새로운 통역/번역 공고 ${newJobs.length}건</h2>
      ${jobListHtml}
      ${newJobs.length > 20 ? `<p style="color:#888;font-size:12px;">외 ${newJobs.length - 20}건 더...</p>` : ""}
      <a href="${appUrl}" style="display:inline-block;background:#333;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:10px;">공고 확인하기</a>
    </div>
  `;

  // 발송
  for (const email of emails) {
    await resend.emails.send({
      from: "통역공고 서치 <onboarding@resend.dev>",
      to: email,
      subject: `새로운 통역/번역 공고 ${newJobs.length}건이 등록되었습니다`,
      html,
    });
  }

  return NextResponse.json({ status: "sent", recipients: emails.length, jobs: newJobs.length });
}
// notifyUsers 함수 종료
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/notify/
git commit -m "이메일 알림 API — Resend로 새 공고 HTML 이메일 발송"
```

---

### Task 14: HTML 파싱 크롤러 구현 (잡코리아, GSIT, LinkedIn, Indeed)

**Files:**
- Modify: `src/crawlers/jobkorea.ts`
- Modify: `src/crawlers/gsit.ts`
- Modify: `src/crawlers/linkedin.ts`
- Modify: `src/crawlers/indeed.ts`

> 각 플랫폼의 실제 HTML 구조를 리서치한 뒤 구현. 아래 순서대로 진행.

- [ ] **Step 1: 잡코리아 셀렉터 리서치**

브라우저에서 `https://www.jobkorea.co.kr/Search/?stext=통역&tabType=recruit` 접속 → 개발자 도구로 공고 카드의 HTML 셀렉터 확인. 확인 후 `jobkorea.ts`의 `$(".list-post ...")` 부분을 실제 셀렉터로 채움.

- [ ] **Step 2: GSIT 게시판 URL + 셀렉터 리서치**

한국통번역대학원 공식 사이트에서 채용/공고 게시판 URL 확인. 목록 구조 파악 후 `gsit.ts` 구현.

- [ ] **Step 3: LinkedIn 비로그인 구조 확인**

`https://www.linkedin.com/jobs/search/?keywords=interpreter&location=South%20Korea` 접속. 응답이 JS 렌더링인지 확인. 정적 HTML이면 셀렉터 구현, JS 필요하면 해당 크롤러는 빈 배열 반환 유지 (graceful skip).

- [ ] **Step 4: Indeed 구조 확인**

`https://kr.indeed.com/jobs?q=통역` 접속 → 동일하게 확인 후 구현 또는 skip.

- [ ] **Step 5: 커밋**

```bash
git add src/crawlers/
git commit -m "HTML 파싱 크롤러 구현 — 잡코리아/GSIT 실제 셀렉터 적용"
```

---

### Task 15: 최종 점검 + 배포 준비

- [ ] **Step 1: next.config.ts 확인**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 2: 로컬 개발 서버 실행 및 테스트**

```bash
npm run dev
```

- /login 접속 → 로그인
- 메인 페이지 카드 목록 확인
- 필터/정렬 동작 확인
- 북마크 토글 확인
- /bookmarks 페이지 확인
- /settings 블랙리스트 + 알림 설정 확인

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

에러 없이 빌드 통과 확인.

- [ ] **Step 4: Vercel 배포**

```bash
npx vercel --prod
```

배포 후 환경변수 설정 (Vercel 대시보드):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `SARAMIN_API_KEY`
- `WORKNET_API_KEY`
- `ADMIN_EMAIL`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL` (배포된 URL)

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "배포 준비 완료 — next.config 설정 + 빌드 확인"
```
