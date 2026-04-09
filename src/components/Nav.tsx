/**
 * Role: 상단 네비게이션 바 — 로고 + 북마크/설정/로그아웃 링크
 * Dependencies: supabase/client
 */
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    // 이벤트 핸들러 내부에서 초기화 — SSR 시 Supabase URL 검증 오류 방지
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3.5 flex justify-between items-center">
      <Link href="/" className="text-lg font-bold text-gray-900">
        통역공고 서치
      </Link>
      <div className="flex gap-5 items-center text-sm text-gray-500 font-medium">
        <Link
          href="/bookmarks"
          className={`hover:text-gray-900 transition ${pathname === "/bookmarks" ? "text-gray-900" : ""}`}
        >
          북마크
        </Link>
        <Link
          href="/settings"
          className={`hover:text-gray-900 transition ${pathname === "/settings" ? "text-gray-900" : ""}`}
        >
          설정
        </Link>
        <button onClick={handleLogout} className="hover:text-gray-900 transition">
          로그아웃
        </button>
      </div>
    </nav>
  );
}
