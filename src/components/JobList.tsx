/**
 * Role: 공고 목록 + 무한 스크롤 + 신규 공고 하이라이트 블록 + 검색 + 즐겨찾기
 * Key Features: 오늘 생성 공고 New 배지, 검색(debounce), 즐겨찾기 기업 필터, 접을 수 있는 New 블록
 * Dependencies: JobCard, FilterBar
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import JobCard from "./JobCard";
import FilterBar from "./FilterBar";
import type { Job } from "@/lib/types";
import type { SortKey } from "@/lib/constants";

export default function JobList() {
  const [jobs, setJobs] = useState<(Job & { is_bookmarked: boolean })[]>([]);
  const [sort, setSort] = useState<SortKey>("latest");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [favoriteKeywords, setFavoriteKeywords] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 새로고침 후 신규 공고 기준 시각
  const [refreshThreshold, setRefreshThreshold] = useState<string | null>(null);
  // New 블록 열림 상태
  const [newBlockOpen, setNewBlockOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // 오늘 날짜 (YYYY-MM-DD) — New 배지 기준
  const todayStr = new Date().toISOString().split("T")[0];

  // localStorage에서 즐겨찾기 키워드 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("favoriteKeywords");
      if (saved) setFavoriteKeywords(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function handleFavoriteKeywordsChange(keywords: string[]) {
    setFavoriteKeywords(keywords);
    localStorage.setItem("favoriteKeywords", JSON.stringify(keywords));
  }

  // 검색어 debounce (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Nav 새로고침 완료 이벤트 수신
  useEffect(() => {
    function handleRefreshed() {
      const threshold = localStorage.getItem("lastRefreshedAt");
      setRefreshThreshold(threshold);
      setNewBlockOpen(true);
      setSort("latest");
      setReloadKey((prev) => prev + 1);
    }
    window.addEventListener("jobsRefreshed", handleRefreshed);
    return () => window.removeEventListener("jobsRefreshed", handleRefreshed);
  }, []);

  // 필터/정렬/검색/즐겨찾기 변경 시 초기 로드
  useEffect(() => {
    let cancelled = false;
    loadingRef.current = true;
    setLoading(true);
    setJobs([]);
    setCursor(null);
    setHasMore(true);

    const params = new URLSearchParams({ sort, platform });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (platform === "favorites" && favoriteKeywords.length > 0) {
      params.set("companies", favoriteKeywords.join(","));
    }

    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs ?? []);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      })
      .catch(() => { if (!cancelled) setJobs([]); })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          loadingRef.current = false;
        }
      });

    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [sort, platform, debouncedSearch, favoriteKeywords, reloadKey]);

  // 다음 페이지 로드
  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, platform, cursor });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (platform === "favorites" && favoriteKeywords.length > 0) {
        params.set("companies", favoriteKeywords.join(","));
      }
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs((prev) => [...prev, ...(data.jobs ?? [])]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sort, platform, debouncedSearch, favoriteKeywords, cursor]);

  // 무한 스크롤 IntersectionObserver
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) fetchMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, fetchMore]);

  async function handleBookmark(jobId: string) {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const data = await res.json();
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_bookmarked: data.bookmarked } : j))
    );
  }

  async function handleBlock(companyName: string) {
    if (!confirm(`"${companyName}" 공고를 더 이상 표시하지 않을까요?`)) return;
    await fetch("/api/blocked-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName }),
    });
    setJobs((prev) => prev.filter((j) => j.company !== companyName));
  }

  // 새로고침 후 추가된 신규 공고
  const newJobs = refreshThreshold
    ? jobs.filter((j) => j.created_at > refreshThreshold)
    : [];

  const CARD_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";

  return (
    <>
      <FilterBar
        sort={sort}
        platform={platform}
        search={search}
        favoriteKeywords={favoriteKeywords}
        onSortChange={setSort}
        onPlatformChange={setPlatform}
        onSearchChange={setSearch}
        onFavoriteKeywordsChange={handleFavoriteKeywordsChange}
      />

      {/* ── New 블록 (새로고침 후 신규 공고) ── */}
      {newJobs.length > 0 && (
        <div className="mx-6 mt-5 rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
          <button
            onClick={() => setNewBlockOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-blue-100 transition"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <span className="text-base">🆕</span>
              새로 추가된 공고
              <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {newJobs.length}
              </span>
            </span>
            <span className="text-blue-400 text-xs font-medium">
              {newBlockOpen ? "접기 ∧" : "펼치기 ∨"}
            </span>
          </button>

          {newBlockOpen && (
            <div className={`px-5 pb-5 ${CARD_GRID}`}>
              {newJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isNew={true}
                  onBookmark={handleBookmark}
                  onBlock={handleBlock}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 전체 공고 리스트 ── */}
      <div className="px-6 pt-4 pb-1 flex items-center justify-between">
        <p className="text-[13px] text-gray-400 font-medium">
          {loading && jobs.length === 0
            ? "로딩 중..."
            : `${jobs.length}건 로드됨${hasMore ? " · 더 있음" : " · 전체 표시"}`}
        </p>
      </div>

      <div className={`px-6 pb-6 ${CARD_GRID}`}>
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            // 오늘 등록된 공고는 항상 New 배지 유지
            isNew={job.created_at.startsWith(todayStr)}
            onBookmark={handleBookmark}
            onBlock={handleBlock}
          />
        ))}
      </div>

      {/* 무한 스크롤 감지 영역 */}
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {loading && jobs.length > 0 && <p className="text-sm text-gray-400">로딩 중...</p>}
        {!hasMore && jobs.length > 0 && <p className="text-sm text-gray-300">모든 공고를 불러왔습니다</p>}
      </div>
    </>
  );
}
