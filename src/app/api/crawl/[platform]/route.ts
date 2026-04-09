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

const crawlers: Record<Platform, () => Promise<{ platform: Platform; jobs: { platform: Platform; title: string; company: string; start_date: string | null; end_date: string | null; url: string; external_id: string }[]; error?: string }>> = {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    await supabase.from("crawl_logs").insert({
      platform, status: "error", error_message: message, jobs_found: 0,
    });
    return NextResponse.json({ platform, status: "error", error: message });
  }
}
