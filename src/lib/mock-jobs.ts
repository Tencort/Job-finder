/**
 * Role: 로컬 미리보기용 목업 공고 데이터
 * Notes: Supabase 미설정 환경에서 UI 확인 용도. 프로덕션에서는 사용되지 않음.
 */
import type { Job } from "./types";

export const MOCK_JOBS: (Job & { is_bookmarked: boolean })[] = [
  {
    id: "mock-1", platform: "jobkorea", title: "영한/한영 통번역사 채용", company: "(주)글로벌커뮤니케이션",
    start_date: "2026-04-01", end_date: "2026-05-01",
    url: "#", external_id: "mock-1", created_at: "2026-04-01T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-2", platform: "saramin", title: "일한 통역사 경력직 모집", company: "삼성전자",
    start_date: "2026-04-05", end_date: "2026-04-30",
    url: "#", external_id: "mock-2", created_at: "2026-04-05T00:00:00Z", is_bookmarked: true,
  },
  {
    id: "mock-3", platform: "linkedin", title: "Interpreter & Translator (EN/KR)", company: "Kakao Corp.",
    start_date: "2026-04-06", end_date: null,
    url: "#", external_id: "mock-3", created_at: "2026-04-06T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-4", platform: "gsit", title: "중한 통번역 전문가", company: "무역협회",
    start_date: "2026-03-28", end_date: "2026-04-25",
    url: "#", external_id: "mock-4", created_at: "2026-03-28T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-5", platform: "jobkorea", title: "의료통역사 채용 (영어/중국어)", company: "서울아산병원",
    start_date: "2026-04-03", end_date: "2026-04-20",
    url: "#", external_id: "mock-5", created_at: "2026-04-03T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-6", platform: "gsit", title: "GSIT 통번역 공개채용 공고", company: "GSIT 통번역대학원",
    start_date: "2026-03-23", end_date: null,
    url: "#", external_id: "mock-6", created_at: "2026-03-23T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-7", platform: "saramin", title: "법률 번역사 (영어 전문)", company: "김앤장 법률사무소",
    start_date: "2026-04-07", end_date: "2026-04-28",
    url: "#", external_id: "mock-7", created_at: "2026-04-07T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-8", platform: "linkedin", title: "Japanese-Korean Translator", company: "NAVER Corp.",
    start_date: "2026-04-08", end_date: null,
    url: "#", external_id: "mock-8", created_at: "2026-04-08T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-9", platform: "wanted", title: "국제회의 동시통역사 (프리랜서)", company: "코엑스",
    start_date: "2026-04-02", end_date: "2026-04-15",
    url: "#", external_id: "mock-9", created_at: "2026-04-02T00:00:00Z", is_bookmarked: false,
  },
  {
    id: "mock-10", platform: "jobkorea", title: "스페인어 통번역 담당자", company: "(주)현대자동차",
    start_date: "2026-03-30", end_date: "2026-04-30",
    url: "#", external_id: "mock-10", created_at: "2026-03-30T00:00:00Z", is_bookmarked: false,
  },
];
