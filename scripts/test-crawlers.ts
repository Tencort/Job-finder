/**
 * Role: 크롤러 로컬 테스트 스크립트 — DB 없이 크롤링 결과만 출력
 * Usage: npx tsx scripts/test-crawlers.ts [platform]
 *        platform 생략 시 전체 실행 (saramin/worknet은 API 키 필요)
 * Example: npx tsx scripts/test-crawlers.ts jobkorea
 *          npx tsx scripts/test-crawlers.ts gsit
 */
import { crawlJobkorea } from "../src/crawlers/jobkorea";
import { crawlLinkedin } from "../src/crawlers/linkedin";
import { crawlIndeed } from "../src/crawlers/indeed";
import { crawlGsit } from "../src/crawlers/gsit";
import { crawlSaramin } from "../src/crawlers/saramin";
import { crawlWanted } from "../src/crawlers/wanted";
import { crawlHufscit } from "../src/crawlers/hufscit";


type CrawlerFn = () => Promise<{ platform: string; jobs: unknown[] }>;

const CRAWLERS: Record<string, CrawlerFn> = {
  jobkorea: crawlJobkorea,
  linkedin: crawlLinkedin,
  indeed: crawlIndeed,
  gsit: crawlGsit,
  wanted: crawlWanted,
  saramin: crawlSaramin,   // SARAMIN_API_KEY 환경변수 필요
  hufscit: crawlHufscit,
};

async function run(targets: string[]) {
  for (const name of targets) {
    const crawl = CRAWLERS[name];
    if (!crawl) {
      console.error(`[오류] 알 수 없는 플랫폼: ${name}`);
      continue;
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`▶ ${name} 크롤링 시작...`);
    const start = Date.now();

    try {
      const result = await crawl();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✓ ${result.jobs.length}개 수집 완료 (${elapsed}s)`);

      if (result.jobs.length === 0) {
        console.log("  → 결과 없음 (셀렉터 미스매치 또는 봇 차단 가능성)");
      } else {
        // 상위 3개만 미리보기
        result.jobs.slice(0, 3).forEach((job: unknown, i: number) => {
          const j = job as Record<string, unknown>;
          console.log(`  [${i + 1}] ${j.title}`);
          console.log(`      회사: ${j.company || "(없음)"}`);
          console.log(`      URL : ${j.url}`);
          console.log(`      기간: ${j.start_date || "?"} ~ ${j.end_date || "?"}`);
        });
        if (result.jobs.length > 3) {
          console.log(`  ... 외 ${result.jobs.length - 3}개`);
        }
      }
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`✗ 실패 (${elapsed}s):`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`\n${"=".repeat(50)}`);
  console.log("테스트 완료");
}

// 인수 없으면 HTML 크롤러 3개만 기본 실행 (API 키 불필요)
const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ["jobkorea", "gsit", "linkedin", "indeed", "hufscit"];

run(targets);
