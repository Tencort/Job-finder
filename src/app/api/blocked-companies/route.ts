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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { company_name } = await request.json();
  const { error } = await supabase
    .from("blocked_companies")
    .insert({ user_id: user.id, company_name });

  if (error?.code === "23505") return NextResponse.json({ message: "이미 차단된 기업입니다." });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { company_name } = await request.json();
  await supabase
    .from("blocked_companies")
    .delete()
    .eq("user_id", user.id)
    .eq("company_name", company_name);

  return NextResponse.json({ unblocked: true });
}
