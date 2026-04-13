/**
 * Role: 사용자 수동 크롤링 트리거 API (GEE-Research + GEE-Reviewer 파이프라인)
 * Key Features:
 *   1. 로그인 사용자 인증 후 전체 크롤러 병렬 실행 완료 대기 (GEE-Research)
 *   2. 크롤러 완료 후 Reviewer 실행 (GEE-Reviewer)
 *   3. 모든 작업 완료 후 응답 반환 — UI가 최신 공고를 바로 조회 가능
 * Dependencies: supabase/server, /api/crawl/[platform], /api/review
 * Notes:
 *   - maxDuration: 60 (vercel.json)으로 타임아웃 60초 설정
 *   - 크롤러 실패는 개별 catch로 무시 — 전체 파이프라인 중단 방지
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["saramin", "jobkorea", "linkedin", "indeed", "gsit", "wanted", "hufscit"];

export const maxDuration = 60;

export async function POST() {
  // 로그인 사용자만 허용
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const cronHeader = { "x-cron-secret": process.env.CRON_SECRET! };

  // GEE-Research: 전체 플랫폼 크롤러 병렬 실행 — 모두 완료될 때까지 대기
  await Promise.all(
    PLATFORMS.map((platform) =>
      fetch(`${baseUrl}/api/crawl/${platform}`, { method: "POST", headers: cronHeader }).catch(() => {})
    )
  );

  // GEE-Reviewer: 크롤링 완료 후 DB 정제
  await fetch(`${baseUrl}/api/review`, { method: "POST", headers: cronHeader }).catch(() => {});

  return NextResponse.json({ status: "done", platforms: PLATFORMS });
}
