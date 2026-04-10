/**
 * Role: 공고 목록 + 무한 스크롤
 * Key Features: 커서 기반 페이지네이션, 스크롤 감지, 로딩 상태
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
  // 동시 요청 방지 — state의 loading은 렌더 타이밍 문제로 경쟁 조건 발생 가능
  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // 이전 방문 시각을 localStorage에서 읽고, 현재 시각으로 갱신
  useEffect(() => {
    const prev = localStorage.getItem("lastVisitAt");
    setNewThreshold(prev);
    localStorage.setItem("lastVisitAt", new Date().toISOString());
  }, []);

  // 필터/정렬 변경 시 초기 로드 — sort·platform을 직접 캡처해 스테일 클로저 방지
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
  }, [sort, platform]);

  // 다음 페이지 로드 — IntersectionObserver에서 호출
  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ sort, platform });
    params.set("cursor", cursor);

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

  return (
    <>
      <FilterBar sort={sort} platform={platform} onSortChange={setSort} onPlatformChange={setPlatform} />
      <div className="px-6 pt-3.5 pb-1">
        <p className="text-[13px] text-gray-400 font-medium">
          {loading && jobs.length === 0 ? "로딩 중..." : `총 ${jobs.length}건의 공고`}
        </p>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isNew={newThreshold ? job.created_at > newThreshold : false}
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
