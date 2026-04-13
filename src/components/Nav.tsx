/**
 * Role: 좌측 세로 사이드바 네비게이션 — 로고 + 공고 새로고침/북마크/설정/로그아웃
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

  const menuItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition w-full text-left ${
      active
        ? "bg-gray-100 text-gray-900"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
    }`;

  return (
    <nav className="w-52 shrink-0 h-screen flex flex-col bg-white border-r border-gray-200 px-3 py-5">
      {/* 로고 */}
      <Link href="/" className="text-base font-bold text-gray-900 px-3 mb-6">
        통역공고 서치
      </Link>

      {/* 메인 메뉴 */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={menuItemClass(false) + " disabled:opacity-40"}
          title="전체 플랫폼 공고 새로고침"
        >
          <span className="text-base">🔄</span>
          {refreshing ? "수집 중..." : refreshDone ? "✓ 완료" : "새로고침"}
        </button>
        <Link href="/bookmarks" className={menuItemClass(pathname === "/bookmarks")}>
          <span className="text-base">🔖</span>
          북마크
        </Link>
        <Link href="/settings" className={menuItemClass(pathname === "/settings")}>
          <span className="text-base">⚙️</span>
          설정
        </Link>
        <Link href="/guide" className={menuItemClass(pathname === "/guide")}>
          <span className="text-base">📖</span>
          이용 가이드
        </Link>
      </div>

      {/* 로그아웃 — 하단 고정 */}
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className={menuItemClass(false)}
        >
          <span className="text-base">🚪</span>
          로그아웃
        </button>
      </div>
    </nav>
  );
}
