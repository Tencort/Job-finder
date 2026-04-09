/**
 * Role: 새 공고 이메일 알림 발송 — 크롤링 후 오케스트레이터에서 호출
 * Key Features: 오늘 수집된 새 공고 조회 → 알림 설정 ON인 사용자에게 HTML 이메일 발송
 * Dependencies: supabase/admin, resend
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { PLATFORMS } from "@/lib/constants";

const resend = new Resend(process.env.RESEND_API_KEY);

// 3일 연속 실패 플랫폼 감지 + 어드민 알림
async function checkCrawlerHealth(supabase: ReturnType<typeof createAdminClient>) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from("crawl_logs")
    .select("platform, status")
    .gte("created_at", threeDaysAgo)
    .order("created_at", { ascending: false });

  if (!recentLogs) return;

  const byPlatform: Record<string, string[]> = {};
  for (const log of recentLogs) {
    if (!byPlatform[log.platform]) byPlatform[log.platform] = [];
    byPlatform[log.platform].push(log.status);
  }
  const failedPlatforms = Object.entries(byPlatform)
    .filter(([, statuses]) => statuses.length >= 3 && statuses.every((s) => s === "error"))
    .map(([platform]) => platform);

  if (failedPlatforms.length > 0 && process.env.ADMIN_EMAIL) {
    await resend.emails.send({
      from: "통역공고 서치 <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL,
      subject: `[경고] 크롤러 3일 연속 실패: ${failedPlatforms.join(", ")}`,
      html: `<p>다음 플랫폼이 3일 연속 크롤링에 실패했습니다: <strong>${failedPlatforms.join(", ")}</strong></p>`,
    });
  }
}

async function notifyUsers(supabase: ReturnType<typeof createAdminClient>) {
  // 오늘 수집된 새 공고 조회 (최근 2시간 이내)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: newJobs } = await supabase
    .from("jobs")
    .select("*")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false });

  if (!newJobs || newJobs.length === 0) {
    return NextResponse.json({ status: "no_new_jobs" });
  }

  // 이메일 알림 ON인 사용자 조회
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("email_alert", true);

  if (!settings || settings.length === 0) {
    return NextResponse.json({ status: "no_subscribers" });
  }

  // 사용자 이메일 조회
  const userIds = settings.map((s) => s.user_id);
  const emails: string[] = [];
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid);
    if (data?.user?.email) emails.push(data.user.email);
  }

  if (emails.length === 0) {
    return NextResponse.json({ status: "no_emails" });
  }

  // HTML 이메일 생성
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const jobListHtml = newJobs.slice(0, 20).map((job) => {
    const platform = PLATFORMS.find((p) => p.key === job.platform);
    return `
      <div style="border:1px solid #e8e8e8;border-radius:8px;padding:14px;margin-bottom:10px;">
        <span style="background:${platform?.bgColor};color:${platform?.textColor};font-size:11px;padding:2px 6px;border-radius:3px;font-weight:600;">${platform?.label}</span>
        <div style="font-weight:600;font-size:14px;margin:8px 0 4px;">${job.title}</div>
        <div style="color:#888;font-size:12px;">${job.company}</div>
      </div>
    `;
  }).join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
      <h2 style="font-size:18px;">새로운 통역/번역 공고 ${newJobs.length}건</h2>
      ${jobListHtml}
      ${newJobs.length > 20 ? `<p style="color:#888;font-size:12px;">외 ${newJobs.length - 20}건 더...</p>` : ""}
      <a href="${appUrl}" style="display:inline-block;background:#333;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:10px;">공고 확인하기</a>
    </div>
  `;

  // 발송
  for (const email of emails) {
    await resend.emails.send({
      from: "통역공고 서치 <onboarding@resend.dev>",
      to: email,
      subject: `새로운 통역/번역 공고 ${newJobs.length}건이 등록되었습니다`,
      html,
    });
  }

  return NextResponse.json({ status: "sent", recipients: emails.length, jobs: newJobs.length });
}

// Vercel Cron은 GET으로 호출
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const supabase = createAdminClient();
  await checkCrawlerHealth(supabase);
  return notifyUsers(supabase);
}

// 수동 트리거는 POST
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const supabase = createAdminClient();
  await checkCrawlerHealth(supabase);
  return notifyUsers(supabase);
}
