/**
 * Role: LinkedIn 공개 Guest API 크롤러 (로그인 불필요)
 * Key Features: /jobs-guest/ 엔드포인트 활용, 키워드별 공고 수집
 * Dependencies: base.ts, cheerio
 * Notes: 공개 API — 셀렉터 변경 시 scripts/debug-linkedin.ts로 재확인
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

const GUEST_API = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export async function crawlLinkedin(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];
  const seen = new Set<string>();

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `${GUEST_API}?keywords=${encodeURIComponent(keyword)}&location=South%20Korea&start=0`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      $("li").each((_, el) => {
        const $el = $(el);

        const title = $el.find("h3").text().trim();
        if (!title) return;

        // job ID는 data-entity-urn에서 추출 (href URL 인코딩 문제 회피)
        const urn = $el.find("[data-entity-urn]").attr("data-entity-urn") || "";
        const idMatch = urn.match(/:(\d+)$/);
        if (!idMatch) return;

        const jobId = idMatch[1];
        if (seen.has(jobId)) return;
        seen.add(jobId);

        const company = $el.find("h4").text().trim();
        const href = $el.find("a.base-card__full-link").attr("href") || "";
        // datetime 속성이 있으면 ISO 날짜, 없으면 null
        const dateAttr = $el.find("time").attr("datetime") ?? null;

        allJobs.push({
          platform: "linkedin",
          title,
          company,
          start_date: dateAttr,
          end_date: null,
          url: href.split("?")[0], // 트래킹 파라미터 제거
          external_id: `linkedin_${jobId}`,
        });
      });

      await delay(1500);
    } catch {
      // 키워드별 실패 시 스킵
    }
  }

  return { platform: "linkedin", jobs: allJobs };
}
