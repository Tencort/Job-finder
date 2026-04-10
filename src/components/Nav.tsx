/**
 * Role: 상단 네비게이션 바 — 로고 + 공고 새로고침/북마크/설정/로그아웃
 * Dependencies: supabase/client
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);

  async function handleLogout() {
    // 이벤트 핸들러 내부에서 초기화 — SSR 시 Supabase URL 검증 오류 방지
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshDone(false);

    try {
      await fetch("/api/refresh", { method: "POST" });
      setRefreshDone(true);
      // 2초 후 완료 메시지 사라짐
      setTimeout(() => setRefreshDone(false), 2000);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3.5 flex justify-between items-center">
      <Link href="/" className="text-lg font-bold text-gray-900">
        통역공고 서치
      </Link>
      <div className="flex gap-5 items-center text-sm text-gray-500 font-medium">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="hover:text-gray-900 transition disabled:opacity-40"
          title="전체 플랫폼 공고 새로고침"
        >
          {refreshing ? "수집 중..." : refreshDone ? "✓ 완료" : "새로고침"}
        </button>
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
