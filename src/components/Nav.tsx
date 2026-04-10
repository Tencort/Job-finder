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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshDone(false);

    // 새로고침 시작 시각 저장 — 완료 후 신규 공고 식별에 사용
    const beforeRefresh = new Date().toISOString();

    try {
      await fetch("/api/refresh", { method: "POST" });
      localStorage.setItem("lastRefreshedAt", beforeRefresh);
      // JobList에 재로드 + 새 공고 식별 신호 전달
      window.dispatchEvent(new CustomEvent("jobsRefreshed"));
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 2000);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-5">
      <Link href="/" className="text-lg font-bold text-gray-900 mr-2">
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
