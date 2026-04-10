/**
 * Role: 사용자 수동 크롤링 트리거 API (GEE-Research + GEE-Reviewer 파이프라인)
 * Key Features:
 *   1. 로그인 사용자 인증 후 전체 크롤러 fire-and-forget 실행 (GEE-Research)
 *   2. 크롤링 완료 예상 시간(90초) 후 Reviewer 자동 호출 (GEE-Reviewer)
 * Dependencies: supabase/server, /api/crawl/[platform], /api/review
 * Notes: CRON_SECRET 노출 없이 UI 버튼으로 전체 파이프라인 실행 가능
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["saramin", "jobkorea", "linkedin", "indeed", "gsit", "wanted", "hufscit"];

// 크롤링 완료 대기 후 Reviewer 호출 (fire-and-forget)
function scheduleReview(baseUrl: string, delayMs: number) {
  setTimeout(() => {
    fetch(`${baseUrl}/api/review`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
    }).catch(() => {});
  }, delayMs);
}

export async function POST() {
  // 로그인 사용자만 허용
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // GEE-Research: 전체 플랫폼 크롤러 fire-and-forget 실행
  PLATFORMS.forEach((platform) => {
    fetch(`${baseUrl}/api/crawl/${platform}`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
    }).catch(() => {});
  });

  // GEE-Reviewer: 90초 후 DB 정제 실행 (크롤링 완료 예상 시간)
  scheduleReview(baseUrl, 90_000);

  return NextResponse.json({ status: "triggered", platforms: PLATFORMS });
}
