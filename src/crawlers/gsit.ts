/**
 * Role: 한국외대 통번역대학원(GSIT) 공지사항 게시판 크롤러
 * Key Features: 채용/공고 관련 게시글 필터링
 * Dependencies: base.ts, cheerio
 * Notes: gsit.hufs.ac.kr 공지사항 게시판 — 정적 HTML 렌더링 확인됨
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { fetchWithUA, type CrawlerResult } from "./base";

// 채용/구인 관련 키워드 — GSIT 게시판은 전체 조회 후 필터링
const JOB_KEYWORDS = ["채용", "구인", "모집", "공고", "통역", "번역", "통번역"];

// "2026.04.10" 형식 날짜를 ISO 형식으로 변환
function parseHufsDate(text: string): string | null {
  const match = text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

const BASE_URL = "https://gsit.hufs.ac.kr";
const BOARD_URL = `${BASE_URL}/gsit/7409/subview.do`;

export async function crawlGsit(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  try {
    const html = await fetchWithUA(BOARD_URL);
    const $ = cheerio.load(html);

    // 게시글 링크 패턴: /bbs/gsit/1307/{id}/artclView.do
    $('a[href*="/bbs/gsit/1307/"][href*="artclView"]').each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      if (!title) return;

      // 채용/공고 관련 게시글만 필터링
      const isJobPost = JOB_KEYWORDS.some((kw) => title.includes(kw));
      if (!isJobPost) return;

      const href = $el.attr("href") || "";
      const idMatch = href.match(/\/(\d+)\/artclView/);
      if (!idMatch) return;

      const postId = idMatch[1];
      const $row = $el.closest("tr");

      // 행의 td 중 날짜 패턴("YYYY.MM.DD")이 있는 셀 탐색
      let dateStr: string | null = null;
      $row.find("td").each((_, td) => {
        const text = $(td).text().trim();
        const parsed = parseHufsDate(text);
        if (parsed) dateStr = parsed;
      });

      allJobs.push({
        platform: "gsit",
        title,
        company: "GSIT 통번역대학원",
        start_date: dateStr,
        end_date: null,
        url: `${BASE_URL}${href}`,
        external_id: `gsit_${postId}`,
      });
    });
  } catch {
    // 사이트 접근 실패 시 빈 결과 반환
  }

  return { platform: "gsit", jobs: allJobs };
}
