/**
 * Role: GEE-Reviewer — DB 공고 품질 검수 및 정제
 * Key Features:
 *   1. 필터 위반 공고 삭제 (비영어 언어 / 비통역 직군 / 의료 / 학원)
 *   2. 중복 공고 삭제 (title + company 완전 일치 → 최신 1건 유지)
 * Dependencies: supabase/admin, constants
 * Notes:
 *   - GEE-Research(크롤러) 완료 후 호출되어 DB를 최종 정제
 *   - CRON_SECRET으로 인증 — 외부 직접 호출 차단
 *   - 삭제는 되돌릴 수 없으므로 배치 단위로 신중하게 처리
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

// Supabase IN 절 최대 처리 건수
const DELETE_BATCH = 100;

/**
 * DB에서 공고를 배치로 전체 조회
 */
async function fetchAllJobs(supabase: ReturnType<typeof createAdminClient>) {
  const jobs: { id: number; title: string; company: string; created_at: string }[] = [];
  const BATCH = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, created_at")
      .range(from, from + BATCH - 1)
      .order("id");

    if (error || !data || data.length === 0) break;
    jobs.push(...data);
    if (data.length < BATCH) break;
    from += BATCH;
  }

  return jobs;
}

/**
 * id 배열을 배치로 나눠 삭제
 */
async function deleteBatch(
  supabase: ReturnType<typeof createAdminClient>,
  ids: number[]
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const chunk = ids.slice(i, i + DELETE_BATCH);
    const { error } = await supabase.from("jobs").delete().in("id", chunk);
    if (!error) deleted += chunk.length;
  }
  return deleted;
}

// Vercel Cron 인증 검증 공통 함수
function verifyCronAuth(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false;
  // Vercel Cron은 GET + Authorization: Bearer, 수동 트리거는 POST + x-cron-secret
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = request.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET;
}

async function runReview() {
  const supabase = createAdminClient();
  const allJobs = await fetchAllJobs(supabase);
  const total = allJobs.length;

  const violationIds: number[] = [];
  for (const job of allJobs) {
    const titleLower = (job.title ?? "").toLowerCase();
    const company = job.company ?? "";

    // 통번역 관련 키워드가 제목에 없으면 제외 (크롤러 검색 결과 중 무관 공고 제거)
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

  const violationSet = new Set(violationIds);
  const remaining = allJobs
    .filter((j) => !violationSet.has(j.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const seenKeys = new Set<string>();
  const duplicateIds: number[] = [];
  for (const job of remaining) {
    const key = `${job.title?.trim()}|${job.company?.trim()}`;
    if (seenKeys.has(key)) {
      duplicateIds.push(job.id);
    } else {
      seenKeys.add(key);
    }
  }

  const deletedViolations = await deleteBatch(supabase, violationIds);
  const deletedDuplicates = await deleteBatch(supabase, duplicateIds);

  return { status: "reviewed", total, deletedViolations, deletedDuplicates, remaining: total - deletedViolations - deletedDuplicates };
}

// Vercel Cron 호출 (GET + Authorization: Bearer)
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  const result = await runReview();
  return NextResponse.json(result);
}

// 수동 트리거 (POST + x-cron-secret)
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  const result = await runReview();
  return NextResponse.json(result);
}
