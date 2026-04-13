/**
 * Role: 크롤링 오케스트레이터 — Vercel Cron에서 매일 1회 호출
 * Key Features: crawl → notify 순차 실행 (Hobby 플랜 cron 2개 제한 대응)
 * Dependencies: lib/crawl-pipeline, /api/notify
 * Notes:
 *   - Vercel Hobby는 cron 2개 제한 → /api/cron(크롤+알림) + /api/review(DB정제)
 *   - 크롤 완료 후 바로 새 공고 기준 시각 계산 → notify 호출
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCrawlPipeline } from "@/lib/crawl-pipeline";
import { Resend } from "resend";
import { PLATFORMS } from "@/lib/constants";

export const maxDuration = 60;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 크롤 완료 후 신규 공고 이메일 발송 */
async function notifyNewJobs(since: string) {
  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 크롤 시작 시각 이후 삽입된 공고만 조회
  const { data: newJobs } = await supabase
    .from("jobs")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (!newJobs || newJobs.length === 0) return { status: "no_new_jobs" };

  // 수신 대상: 전체 사용자 중 email_alert=false 명시한 사람 제외 (기본 수신)
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const { data: optedOut } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("email_alert", false);
  const optedOutIds = new Set((optedOut || []).map((s) => s.user_id));
  const emails = users
    .filter((u) => u.email && !optedOutIds.has(u.id))
    .map((u) => u.email as string);

  if (emails.length === 0) return { status: "no_recipients" };

  const jobListHtml = newJobs.slice(0, 20).map((job) => {
    const platform = PLATFORMS.find((p) => p.key === job.platform);
    return `
      <div style="border:1px solid #e8e8e8;border-radius:8px;padding:14px;margin-bottom:10px;">
        <span style="background:${platform?.bgColor};color:${platform?.textColor};font-size:11px;padding:2px 6px;border-radius:3px;font-weight:600;">${platform?.label ?? job.platform}</span>
        <div style="font-weight:600;font-size:14px;margin:8px 0 4px;">${escapeHtml(job.title)}</div>
        <div style="color:#888;font-size:12px;">${escapeHtml(job.company)}</div>
      </div>`;
  }).join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
      <h2 style="font-size:18px;">새로운 통역/번역 공고 ${newJobs.length}건</h2>
      ${jobListHtml}
      ${newJobs.length > 20 ? `<p style="color:#888;font-size:12px;">외 ${newJobs.length - 20}건 더...</p>` : ""}
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background:#333;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:10px;">공고 확인하기</a>
    </div>`;

  for (const email of emails) {
    await resend.emails.send({
      from: "통역공고 서치 <onboarding@resend.dev>",
      to: email,
      subject: `새로운 통역/번역 공고 ${newJobs.length}건이 등록되었습니다`,
      html,
    });
  }

  return { status: "sent", recipients: emails.length, jobs: newJobs.length };
}

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  // 크롤 시작 시각 기록 — 이 시각 이후 삽입된 공고 = 신규 공고
  const crawlStartedAt = new Date().toISOString();

  // 크롤 실행
  const crawlSummary = await runCrawlPipeline();

  // 신규 공고 이메일 발송
  const notifyResult = await notifyNewJobs(crawlStartedAt);

  return NextResponse.json({ status: "done", crawl: crawlSummary, notify: notifyResult });
}
