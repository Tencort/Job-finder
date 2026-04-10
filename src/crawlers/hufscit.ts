/**
 * Role: 한국외국어대학교 통번역센터(HUFS CIT) 채용공고 게시판 크롤러
 * Key Features: 3월 이후 게시글만 수집, 마감일 제목에서 파싱
 * Dependencies: base.ts, cheerio
 * Notes:
 *   - 게시판 URL: http://hufscit.com/hufscit/10398/subview.do
 *   - 게시글 개별 링크 없음 → 게시판 URL 공유 / 제목에서 회사명·마감일 추출
 *   - 모든 공고가 통번역사 대상이므로 키워드 필터 불필요
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import type { CrawlerResult } from "./base";

const ARTCL_LIST_URL = "http://hufscit.com/bbs/hufscit/1995/artclList.do";
const BOARD_URL = "http://hufscit.com/hufscit/10398/subview.do";
// 3월 이후 공고만 수집 — 명시된 마감일이 이 날짜보다 이전이면 제외
const MIN_END_DATE = "2026-03-01";

/**
 * 제목에서 마감일 추출 — "(~4/20)", "(~4/17 23:59)", "(~3/31)" 패턴 지원
 */
function parseDeadline(title: string): string | null {
  const match = title.match(/~(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `2026-${month}-${day}`;
}

// 회사명 끝에 붙는 언어 설명 키워드 — 제거 대상
const LANG_SUFFIXES = /\s+(영어|한국어|중국어|일본어|프랑스어|독어|스페인어|아랍어|러시아어|포르투갈어|다국어|베트남어|태국어)$/;

/**
 * 제목에서 회사명 추출 — "[언어] 회사명 통번역사 채용공고" 패턴
 */
function extractCompany(title: string): string {
  // "[영어] " 같은 언어 태그 제거
  const withoutLang = title.replace(/^\[.+?\]\s*/, "");
  // "통번역사", "번역사", "통역사", "강사", "채용공고" 앞까지 회사명으로 판단
  const match = withoutLang.match(/^(.+?)\s+(?:통번역사|번역사|통역사|이중언어강사|채용공고)/);
  if (match) {
    // "네이버 사우디 법인 영어" → 끝 언어 키워드 제거 → "네이버 사우디 법인"
    return match[1].replace(LANG_SUFFIXES, "").trim();
  }
  return withoutLang.slice(0, 30).trim();
}

async function fetchPage(page: number): Promise<string> {
  const res = await fetch(ARTCL_LIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    body: new URLSearchParams({ curPage: String(page) }).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

export async function crawlHufscit(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  // 1·2페이지 수집 — 3월 이후 공고를 모두 포함하기 위해 두 페이지 조회
  for (const page of [1, 2]) {
    try {
      const html = await fetchPage(page);
      const $ = cheerio.load(html);

      $("tr").each((_, row) => {
        const $row = $(row);
        const numText = $row.find(".td-num").text().trim();
        const postNum = parseInt(numText, 10);
        if (isNaN(postNum)) return;

        const title = $row.find(".td-subject strong").text().trim();
        if (!title) return;

        const endDate = parseDeadline(title);

        // 마감일이 명시되어 있고 3월 이전이면 제외
        if (endDate && endDate < MIN_END_DATE) return;

        allJobs.push({
          platform: "hufscit",
          title,
          company: extractCompany(title),
          start_date: null,
          end_date: endDate,
          url: BOARD_URL,
          external_id: `hufscit_${postNum}`,
        });
      });
    } catch {
      // 해당 페이지 접근 실패 시 다음 페이지로 계속
    }
  }

  return { platform: "hufscit", jobs: allJobs };
}
