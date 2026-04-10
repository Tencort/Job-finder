/**
 * Role: 사용자 수동 크롤링 트리거 API (GEE-Research + GEE-Reviewer 파이프라인)
 * Key Features:
 *   1. 로그인 사용자 인증 후 전체 크롤러 fire-and-forget 실행 (GEE-Research)
 *   2. Reviewer도 즉시 fire-and-forget 실행 (GEE-Reviewer)
 * Dependencies: supabase/server, /api/crawl/[platform], /api/review
 * Notes:
 *   - Vercel 서버리스는 응답 반환 후 setTimeout이 실행되지 않으므로
 *     크롤러와 Reviewer를 모두 즉시 fire-and-forget으로 실행
 *   - Reviewer가 크롤러와 동시에 실행돼도 무방 — 기존 DB 정제가 주목적
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["saramin", "jobkorea", "linkedin", "indeed", "gsit", "wanted", "hufscit"];

export async function POST() {
  // 로그인 사용자만 허용
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const cronHeader = { "x-cron-secret": process.env.CRON_SECRET! };

  // GEE-Research: 전체 플랫폼 크롤러 fire-and-forget 실행
  PLATFORMS.forEach((platform) => {
    fetch(`${baseUrl}/api/crawl/${platform}`, { method: "POST", headers: cronHeader }).catch(() => {});
  });

  // GEE-Reviewer: 기존 DB 즉시 정제 (fire-and-forget)
  fetch(`${baseUrl}/api/review`, { method: "POST", headers: cronHeader }).catch(() => {});

  return NextResponse.json({ status: "triggered", platforms: PLATFORMS });
}
