/**
 * Role: GEE-Reviewer — DB 공고 품질 검수 및 정제
 * Key Features:
 *   1. 북마크된 공고는 어떤 이유로도 삭제하지 않음
 *   2. 필터 위반 공고 삭제 (비영어 언어/국가 / 비통역 직군 / 의료 / 학원)
 *   3. 중복 공고 삭제 (title + company 완전 일치 → 최신 1건 유지)
 *   4. 만료 공고 삭제 (end_date < 오늘, 북마크 없는 것만)
 * Dependencies: supabase/admin, constants
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EXCLUDED_LANGUAGE_KEYWORDS,
  EXCLUDED_ROLE_KEYWORDS,
  MEDICAL_COMPANY_KEYWORDS,
  MEDICAL_TITLE_KEYWORDS,
  ACADEMY_COMPANY_KEYWORDS,
  RELEVANT_TITLE_KEYWORDS,
} from "@/lib/constants";

const DELETE_BATCH = 100;

async function fetchAllJobs(supabase: ReturnType<typeof createAdminClient>) {
  const jobs: { id: string; title: string; company: string; created_at: string; end_date: string | null }[] = [];
  const BATCH = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, created_at, end_date")
      .range(from, from + BATCH - 1)
      .order("id");

    if (error || !data || data.length === 0) break;
    jobs.push(...data);
    if (data.length < BATCH) break;
    from += BATCH;
  }

  return jobs;
}

async function deleteBatch(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const chunk = ids.slice(i, i + DELETE_BATCH);
    const { error } = await supabase.from("jobs").delete().in("id", chunk);
    if (!error) deleted += chunk.length;
  }
  return deleted;
}

function verifyCronAuth(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false;
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = request.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET;
}

async function runReview() {
  const supabase = createAdminClient();

  // 북마크된 공고 ID 수집 — 이 공고들은 어떤 이유로도 삭제하지 않음
  const { data: bookmarkData } = await supabase
    .from("bookmarks")
    .select("job_id");
  const bookmarkedIds = new Set((bookmarkData || []).map((b) => b.job_id));

  const allJobs = await fetchAllJobs(supabase);
  const total = allJobs.length;
  const today = new Date().toISOString().split("T")[0];

  // 1. 필터 위반 공고 — 북마크 제외
  const violationIds: string[] = [];
  for (const job of allJobs) {
    if (bookmarkedIds.has(job.id)) continue; // 북마크 보호

    const titleLower = (job.title ?? "").toLowerCase();
    const company = job.company ?? "";

    const isRelevant = RELEVANT_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (!isRelevant) { violationIds.push(job.id); continue; }

    const hasExcludedLang = EXCLUDED_LANGUAGE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (hasExcludedLang) { violationIds.push(job.id); continue; }

    const hasExcludedRole = EXCLUDED_ROLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (hasExcludedRole) { violationIds.push(job.id); continue; }

    const isBadCompany = [...MEDICAL_COMPANY_KEYWORDS, ...ACADEMY_COMPANY_KEYWORDS].some((kw) => company.includes(kw));
    const isMedicalTitle = MEDICAL_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (isBadCompany || isMedicalTitle) { violationIds.push(job.id); continue; }
  }

  // 2. 중복 공고 — 북마크 제외, 최신 1건 유지
  const violationSet = new Set(violationIds);
  const remaining = allJobs
    .filter((j) => !violationSet.has(j.id) && !bookmarkedIds.has(j.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const seenKeys = new Set<string>();
  const duplicateIds: string[] = [];
  for (const job of remaining) {
    const key = `${job.title?.trim()}|${job.company?.trim()}`;
    if (seenKeys.has(key)) {
      duplicateIds.push(job.id);
    } else {
      seenKeys.add(key);
    }
  }

  // 3. 만료 공고 — 북마크 없고 end_date가 오늘 이전인 것만 삭제
  const expiredIds = allJobs
    .filter((j) =>
      j.end_date !== null &&
      j.end_date < today &&
      !bookmarkedIds.has(j.id) &&
      !violationSet.has(j.id) // 이미 violation으로 처리되는 건 중복 집계 방지
    )
    .map((j) => j.id);

  const deletedViolations = await deleteBatch(supabase, violationIds);
  const deletedDuplicates = await deleteBatch(supabase, duplicateIds);
  const deletedExpired = await deleteBatch(supabase, expiredIds);

  return {
    status: "reviewed",
    total,
    deletedViolations,
    deletedDuplicates,
    deletedExpired,
    bookmarkProtected: bookmarkedIds.size,
    remaining: total - deletedViolations - deletedDuplicates - deletedExpired,
  };
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  const result = await runReview();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  const result = await runReview();
  return NextResponse.json(result);
}
