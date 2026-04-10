/**
 * Role: 북마크한 공고 모아보기
 * Dependencies: JobCard 컴포넌트
 */
"use client";

import { useState, useEffect } from "react";
import JobCard from "@/components/JobCard";
import type { Job } from "@/lib/types";

// Supabase select("*, jobs(*)") 응답 구조: { id, user_id, job_id, created_at, jobs: Job }
interface BookmarkWithJob {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
  jobs: Job;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((res) => res.json())
      .then((data) => {
        setBookmarks(data.bookmarks || []);
        setLoading(false);
      });
  }, []);

  async function handleBookmark(jobId: string) {
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.jobs.id !== jobId));
  }

  const jobs = bookmarks.map((b) => ({ ...b.jobs, is_bookmarked: true }));

  return (
    <div className="px-6 py-6">
      <h2 className="text-lg font-bold mb-4">북마크</h2>
      {loading ? (
        <p className="text-sm text-gray-400">로딩 중...</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-400">저장한 공고가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} isNew={false} onBookmark={handleBookmark} onBlock={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
