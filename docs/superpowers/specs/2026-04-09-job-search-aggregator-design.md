# 통역/번역 공고 통합 서치 서비스 — 디자인 스펙

## 1. 개요

여러 채용 플랫폼에 흩어진 통역/번역 공고를 하나의 웹서비스에서 통합 조회할 수 있는 서비스.
2명의 사용자가 사용하는 소규모 공개 서비스.

## 2. 기술 스택

| 항목 | 기술 |
|------|------|
| 프론트엔드 + 백엔드 | Next.js (App Router) |
| 데이터베이스 + 인증 | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |
| 크롤링 | Vercel Cron Jobs + Next.js API Routes |
| 이메일 알림 | Resend (무료 티어: 월 3,000건) |
| 폰트 | Pretendard Variable |

## 3. 대상 플랫폼 & 검색 키워드

### 플랫폼 (6개)
- 사람인 (saramin)
- 잡코리아 (jobkorea)
- 워크넷 (worknet)
- LinkedIn (linkedin)
- Indeed (indeed)
- 한국통번역대학원 GSIT (gsit)

### 검색 키워드
통역, 번역, 통번역, translator, translation, interpreter, interpretation

## 4. 데이터베이스 스키마

### jobs (공고)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID, gen_random_uuid() |
| platform | text | 출처 플랫폼 (saramin, jobkorea, worknet, linkedin, indeed, gsit) |
| title | text | 공고 제목 |
| company | text | 회사명 |
| start_date | date (nullable) | 게시 시작일 (미제공 시 null) |
| end_date | date (nullable) | 마감일 (상시채용은 null) |
| url | text | 원본 공고 링크 |
| external_id | text (unique) | 플랫폼+공고ID 조합 — 중복 방지 (예: "saramin_12345") |
| created_at | timestamptz | 수집 시각, default now() |

### bookmarks (북마크)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| user_id | uuid (FK → auth.users) | 사용자 |
| job_id | uuid (FK → jobs) | 북마크한 공고 |
| created_at | timestamptz | 북마크 시각 |

- unique constraint: (user_id, job_id)

### blocked_companies (블랙리스트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| user_id | uuid (FK → auth.users) | 사용자 |
| company_name | text | 차단할 기업명 |
| created_at | timestamptz | 차단 시각 |

- unique constraint: (user_id, company_name)

### user_settings (사용자 설정)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| user_id | uuid (FK → auth.users, unique) | 사용자 |
| email_alert | boolean | 이메일 알림 ON/OFF, default true |
| updated_at | timestamptz | 마지막 수정 시각 |

### RLS 정책
- jobs: 인증된 사용자 전원 읽기 가능
- bookmarks: 본인 데이터만 CRUD
- blocked_companies: 본인 데이터만 CRUD
- user_settings: 본인 데이터만 읽기/수정

### crawl_logs (크롤링 로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| platform | text | 플랫폼명 |
| status | text | 'success' 또는 'error' |
| error_message | text (nullable) | 실패 시 에러 메시지 |
| jobs_found | integer | 수집된 공고 수 |
| created_at | timestamptz | 실행 시각 |

### DB 인덱스
- jobs: (platform), (created_at DESC), (end_date), (external_id) — unique
- bookmarks: (user_id, job_id) — unique
- blocked_companies: (user_id, company_name) — unique
- crawl_logs: (platform, created_at DESC)

## 5. 시스템 아키텍처

```
[6개 플랫폼] → [Vercel Cron Jobs (매일 1회)]
                    ↓
              [Next.js API Routes — 플랫폼별 크롤러]
                    ↓
              [Supabase PostgreSQL — 중복 체크 후 저장]
                    ↓
              [새 공고 감지 시 이메일 알림 발송]
                    ↓
              [Next.js 웹앱 — 사용자 조회]
```

### 크롤링 흐름
1. Vercel Cron이 매일 KST 오전 7시에 오케스트레이터 API Route를 트리거
2. 오케스트레이터가 6개 플랫폼 크롤러 API Route를 fetch()로 fire-and-forget 방식 병렬 호출 (각 크롤러는 독립 서버리스 함수로 실행 — Vercel 함수 10초 제한 분산)
3. 각 크롤러가 키워드로 검색 → 제목, 회사명, 시작일, 마감일, 원본 링크 추출
4. external_id로 중복 체크 → 신규 공고만 Supabase에 INSERT
5. 오케스트레이터가 모든 크롤러 호출 후 일정 대기(30초) 뒤 별도 이메일 발송 API Route 호출 → 새로 추가된 공고를 조회하여 통합 이메일 1건 발송

### 플랫폼별 수집 방식

| 플랫폼 | 방식 | 비고 |
|--------|------|------|
| 사람인 | 공개 API (oapi.saramin.co.kr) | API 키 필요 (무료 발급) |
| 잡코리아 | HTML 파싱 (검색 결과 페이지) | 로그인 불필요 |
| 워크넷 | 공개 API (openapi.work.go.kr) | API 키 필요 (무료 발급) |
| LinkedIn | HTML 파싱 (jobs/search 페이지) | 비로그인 검색 결과 활용, 봇 차단 리스크 있음 — 실패 시 스킵 |
| Indeed | HTML 파싱 (검색 결과 페이지) | 봇 차단 리스크 있음 — 실패 시 스킵 |
| GSIT | HTML 파싱 (게시판) | 로그인 불필요, URL은 구현 시 리서치 |

