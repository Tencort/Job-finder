/**
 * Role: 정렬 탭 + 플랫폼 필터 바
 * Dependencies: constants.ts
 */
"use client";

import { PLATFORMS, SORT_OPTIONS, type SortKey } from "@/lib/constants";

interface FilterBarProps {
  sort: SortKey;
  platform: string;
  onSortChange: (sort: SortKey) => void;
  onPlatformChange: (platform: string) => void;
}

export default function FilterBar({
  sort,
  platform,
  onSortChange,
  onPlatformChange,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* 정렬 탭 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              sort === opt.key
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
