/**
 * Role: 크롤링 오케스트레이터 — Vercel Cron에서 매일 1회 호출
 * Key Features: Cron 인증 후 크롤 파이프라인 직접 실행 (HTTP 자기참조 제거)
 * Dependencies: lib/crawl-pipeline
 */
import { NextRequest, NextResponse } from "next/server";
import { runCrawlPipeline } from "@/lib/crawl-pipeline";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const summary = await runCrawlPipeline();

  return NextResponse.json({ status: "done", results: summary });
}
