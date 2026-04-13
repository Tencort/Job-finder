/**
 * Role: 사용자 수동 크롤링 트리거 API
 * Key Features: 로그인 사용자 인증 후 크롤 파이프라인 직접 실행 (HTTP 자기참조 제거)
 * Dependencies: supabase/server, lib/crawl-pipeline
 * Notes: HTTP 자기참조(fetch to /api/crawl) 방식 제거 — Vercel에서 불안정했던 구조 수정
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCrawlPipeline } from "@/lib/crawl-pipeline";

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const summary = await runCrawlPipeline();

  return NextResponse.json({ status: "done", results: summary });
}