> **참고**: HTML 파싱 대상 플랫폼(잡코리아, LinkedIn, Indeed, GSIT)의 구체적 셀렉터/구조는 구현 단계에서 리서치하여 결정. 각 크롤러 모듈 내부에 파싱 로직을 캡슐화하여 플랫폼 구조 변경 시 해당 모듈만 수정.
> **봇 차단 대응**: User-Agent 헤더 설정, 요청 간격 1~2초 딜레이 적용. LinkedIn/Indeed는 차단 시 graceful하게 스킵.

### 크롤링 에러 처리
- 개별 플랫폼 크롤러 실패 시 해당 플랫폼만 스킵, 나머지 계속 진행
- 실패 내역은 Supabase에 crawl_logs 테이블로 기록 (platform, status, error_message, created_at)
- 3일 연속 실패 감지: 크롤링 오케스트레이터가 crawl_logs를 쿼리하여 판단
- 3일 연속 실패 시 환경변수 ADMIN_EMAIL로 알림 발송

### 정렬 로직
- 기본: 최신순 (created_at DESC)
- 보조 옵션: 마감임박순 (end_date ASC, null은 뒤로), 회사명순 (company ASC), 제목순 (title ASC)
- 블랙리스트 기업의 공고는 쿼리 시점에 제외

## 6. 페이지 구성

### /login — 로그인
- 이메일 + 비밀번호 로그인
- Supabase Auth 사용
- 미인증 시 모든 페이지에서 /login으로 리다이렉트

### / (메인) — 공고 목록
- 카드형 그리드 레이아웃 (반응형: 모바일 1열, 데스크톱 3~4열)
- 상단 필터 바: 정렬 탭 (pill 형태) + 플랫폼 필터 (태그 형태)
- 카드 구성: 플랫폼 컬러바 + 배지 / 제목 / 회사명 / 기간 + D-day / 북마크 하트 / 원본 링크
- 카드 클릭 시 원본 플랫폼으로 이동 (새 탭)
- 하트 클릭 시 북마크 토글
- 블랙리스트 기업 공고는 표시되지 않음
- 페이지네이션: 커서 기반 (created_at + id), 한 번에 30건 로드, 무한 스크롤로 추가 요청

### /bookmarks — 북마크
- 내가 저장한 공고만 카드형으로 표시
- 메인과 동일한 카드 레이아웃

### /settings — 설정
- 블랙리스트 관리: 차단된 기업 목록 표시 + 해제 버튼, 직접 기업명 입력하여 추가 가능
- 블랙리스트 추가 경로: 메인 카드의 회사명 옆 차단 버튼 클릭 또는 /settings에서 직접 입력
- 이메일 알림 ON/OFF 설정
- 로그아웃 버튼

## 7. UI 디자인 스타일

### 테마
- 라이트 테마 (화이트 카드 + #f8f8f8 배경)
- 원티드(wanted.co.kr) 스타일 참고

### 폰트
- Pretendard Variable (CDN: jsdelivr)
- 한글 자간: letter-spacing: -0.02em
- 본문: 13~15px, 제목: 15~18px

### 카드 디자인
- 흰색 카드, border-radius: 10px
- 상단 4px 컬러바로 플랫폼 구분
- 플랫폼별 색상:
  - 사람인: #e94560
  - LinkedIn: #0a66c2
  - 잡코리아: #f59e0b
  - 워크넷: #10b981
  - GSIT: #8b5cf6
  - Indeed: #2557a7
- 호버 시 box-shadow 강화 + translateY(-2px)
- 북마크: 하트(♥) 아이콘, 활성 시 #e94560

### D-day 색상
- 마감 임박 (D-14 이내): #e94560 (빨강)
- 여유 있음: #f59e0b (노랑)
- 상시채용: #10b981 (초록)

### 필터/정렬 UI
- 정렬: pill 형태 라운드 버튼 (활성: #333 배경 + 흰 글씨)
- 플랫폼 필터: 사각 태그 (활성: #e8f4fd 배경 + #0084d6 글씨)

## 8. 인증

- Supabase Auth (이메일 + 비밀번호)
- 사용자 2명 — Supabase 대시보드에서 직접 생성 (회원가입 페이지 없음)
- 미인증 접근 시 /login 리다이렉트
- 세션 관리: Supabase 기본 JWT

## 9. 이메일 알림

- 트리거: 크롤링 후 새 공고가 1건 이상 발견됐을 때
- 수신: 알림 설정을 켠 사용자
- 내용: 새로 수집된 공고 목록 (제목, 회사명, 플랫폼) + 서비스 링크
- 발송: Resend (무료 티어: 월 3,000건), 발신자: onboarding@resend.dev (무료 티어 기본 발신자)
- 알림 설정: user_settings 테이블의 email_alert 값으로 수신 여부 결정
- 이메일 형식: HTML 템플릿 (공고 카드 형태로 요약)

## 10. 비용

| 항목 | 무료 티어 한도 | 예상 사용량 |
|------|---------------|------------|
| Vercel | Cron 1일 1회, 함수 100시간/월 | 충분 |
| Supabase | 500MB DB, 50K 요청/월 | 충분 |
| Resend | 3,000건/월 | 충분 (최대 30건/월) |

모든 컴포넌트를 무료 티어 내에서 운영 가능.

## 11. 수집 데이터 범위

- 수집 항목: 제목, 회사명, 시작일, 마감일, 원본 링크
- 상세 내용은 수집하지 않음 → 원본 링크로 이동
- 법적 리스크 최소화: 목록 수준 메타데이터만 수집

## 12. 만료 공고 처리

- 마감일이 지난 공고는 목록에서 기본 숨김 (end_date < today)
- 상시채용(end_date = null)은 항상 표시
- DB에서 삭제하지 않음 — 북마크 참조 유지를 위해 보존
- 향후 필요 시 "지난 공고 보기" 토글 추가 가능
