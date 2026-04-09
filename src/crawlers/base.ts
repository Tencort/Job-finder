/**
 * Role: 크롤러 공통 인터페이스 + HTTP 요청 유틸
 * Key Features: CrawlerResult 타입, fetchWithUA 함수
 * Dependencies: types.ts
 */
import type { CrawledJob, Platform } from "@/lib/types";
import { SEARCH_KEYWORDS } from "@/lib/constants";

export interface CrawlerResult {
  platform: Platform;
  jobs: CrawledJob[];
  error?: string;
}

export { SEARCH_KEYWORDS };

// User-Agent를 설정한 fetch wrapper
export async function fetchWithUA(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

// 딜레이 유틸
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
