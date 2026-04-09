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
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const params = new URLSearchParams({ sort, platform });
    if (!reset && cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();

    setJobs((prev) => reset ? data.jobs : [...prev, ...data.jobs]);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, [sort, platform, cursor, loading]);

  // 필터/정렬 변경 시 리셋
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    setJobs([]);
    // fetchJobs는 다음 렌더에서 observer가 트리거
  }, [sort, platform]);

  // 초기 로드 + 리셋 후 로드
  useEffect(() => {
    if (jobs.length === 0 && hasMore) {
      fetchJobs(true);
    }
  }, [jobs.length, hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤 IntersectionObserver
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchJobs();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchJobs]);

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
    // 블랙리스트 추가 후 해당 기업 공고 즉시 제거
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
          <JobCard key={job.id} job={job} onBookmark={handleBookmark} onBlock={handleBlock} />
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
