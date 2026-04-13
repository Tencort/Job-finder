/**
 * Role: 원티드 JSON API 크롤러
 * Key Features: 비공개 API 직접 호출, 키워드별 공고 수집
 * Dependencies: base.ts
 */
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, delay, type CrawlerResult } from "./base";

const BASE_URL = "https://www.wanted.co.kr/api/v4/jobs";

interface WantedJob {
  id: number;
  position: string;
  company: { name: string };
  due_time: string | null;
  open_date: string | null;
}

interface WantedResponse {
  data: WantedJob[];
  links?: { next?: string };
}

// ISO 날짜 문자열에서 YYYY-MM-DD 추출
function toDateOnly(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export async function crawlWanted(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `${BASE_URL}?country=kr&job_sort=job.latest_order&query=${encodeURIComponent(keyword)}&limit=20&offset=0`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://www.wanted.co.kr/",
          "wanted-user-country": "KR",
          "wanted-user-language": "ko",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: WantedResponse = await res.json();

      for (const job of json.data || []) {
        allJobs.push({
          platform: "wanted",
          title: job.position,
          company: job.company.name,
          start_date: toDateOnly(job.open_date),
          end_date: toDateOnly(job.due_time),
          url: `https://www.wanted.co.kr/wd/${job.id}`,
          external_id: `wanted_${job.id}`,
        });
      }

      await delay(200); // 서버사이드 1일 1회 요청 — 짧은 딜레이로 충분
    } catch {
      // 키워드별 실패는 무시
    }
  }

  // 중복 제거
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "wanted", jobs: unique };
}
