/**
 * Role: 사용자 설정 (이메일 알림) API
 * Key Features: GET (현재 설정), PUT (설정 변경)
 * Dependencies: supabase/server
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  let { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // 설정이 없으면 기본값으로 생성
  if (!data) {
    const { data: newSettings } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, email_alert: true })
      .select()
      .single();
    data = newSettings;
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { email_alert } = await request.json();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, email_alert, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
