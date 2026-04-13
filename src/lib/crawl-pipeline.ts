/**
 * Role: 크롤 파이프라인 공유 모듈 — refresh/cron 양쪽에서 직접 호출
 * Key Features: 전 플랫폼 병렬 크롤링, 필터링, DB 저장, 로그 기록
 * Dependencies: crawlers/*, supabase/admin, constants
 * Notes:
 *   - HTTP 자기참조(fetch to /api/crawl) 방식을 제거하고 함수 직접 호출로 변경
 *   - Vercel 서버리스에서 자기참조 fetch는 불안정 — 이 방식이 더 신뢰성 있음
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSaramin } from "@/crawlers/saramin";
import { crawlJobkorea } from "@/crawlers/jobkorea";
import { crawlLinkedin } from "@/crawlers/linkedin";
import { crawlIndeed } from "@/crawlers/indeed";
import { crawlGsit } from "@/crawlers/gsit";
import { crawlWanted } from "@/crawlers/wanted";
import { crawlHufscit } from "@/crawlers/hufscit";
import type { CrawledJob } from "@/lib/types";
import {
  EXCLUDED_LANGUAGE_KEYWORDS,
  EXCLUDED_ROLE_KEYWORDS,
  MEDICAL_COMPANY_KEYWORDS,
  MEDICAL_TITLE_KEYWORDS,
  ACADEMY_COMPANY_KEYWORDS,
} from "@/lib/constants";

const CRAWLERS = [
  crawlSaramin,
  crawlJobkorea,
  crawlLinkedin,
  crawlIndeed,
  crawlGsit,
  crawlWanted,
  crawlHufscit,
];

/** 비통역 공고 필터링 */
function applyFilters(jobs: CrawledJob[]): CrawledJob[] {
  return jobs.filter((job) => {
    const titleLower = job.title.toLowerCase();
    const company = job.company ?? "";

    if (EXCLUDED_LANGUAGE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()))) return false;
    if (EXCLUDED_ROLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()))) return false;
    if ([...MEDICAL_COMPANY_KEYWORDS, ...ACADEMY_COMPANY_KEYWORDS].some((kw) => company.includes(kw))) return false;
    if (MEDICAL_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()))) return false;
    return true;
  });
}

/**
 * 전 플랫폼 크롤링 실행 — HTTP 자기참조 없이 함수 직접 호출
 * 모든 크롤러 병렬 실행 후 DB 저장 및 로그 기록
 */
export async function runCrawlPipeline(): Promise<{ platform: string; status: string; jobs_found: number }[]> {
  const admin = createAdminClient();

  // 모든 크롤러 병렬 실행
  const results = await Promise.allSettled(CRAWLERS.map((fn) => fn()));

  const summary: { platform: string; status: string; jobs_found: number }[] = [];

  for (const result of results) {
    if (result.status === "rejected") continue;

    const { platform, jobs, error } = result.value;

    if (error) {
      await admin.from("crawl_logs").insert({
        platform, status: "error", error_message: error, jobs_found: 0,
      });
      summary.push({ platform, status: "error", jobs_found: 0 });
      continue;
    }

    const filtered = applyFilters(jobs);

    // 배치 upsert — 중복 external_id는 무시
    if (filtered.length > 0) {
      await admin.from("jobs").upsert(filtered, { onConflict: "external_id", ignoreDuplicates: true });
    }

    await admin.from("crawl_logs").insert({
      platform, status: "success", jobs_found: jobs.length,
    });

    summary.push({ platform, status: "success", jobs_found: jobs.length });
  }

  return summary;
}
