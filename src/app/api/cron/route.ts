/**
 * Role: 크롤링 오케스트레이터 — Vercel Cron에서 매일 1회 호출
 * Key Features: 6개 크롤러 병렬 호출 (fire-and-forget) + 30초 후 이메일 알림 트리거
 * Dependencies: crawl/[platform], notify API
 */
import { NextRequest, NextResponse } from "next/server";

const PLATFORMS = ["saramin", "jobkorea", "linkedin", "indeed", "gsit", "wanted", "hufscit"];

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
