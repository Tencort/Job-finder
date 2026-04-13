/**
 * Role: 검색창 + 정렬 탭 + 플랫폼 필터 + 즐겨찾기 기업 관리
 * Dependencies: constants.ts
 */
"use client";

import { useState } from "react";
import { PLATFORMS, SORT_OPTIONS, type SortKey } from "@/lib/constants";

interface FilterBarProps {
  sort: SortKey;
  platform: string;
  search: string;
  favoriteKeywords: string[];
  onSortChange: (sort: SortKey) => void;
  onPlatformChange: (platform: string) => void;
  onSearchChange: (search: string) => void;
  onFavoriteKeywordsChange: (keywords: string[]) => void;
}

export default function FilterBar({
  sort,
  platform,
  search,
  favoriteKeywords,
  onSortChange,
  onPlatformChange,
  onSearchChange,
  onFavoriteKeywordsChange,
}: FilterBarProps) {
  const [newKeyword, setNewKeyword] = useState("");

  function addKeyword() {
    const kw = newKeyword.trim();
    if (kw && !favoriteKeywords.includes(kw)) {
      onFavoriteKeywordsChange([...favoriteKeywords, kw]);
    }
    setNewKeyword("");
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 space-y-3">
      {/* 검색창 */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="회사명 또는 공고 제목 검색..."
        className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400"
      />

      {/* 정렬 탭 */}
      <div className="flex gap-2 flex-wrap">
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
        {/* 추천 탭 */}
        <button
          onClick={() => onPlatformChange(platform === "favorites" ? "all" : "favorites")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            platform === "favorites"
              ? "bg-amber-50 text-amber-600 font-semibold border border-amber-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          ⭐ 추천
        </button>
      </div>

      {/* 즐겨찾기 기업 키워드 관리 — 추천 탭 선택 시 표시 */}
      {platform === "favorites" && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          <p className="text-xs text-amber-700 font-semibold mb-2">즐겨찾기 기업 키워드</p>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {favoriteKeywords.length === 0 && (
              <span className="text-xs text-amber-500">키워드를 추가하면 해당 기업 공고만 표시됩니다</span>
            )}
            {favoriteKeywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1 bg-white border border-amber-200 text-amber-700 text-xs px-2.5 py-1 rounded-full"
              >
                {kw}
                <button
                  onClick={() => onFavoriteKeywordsChange(favoriteKeywords.filter((k) => k !== kw))}
                  className="text-amber-400 hover:text-red-400 ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="기업명 입력 후 Enter"
              className="flex-1 px-3 py-1.5 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
            />
            <button
              onClick={addKeyword}
              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition font-medium"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
