/**
 * Role: 서비스 롤 키를 사용하는 Supabase 클라이언트 — 크롤러, 이메일 알림 등 서버 전용
 * Dependencies: @supabase/supabase-js
 * Notes: RLS 우회 — API Route에서만 사용할 것
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
