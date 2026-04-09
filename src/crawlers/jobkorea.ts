/**
 * Role: 잡코리아 HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 셀렉터는 잡코리아 사이트 구조에 따라 업데이트 필요
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

export async function crawlJobkorea(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}&tabType=recruit`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // TODO: 잡코리아 검색 결과 셀렉터 리서치 후 구현
      // 임시로 빈 배열 반환 — 실제 셀렉터 확인 후 채울 것
      // $(".list-post .post-list-info").each((_, el) => { ... });

      await delay(1500);
    } catch {
      // 실패 시 다음 키워드로
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "jobkorea", jobs: unique };
}
