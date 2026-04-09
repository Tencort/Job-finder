/**
 * Role: 워크넷 공개 API를 통한 공고 수집
 * Dependencies: base.ts
 * Notes: API 키 필요 (WORKNET_API_KEY 환경변수)
 */
import type { CrawledJob } from "@/lib/types";
import { SEARCH_KEYWORDS, type CrawlerResult } from "./base";

export async function crawlWorknet(): Promise<CrawlerResult> {
  const apiKey = process.env.WORKNET_API_KEY;
  if (!apiKey) return { platform: "worknet", jobs: [], error: "WORKNET_API_KEY 미설정" };

  const allJobs: CrawledJob[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://openapi.work.go.kr/opi/opi/opia/wantedApi.do?authKey=${apiKey}&callTp=L&returnType=JSON&keyword=${encodeURIComponent(keyword)}&display=50&startPage=1`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const items = data?.wantedRoot?.wanted || [];

      for (const item of items) {
        allJobs.push({
          platform: "worknet",
          title: item.wantedTitle || "",
          company: item.corpNm || "",
          start_date: item.regDt || null,
          end_date: item.closeDt === "상시채용" ? null : item.closeDt || null,
          url: `https://www.work.go.kr/empInfo/empInfoSrch/detail/empDetailAuthView.do?wantedAuthNo=${item.wantedAuthNo}`,
          external_id: `worknet_${item.wantedAuthNo}`,
        });
      }
    } catch {
      // 키워드별 실패는 무시
    }
  }

  const unique = [...new Map(allJobs.map((j) => [j.external_id, j])).values()];
  return { platform: "worknet", jobs: unique };
}
