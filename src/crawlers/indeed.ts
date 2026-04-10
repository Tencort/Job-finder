/**
 * Role: Indeed 크롤러 — 현재 비활성 스텁
 * Dependencies: base.ts
 * Notes: Indeed는 Cloudflare 보호 + 동적 클래스명으로 정적 HTML 크롤링 불가.
 *        실제 구현 시 내장 JSON 데이터 파싱 또는 헤드리스 브라우저(Playwright) 필요.
 */
import type { CrawlerResult } from "./base";

export async function crawlIndeed(): Promise<CrawlerResult> {
  // Cloudflare 봇 차단 + JS 렌더링으로 단순 fetch 불가
  // 향후 Indeed Publisher API 또는 내장 JSON 파싱으로 구현 가능
  return { platform: "indeed", jobs: [] };
}
