/**
 * Role: 잡코리아 HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

// "03/26(목) 등록" 형식의 날짜 파싱
function parseKoreanDate(text: string): string | null {
  const match = text.match(/(\d{2})\/(\d{2})/);
  if (!match) return null;
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  const now = new Date();
  // 이미 지난 달이면 내년으로 처리
  let year = now.getFullYear();
  if (month < now.getMonth() + 1) year++;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function crawlJobkorea(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}&tabType=recruit`;
      const html = await fetchWithUA(url);
      const $ = cheerio.load(html);

      // 제목이 있는 공고 링크만 선택
      $('a[href*="/Recruit/GI_Read/"]').each((_, el) => {
        const $el = $(el);

        // 제목 span이 없으면 스킵 (회사명 링크 등 중복 방지)
        const titleEl = $el.find("span.text-typo-b1-18");
        if (!titleEl.length) return;

        const title = titleEl.text().trim();
        const href = $el.attr("href") || "";
        const jobIdMatch = href.match(/GI_Read\/(\d+)/);
        if (!jobIdMatch || !title) return;

        const jobId = jobIdMatch[1];
        const $card = $el.closest("div.w-full");

        const company = $card.find("span.text-typo-b2-16").first().text().trim();

        // 날짜 텍스트 수집
        const dateTexts = $card
          .find("span.text-typo-c1-13")
          .map((_, d) => $(d).text().trim())
          .get();

        const startRaw = dateTexts.find((t) => t.includes("등록"));
        const endRaw = dateTexts.find((t) => t.includes("마감"));

        allJobs.push({
          platform: "jobkorea",
          title,
          company,
          start_date: startRaw ? parseKoreanDate(startRaw) : null,
          end_date: endRaw ? parseKoreanDate(endRaw) : null,
          url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${jobId}`,
          external_id: `jobkorea_${jobId}`,
        });
      });

      await delay(1500);
    } catch {
      // 키워드별 실패는 무시
    }
  }

  // 중복 제거
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "jobkorea", jobs: unique };
}
