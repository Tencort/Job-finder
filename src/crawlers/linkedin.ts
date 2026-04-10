/**
 * Role: LinkedIn 크롤러 — 현재 비활성 스텁
 * Dependencies: base.ts
 * Notes: LinkedIn은 Cloudflare + JS 렌더링으로 정적 HTML 크롤링 불가.
 *        실제 구현 시 LinkedIn Jobs API 또는 헤드리스 브라우저(Playwright) 필요.
 */
import type { CrawlerResult } from "./base";

export async function crawlLinkedin(): Promise<CrawlerResult> {
  // Cloudflare 봇 차단 + 서버사이드 JS 렌더링으로 단순 fetch 불가
  // 향후 LinkedIn Jobs API 연동 시 여기에 구현
  return { platform: "linkedin", jobs: [] };
}
