/**
 * Role: LinkedIn HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 봇 차단 리스크 있음 — 실패 시 graceful 스킵
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

export async function crawlLinkedin(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=South%20Korea`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // TODO: LinkedIn 비로그인 검색 결과 셀렉터 리서치 후 구현

      await delay(2000);
    } catch {
      // 봇 차단 등 실패 시 스킵
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "linkedin", jobs: unique };
}
