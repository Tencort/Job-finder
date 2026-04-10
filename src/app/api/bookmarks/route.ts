/**
 * Role: 북마크 토글 API
 * Key Features: POST (추가/삭제 토글), GET (북마크 목록)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*, jobs(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "데이터 조회 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ bookmarks: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const { job_id } = body as Record<string, unknown>;

  // job_id는 양의 정수여야 함
  if (typeof job_id !== "number" || !Number.isInteger(job_id) || job_id <= 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 이미 북마크되어 있으면 삭제, 아니면 추가
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", job_id)
    .single();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    return NextResponse.json({ bookmarked: false });
  }

  await supabase.from("bookmarks").insert({ user_id: user.id, job_id });
  return NextResponse.json({ bookmarked: true });
}
