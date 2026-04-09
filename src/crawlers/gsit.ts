/**
 * Role: 한국통번역대학원(GSIT) 게시판 HTML 파싱 크롤러
 * Dependencies: base.ts, cheerio
 * Notes: 게시판 URL 리서치 필요
 */
import * as cheerio from "cheerio";
import type { CrawledJob } from "@/lib/types";
import { fetchWithUA, type CrawlerResult } from "./base";

export async function crawlGsit(): Promise<CrawlerResult> {
  const allJobs: CrawledJob[] = [];

  try {
    // TODO: GSIT 게시판 URL 확인 후 구현
    // const html = await fetchWithUA("https://...");
    // const $ = cheerio.load(html);
  } catch {
    // 실패 시 스킵
  }

  return { platform: "gsit", jobs: allJobs };
}
