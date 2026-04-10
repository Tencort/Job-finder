/**
 * Role: 공고 목록 조회 API — 커서 페이지네이션, 플랫폼 필터, 정렬, 블랙리스트 제외
 * Key Features: GET /api/jobs?sort=latest&platform=all&cursor=xxx&limit=30
 * Dependencies: supabase/server
 * Notes:
 *   - 필터 위반/중복 공고는 GEE-Reviewer(/api/review)가 DB에서 사전 정제
 *   - 여기서는 통번역 관련성 표시 필터(RELEVANT_TITLE_KEYWORDS)만 적용
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SortKey } from "@/lib/constants";
import { RELEVANT_TITLE_KEYWORDS } from "@/lib/constants";
import { MOCK_JOBS } from "@/lib/mock-jobs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  // MOCK_MODE=true 시 목업 데이터로 UI 미리보기 지원 (인증 후 개발 환경에서만)
  if (process.env.MOCK_MODE === "true" && process.env.NODE_ENV !== "production") {
    return NextResponse.json({ jobs: MOCK_JOBS, nextCursor: null });
  }

  const params = request.nextUrl.searchParams;
  const sort = (params.get("sort") || "latest") as SortKey;
  const platform = params.get("platform") || "all";
  const cursor = params.get("cursor");
  const limit = 30;

  // offset 기반 페이지네이션 — 모든 정렬에서 동작
  if (cursor && !/^\d+$/.test(cursor)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const offset = cursor ? parseInt(cursor, 10) : 0;

  // 블랙리스트 조회
  const { data: blocked } = await supabase
    .from("blocked_companies")
    .select("company_name");
  const blockedNames = (blocked || []).map((b) => b.company_name);

  // 쿼리 빌드
  let query = supabase
    .from("jobs")
    .select("*")
    .range(offset, offset + limit); // +1건 포함해서 다음 페이지 존재 여부 확인

  // 만료 공고 제외 (end_date가 오늘 이전이면 숨김, null은 표시)
  const today = new Date().toISOString().split("T")[0];
  query = query.or(`end_date.gte.${today},end_date.is.null`);

  // 통번역 관련 공고만 조회 — DB 쿼리 단에서 적용해야 페이지네이션이 정확함
  const keywordFilter = RELEVANT_TITLE_KEYWORDS
    .map((kw) => `title.ilike.%${kw}%`)
    .join(",");
  query = query.or(keywordFilter);

  // 플랫폼 필터
  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  // 블랙리스트 제외 — SDK 타입 안전 필터 사용
  if (blockedNames.length > 0) {
    query = query.not("company", "in", blockedNames);
  }

  // 정렬
  switch (sort) {
    case "deadline":
      query = query.order("end_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      break;
    case "company":
      query = query.order("company", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "title":
      query = query.order("title", { ascending: true }).order("created_at", { ascending: false });
      break;
    default: // latest
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: "데이터 조회 중 오류가 발생했습니다." }, { status: 500 });

  const hasMore = (jobs || []).length > limit;
  const results = hasMore ? jobs!.slice(0, limit) : (jobs || []);
  const nextCursor = hasMore ? String(offset + limit) : null;

  const filtered = results;

  // 북마크 상태 조회
  const jobIds = filtered.map((j) => j.id);
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("job_id")
    .in("job_id", jobIds);
  const bookmarkedIds = new Set((bookmarks || []).map((b) => b.job_id));

  return NextResponse.json({
    jobs: filtered.map((j) => ({ ...j, is_bookmarked: bookmarkedIds.has(j.id) })),
    nextCursor,
  });
}
