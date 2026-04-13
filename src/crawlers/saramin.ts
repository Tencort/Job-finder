/**
 * Role: 사람인 HTML 크롤러 — API 키 불필요
 * Key Features: 키워드 검색 → 공고 파싱, 마감일/등록일 추출
 * Dependencies: base.ts, cheerio
 * Notes:
 *   - 이전 API 방식(SARAMIN_API_KEY)에서 HTML 방식으로 교체
 *   - 검색 URL: /zf_user/search/recruit?searchword={keyword}
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { fetchWithUA, delay, type CrawlerResult } from "./base";

// 사람인 검색에 사용할 키워드 — 한국어만 (영어 검색 결과 미미)
const KEYWORDS = ["통역", "번역", "통번역"];

/**
 * "~ 05/10(일)" 형식 마감일 → "2026-05-10"
 * "상시채용" 또는 "채용시" → null
 */
function parseEndDate(text: string): string | null {
  const match = text.match(/~\s*(\d{2})\/(\d{2})/);
  if (!match) return null;
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  const now = new Date();
  // 이미 지난 달이면 내년으로 처리
  let year = now.getFullYear();
  if (month < now.getMonth() + 1) year++;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * "등록일 26/04/10" 형식 등록일 → "2026-04-10"
 */
function parseRegDate(text: string): string | null {
  const match = text.match(/등록일\s*(\d{2})\/(\d{2})\/(\d{2})/);
  if (!match) return null;
  return `20${match[1]}-${match[2]}-${match[3]}`;
}

export async function crawlSaramin(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of KEYWORDS) {
    try {
      const url = `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(keyword)}&recruitPage=1&recruitSort=reg_dt&recruitPageCount=40`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      $("div.item_recruit").each((_, el) => {
        const $el = $(el);
        const recIdx = $el.attr("value");
        if (!recIdx) return;

        // 제목 — title 속성이 가장 깔끔
        const title = $el.find("h2.job_tit a").attr("title")?.trim() || "";
        if (!title) return;

        // 회사명
        const company = $el.find("strong.corp_name a").text().trim();

        // 마감일
        const dateText = $el.find("span.date").text().trim();
        const endDate = parseEndDate(dateText);

        // 등록일
        const regText = $el.find("span.job_day").text().trim();
        const startDate = parseRegDate(regText);

        allJobs.push({
          platform: "saramin",
          title,
          company,
          start_date: startDate,
          end_date: endDate,
          url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${recIdx}`,
          external_id: `saramin_${recIdx}`,
        });
      });

      await delay(300); // 서버사이드 1일 1회 요청 — 짧은 딜레이로 충분
    } catch {
      // 키워드별 실패는 무시하고 계속
    }
  }

  // 중복 제거 (external_id 기준)
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "saramin", jobs: unique };
}
