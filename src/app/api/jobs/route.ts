/**
 * Role: 공고 목록 조회 API — 커서 페이지네이션, 플랫폼 필터, 정렬, 블랙리스트 제외
 * Key Features: GET /api/jobs?sort=latest&platform=all&cursor=xxx&limit=30
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SortKey } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const sort = (params.get("sort") || "latest") as SortKey;
  const platform = params.get("platform") || "all";
  const cursor = params.get("cursor");
  const limit = 30;

  // 블랙리스트 조회
  const { data: blocked } = await supabase
    .from("blocked_companies")
    .select("company_name");
  const blockedNames = (blocked || []).map((b) => b.company_name);

  // 쿼리 빌드
  let query = supabase
    .from("jobs")
    .select("*")
    .limit(limit + 1); // 다음 페이지 존재 여부 확인용 +1

  // 만료 공고 제외 (end_date가 오늘 이전이면 숨김, null은 표시)
  const today = new Date().toISOString().split("T")[0];
  query = query.or(`end_date.gte.${today},end_date.is.null`);

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

  // 커서 페이지네이션 (latest 정렬 기준)
  if (cursor && sort === "latest") {
    const [cursorDate, cursorId] = cursor.split("_");
    query = query.or(`created_at.lt.${cursorDate},and(created_at.eq.${cursorDate},id.lt.${cursorId})`);
  }

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (jobs || []).length > limit;
  const results = hasMore ? jobs!.slice(0, limit) : (jobs || []);
  const nextCursor = hasMore && results.length > 0
    ? `${results[results.length - 1].created_at}_${results[results.length - 1].id}`
    : null;

  // 북마크 상태 조회
  const jobIds = results.map((j) => j.id);
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("job_id")
    .in("job_id", jobIds);
  const bookmarkedIds = new Set((bookmarks || []).map((b) => b.job_id));

  return NextResponse.json({
    jobs: results.map((j) => ({ ...j, is_bookmarked: bookmarkedIds.has(j.id) })),
    nextCursor,
  });
}
