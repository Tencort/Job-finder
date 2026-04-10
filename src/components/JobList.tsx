/**
 * Role: 공고 목록 + 무한 스크롤 + 새로고침 후 신규 공고 알림
 * Key Features: offset 기반 페이지네이션, 스크롤 감지, 로딩 상태, 새 공고 필터
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
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 이전 방문 시각 — 이후 생성된 공고에 "New!" 배지 표시
  const [newThreshold, setNewThreshold] = useState<string | null>(null);
  // 새로고침 후 신규 공고 식별 기준 시각
  const [refreshThreshold, setRefreshThreshold] = useState<string | null>(null);
  // 새 공고만 보기 모드
  const [showNewOnly, setShowNewOnly] = useState(false);
  // reloadKey 증가 시 목록 처음부터 다시 로드 (새로고침 이벤트용)
  const [reloadKey, setReloadKey] = useState(0);
  // 동시 요청 방지
  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = localStorage.getItem("lastVisitAt");
    setNewThreshold(prev);
    localStorage.setItem("lastVisitAt", new Date().toISOString());
  }, []);

  // Nav 새로고침 완료 이벤트 수신 — 신규 공고 기준 시각 저장 후 목록 재로드
  useEffect(() => {
    function handleRefreshed() {
      const threshold = localStorage.getItem("lastRefreshedAt");
      setRefreshThreshold(threshold);
      setShowNewOnly(false);
      setReloadKey((prev) => prev + 1);
    }
    window.addEventListener("jobsRefreshed", handleRefreshed);
    return () => window.removeEventListener("jobsRefreshed", handleRefreshed);
  }, []);

  // 필터/정렬/재로드 변경 시 초기 로드
  useEffect(() => {
    let cancelled = false;
    loadingRef.current = true;
    setLoading(true);
    setJobs([]);
    setCursor(null);
    setHasMore(true);

    const params = new URLSearchParams({ sort, platform });
    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs ?? []);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
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
  }, [sort, platform, reloadKey]);

  // 다음 페이지 로드
  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ sort, platform, cursor });

    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs((prev) => [...prev, ...(data.jobs ?? [])]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sort, platform, cursor]);

  // 무한 스크롤 IntersectionObserver
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchMore();
        }
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

  // 새로고침 이후 추가된 공고 식별
  const newJobs = refreshThreshold
    ? jobs.filter((j) => j.created_at > refreshThreshold)
    : [];

  const displayJobs = showNewOnly ? newJobs : jobs;

  return (
    <>
      <FilterBar
        sort={sort}
        platform={platform}
        onSortChange={(s) => { setShowNewOnly(false); setSort(s); }}
        onPlatformChange={(p) => { setShowNewOnly(false); setPlatform(p); }}
        newJobCount={newJobs.length}
        showNewOnly={showNewOnly}
        onNewJobsToggle={() => setShowNewOnly((prev) => !prev)}
      />
      <div className="px-6 pt-3.5 pb-1">
        <p className="text-[13px] text-gray-400 font-medium">
          {loading && jobs.length === 0
            ? "로딩 중..."
            : showNewOnly
            ? `새로 추가된 공고 ${newJobs.length}건`
            : `${jobs.length}건 로드됨${hasMore ? " · 더 있음" : " · 전체 표시"}`}
        </p>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isNew={newThreshold ? job.created_at > newThreshold : false}
            onBookmark={handleBookmark}
            onBlock={handleBlock}
          />
        ))}
      </div>
      {/* 무한 스크롤 감지 영역 — 새 공고 보기 모드에서는 비활성화 */}
      {!showNewOnly && (
        <div ref={observerRef} className="h-10 flex items-center justify-center">
          {loading && jobs.length > 0 && <p className="text-sm text-gray-400">로딩 중...</p>}
          {!hasMore && jobs.length > 0 && <p className="text-sm text-gray-300">모든 공고를 불러왔습니다</p>}
        </div>
      )}
    </>
  );
}
