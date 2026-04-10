/**
 * Role: 블랙리스트 CRUD API
 * Key Features: GET (목록), POST (추가), DELETE (해제)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("blocked_companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "데이터 조회 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ blocked: data });
}

// company_name 입력값 검증 공통 함수
function validateCompanyName(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  if (value.length > 100) return null;
  return value.trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const company_name = validateCompanyName((body as Record<string, unknown>).company_name);
  if (!company_name) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const { error } = await supabase
    .from("blocked_companies")
    .insert({ user_id: user.id, company_name });

  if (error?.code === "23505") return NextResponse.json({ message: "이미 차단된 기업입니다." });
  if (error) return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const company_name = validateCompanyName((body as Record<string, unknown>).company_name);
  if (!company_name) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await supabase
    .from("blocked_companies")
    .delete()
    .eq("user_id", user.id)
    .eq("company_name", company_name);

  return NextResponse.json({ unblocked: true });
}
