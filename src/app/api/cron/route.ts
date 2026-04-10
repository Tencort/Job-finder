/**
 * Role: 크롤링 오케스트레이터 — Vercel Cron에서 매일 1회 호출
 * Key Features: 6개 크롤러 병렬 호출 (fire-and-forget) + 30초 후 이메일 알림 트리거
 * Dependencies: crawl/[platform], notify API
 */
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

const PLATFORMS = ["saramin", "jobkorea", "linkedin", "indeed", "gsit", "wanted", "hufscit"];

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 (환경변수 미설정 시 차단)
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const cronHeader = { "x-cron-secret": process.env.CRON_SECRET! };

  // waitUntil로 응답 반환 후에도 크롤러 실행 보장
  waitUntil(
    Promise.all(
      PLATFORMS.map((platform) =>
        fetch(`${baseUrl}/api/crawl/${platform}`, { method: "POST", headers: cronHeader }).catch(() => {})
      )
    )
  );

  return NextResponse.json({ status: "crawlers_triggered" });
}
