/**
 * Role: 개별 플랫폼 크롤링 실행 API — 오케스트레이터에서 호출
 * Key Features: 크롤링 실행 + DB 저장 + 로그 기록
 * Dependencies: crawlers/*, supabase/admin
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSaramin } from "@/crawlers/saramin";
import { crawlJobkorea } from "@/crawlers/jobkorea";
import { crawlLinkedin } from "@/crawlers/linkedin";
import { crawlIndeed } from "@/crawlers/indeed";
import { crawlGsit } from "@/crawlers/gsit";
import { crawlWanted } from "@/crawlers/wanted";
import { crawlHufscit } from "@/crawlers/hufscit";
import type { Platform } from "@/lib/types";
import {
  EXCLUDED_LANGUAGE_KEYWORDS,
  EXCLUDED_ROLE_KEYWORDS,
  MEDICAL_COMPANY_KEYWORDS,
  MEDICAL_TITLE_KEYWORDS,
  ACADEMY_COMPANY_KEYWORDS,
} from "@/lib/constants";

const crawlers: Record<Platform, () => Promise<{ platform: Platform; jobs: { platform: Platform; title: string; company: string; start_date: string | null; end_date: string | null; url: string; external_id: string }[]; error?: string }>> = {
  saramin: crawlSaramin,
  jobkorea: crawlJobkorea,
  linkedin: crawlLinkedin,
  indeed: crawlIndeed,
  gsit: crawlGsit,
  wanted: crawlWanted,
  hufscit: crawlHufscit,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;

  // 시크릿 검증 (환경변수 미설정 시 차단)
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
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

    // DB 저장 전 필터링 — 비영어 언어 공고 + 의료 공고 제외
    const filtered = result.jobs.filter((job) => {
      const titleLower = job.title.toLowerCase();
      const company = job.company ?? "";

      // 비영어 언어 키워드가 제목에 있으면 제외
      const hasExcludedLang = EXCLUDED_LANGUAGE_KEYWORDS.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      if (hasExcludedLang) return false;

      // 비통역사 직군 제외 (엔지니어, 개발자 등)
      const hasExcludedRole = EXCLUDED_ROLE_KEYWORDS.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      if (hasExcludedRole) return false;

      // 의료 + 학원 업종 제외
      const isBadCompany = [...MEDICAL_COMPANY_KEYWORDS, ...ACADEMY_COMPANY_KEYWORDS].some((kw) => company.includes(kw));
      const isMedicalTitle = MEDICAL_TITLE_KEYWORDS.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      return !isBadCompany && !isMedicalTitle;
    });

    // 공고 저장 (중복은 upsert로 무시)
    let newCount = 0;
    for (const job of filtered) {
      const { error } = await supabase.from("jobs").upsert(job, { onConflict: "external_id", ignoreDuplicates: true });
      if (!error) newCount++;
    }

    // 성공 로그 기록
    await supabase.from("crawl_logs").insert({
      platform, status: "success", jobs_found: result.jobs.length,
    });

    return NextResponse.json({ platform, status: "success", total: result.jobs.length, new: newCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    await supabase.from("crawl_logs").insert({
      platform, status: "error", error_message: message, jobs_found: 0,
    });
    return NextResponse.json({ platform, status: "error", error: message });
  }
}
