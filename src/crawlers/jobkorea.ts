/**
 * Role: 잡코리아 HTML 파싱 크롤러
 * Key Features: 임베디드 JSON에서 날짜 추출 (applicationPeriod), cheerio로 공고 목록 파싱
 * Dependencies: base.ts, cheerio
 * Notes:
 *   - span.text-typo-c1-13은 경력요건 텍스트 — 날짜 아님
 *   - 실제 날짜는 페이지 HTML 내 임베디드 JSON의 applicationPeriod 필드에 있음
 *   - 2070년 마감일 = 상시채용 → null 처리
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, fetchWithUA, delay, type CrawlerResult } from "./base";

/**
 * ISO 날짜 문자열 → "YYYY-MM-DD" 변환
 * 2070년은 상시채용으로 null 반환
 */
function isoToDate(iso: string): string | null {
  if (!iso) return null;
  const date = iso.substring(0, 10);
  if (date.startsWith("2070")) return null; // 상시채용
  return date;
}

/**
 * HTML 내 임베디드 JSON에서 공고 id → 날짜 매핑 추출
 * 잡코리아는 공고 목록 페이지에 applicationPeriod를 JSON blob으로 내장
 * 일반 JSON과 이스케이프된 JSON 두 형식 모두 처리
 */
function buildDateMap(html: string): Map<string, { start: string | null; end: string | null }> {
  const dateMap = new Map<string, { start: string | null; end: string | null }>();

  // 일반 JSON: "applicationPeriod":{"start":"...","end":"..."}
  const rawPattern = /"applicationPeriod":\{"start":"([^"]+)","end":"([^"]+)"\}/g;
  // 이스케이프 JSON: \"applicationPeriod\":{\"start\":\"...\",\"end\":\"...\"}
  const escapedPattern = /\\"applicationPeriod\\":\{\\"start\\":\\"([^\\]+)\\",\\"end\\":\\"([^\\]+)\\"\}/g;

  for (const pattern of [rawPattern, escapedPattern]) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const startIso = match[1];
      const endIso = match[2];
      const matchIndex = match.index;

      // applicationPeriod 직전 3000자에서 가장 가까운 공고 id 탐색
      const lookback = html.substring(Math.max(0, matchIndex - 3000), matchIndex);
      const rawIds = [...lookback.matchAll(/"id":"(\d{7,9})"/g)];
      const escapedIds = [...lookback.matchAll(/\\"id\\":\\"(\d{7,9})\\"/g)];
      const allIds = [...rawIds, ...escapedIds].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      if (allIds.length === 0) continue;
      // 가장 가까운(마지막) id 사용
      const id = allIds[allIds.length - 1][1];

      if (!dateMap.has(id)) {
        dateMap.set(id, {
          start: isoToDate(startIso),
          end: isoToDate(endIso),
        });
      }
    }
  }

  return dateMap;
}

// 한국 사이트 — 영어 키워드 검색 결과 미미하므로 한국어 3개만 사용
const KO_KEYWORDS = ["통역", "번역", "통번역"];

export async function crawlJobkorea(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  // 키워드별로 순차 요청 (3개 × ~2s = ~6s, 10s 제한 이내)
  for (const keyword of KO_KEYWORDS) {
    try {
      const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}&tabType=recruit`;
      const html = await fetchWithUA(url);

      // 임베디드 JSON에서 날짜 맵 구성
      const dateMap = buildDateMap(html);

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

        // 임베디드 JSON 날짜 맵에서 날짜 조회
        const dates = dateMap.get(jobId);

        allJobs.push({
          platform: "jobkorea",
          title,
          company,
          start_date: dates?.start ?? null,
          end_date: dates?.end ?? null,
          url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${jobId}`,
          external_id: `jobkorea_${jobId}`,
        });
      });

      await delay(300);
    } catch {
      // 키워드별 실패는 무시
    }
  }

  // 중복 제거
  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "jobkorea", jobs: unique };
}
