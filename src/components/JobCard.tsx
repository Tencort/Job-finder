/**
 * Role: 개별 공고 카드 — 플랫폼 배지, 제목, 회사명, D-day, 북마크, 차단 버튼
 * Dependencies: constants.ts, types.ts
 */
"use client";

import { PLATFORMS } from "@/lib/constants";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job & { is_bookmarked: boolean };
  isNew: boolean;
  onBookmark: (jobId: string) => void;
  onBlock: (companyName: string) => void;
}

function getDday(endDate: string | null): { text: string; className: string } {
  if (!endDate) return { text: "상시채용", className: "text-emerald-500" };
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "마감", className: "text-gray-400" };
  if (diff <= 14) return { text: `D-${diff}`, className: "text-[#e94560]" };
  return { text: `D-${diff}`, className: "text-amber-500" };
}

export default function JobCard({ job, isNew, onBookmark, onBlock }: JobCardProps) {
  const platform = PLATFORMS.find((p) => p.key === job.platform);
  const dday = getDday(job.end_date);

  const formatDate = (d: string | null) => d ? d.slice(5).replace("-", ".") : "";

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer group">
      {/* 플랫폼 컬러바 */}
      <div className="h-1" style={{ backgroundColor: platform?.color }} />

      <div className="p-[18px]">
        {/* 헤더: 배지 + New! + 북마크 */}
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex gap-1.5 items-center">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: platform?.bgColor, color: platform?.textColor }}
            >
              {platform?.label}
            </span>
            {isNew && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e94560] text-white leading-none">
                New!
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onBlock(job.company); }}
              className="text-xs text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
              title="이 기업 차단"
            >
              ✕
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onBookmark(job.id); }}
              className={`text-base transition ${job.is_bookmarked ? "text-[#e94560]" : "text-gray-300 hover:text-gray-400"}`}
            >
              ♥
            </button>
          </div>
        </div>

        {/* 제목 */}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-semibold text-[15px] text-gray-900 mb-1.5 leading-relaxed hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {job.title}
        </a>

        {/* 회사명 */}
        <p className="text-[13px] text-gray-500 mb-3.5">{job.company}</p>

        {/* 하단: 기간 + D-day */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">
            {formatDate(job.start_date)}{job.start_date ? " ~ " : ""}{formatDate(job.end_date) || (job.start_date ? "" : "")}
          </span>
          <span className={`text-[11px] font-semibold ${dday.className}`}>{dday.text}</span>
        </div>
      </div>
    </div>
  );
}
