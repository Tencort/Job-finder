/**
 * Role: 사람인 공개 API를 통한 공고 수집
 * Dependencies: base.ts
 * Notes: API 키 필요 (SARAMIN_API_KEY 환경변수)
 */
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, type CrawlerResult } from "./base";

export async function crawlSaramin(): Promise<CrawlerResult> {
  const apiKey = process.env.SARAMIN_API_KEY;
  if (!apiKey) return { platform: "saramin", jobs: [], error: "SARAMIN_API_KEY 미설정" };

  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://oapi.saramin.co.kr/recruit?access-key=${apiKey}&keywords=${encodeURIComponent(keyword)}&count=50&output=json`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const jobs = data?.jobs?.job || [];

      for (const job of jobs) {
        allJobs.push({
          platform: "saramin",
          title: job.position?.title || "",
          company: job.company?.detail?.name || "",
          start_date: job["posting-timestamp"] ? new Date(Number(job["posting-timestamp"]) * 1000).toISOString().split("T")[0] : null,
          end_date: job["expiration-timestamp"] ? new Date(Number(job["expiration-timestamp"]) * 1000).toISOString().split("T")[0] : null,
          url: job.url || "",
          external_id: `saramin_${job.id}`,
        });
      }
    } catch {
      // 키워드별 실패는 무시하고 계속 진행
    }
  }

  // 중복 제거 (external_id 기준)
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "saramin", jobs: unique };
}
