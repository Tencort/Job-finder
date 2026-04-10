/**
 * Role: 정렬 탭 + 플랫폼 필터 바 + 새 공고 알림 탭
 * Dependencies: constants.ts
 */
"use client";

import { PLATFORMS, SORT_OPTIONS, type SortKey } from "@/lib/constants";

interface FilterBarProps {
  sort: SortKey;
  platform: string;
  onSortChange: (sort: SortKey) => void;
  onPlatformChange: (platform: string) => void;
  newJobCount?: number;
  showNewOnly?: boolean;
  onNewJobsToggle?: () => void;
}

export default function FilterBar({
  sort,
  platform,
  onSortChange,
  onPlatformChange,
  newJobCount = 0,
  showNewOnly = false,
  onNewJobsToggle,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* 정렬 탭 */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {/* 새 공고 알림 탭 — 새로고침 후 신규 공고 있을 때만 표시 */}
        {newJobCount > 0 && (
          <button
            onClick={onNewJobsToggle}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              showNewOnly
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            🆕 새 공고 {newJobCount}건
          </button>
        )}
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => { onSortChange(opt.key); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              sort === opt.key && !showNewOnly
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 플랫폼 필터 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 mr-1">플랫폼</span>
        <button
          onClick={() => onPlatformChange("all")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            platform === "all"
              ? "bg-blue-50 text-blue-600 font-semibold"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          전체
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPlatformChange(p.key)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              platform === p.key
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
