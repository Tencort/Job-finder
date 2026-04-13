/**
 * Role: 앱 전역 상수 정의
 * Key Features: 플랫폼 색상, 검색 키워드, 플랫폼 라벨
 * Dependencies: types.ts
 */
import { Platform } from './types';

export const PLATFORMS: { key: Platform; label: string; color: string; bgColor: string; textColor: string }[] = [
  { key: 'saramin', label: '사람인', color: '#e94560', bgColor: '#fff0f3', textColor: '#e94560' },
  { key: 'jobkorea', label: '잡코리아', color: '#f59e0b', bgColor: '#fef3c7', textColor: '#b45309' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0a66c2', bgColor: '#e8f4fd', textColor: '#0a66c2' },
  { key: 'indeed', label: 'Indeed', color: '#2557a7', bgColor: '#e0ecf9', textColor: '#2557a7' },
  { key: 'gsit', label: 'GSIT', color: '#8b5cf6', bgColor: '#ede9fe', textColor: '#5b21b6' },
  { key: 'wanted', label: '원티드', color: '#36f', bgColor: '#eef0ff', textColor: '#2233cc' },
  { key: 'hufscit', label: 'HUFS CIT', color: '#006633', bgColor: '#e8f5ee', textColor: '#004d26' },
];

export const SEARCH_KEYWORDS = ['통역', '번역', '통번역', 'translator', 'translation', 'interpreter', 'interpretation'];

// 제목에 아래 키워드 중 하나 이상 포함된 공고만 표시 (무관 공고 필터링)
export const RELEVANT_TITLE_KEYWORDS = [
  // 한국어 핵심 키워드
  '통역', '번역', '통번역',
  // 영어 핵심 키워드
  'translator', 'translation', 'interpreter', 'interpretation',
  // 현지화
  'localization', 'localisation', '현지화', '로컬라이',
  // 자막/캡션
  '자막', 'subtitle', 'caption',
  // 언어 전문가
  'linguistic', 'language specialist', '언어 전문',
  // 이중언어 (HUFS CIT 공고 패턴)
  '이중언어',
];

// 의료 관련 통역 공고 제외 필터
// 회사명에 아래 키워드가 포함되거나, 제목에 의료 키워드가 포함된 공고는 숨김
export const MEDICAL_COMPANY_KEYWORDS = ['병원', '의원', '클리닉', '메디컬', '치과', '한의원', '요양', '약국'];
export const MEDICAL_TITLE_KEYWORDS = [
  // 복합 표현
  '의료통역', '의료 통역', '병원통역', '병원 통역', 'medical',
  // 단독 의료 키워드 — "의료 기관", "병원 근무" 등 패턴 포함
  '의료', '병원', '간호', '임상', '의학', '헬스케어',
];

// 학원/교육 업종 제외 — 회사명 기준
export const ACADEMY_COMPANY_KEYWORDS = ['학원', '어학원', '교습소'];

// 번역/통역이 부수적인 비통역사 직군 제외 — 제목 기준
export const EXCLUDED_ROLE_KEYWORDS = ['엔지니어', 'engineer', '개발자', 'developer', '세일즈 매니저', 'sales manager'];

// 영어 이외 언어·국가 공고 제외 필터 — DB 저장 전 크롤 단계에서 적용
// 언어명뿐 아니라 국가명도 포함 — "일본 법인 통역", "중국 현지 통역" 등 패턴 차단
export const EXCLUDED_LANGUAGE_KEYWORDS = [
  // 한국어 언어명
  '중국어', '일본어', '일어', '스페인어', '프랑스어', '독어', '독일어',
  '러시아어', '아랍어', '포르투갈어', '베트남어', '태국어',
  '인도네시아어', '이탈리아어', '몽골어', '말레이어', '힌디어', '네덜란드어',
  '폴란드어', '터키어', '페르시아어', '스웨덴어', '핀란드어', '덴마크어',
  '노르웨이어', '대만어', '헝가리어', '체코어', '루마니아어', '불가리아어', '우크라이나어',
  '다국어',  // 다국어 포지션은 영어 단독 통역사 대상 아님
  // 한국어 국가명 — 해당 국가 언어 통역 공고를 강하게 암시
  '일본', '중국', '베트남', '태국', '대만',
  '인도네시아', '몽골', '아랍', '중동',
  // 영어 언어명
  'chinese', 'mandarin', 'japanese', 'spanish', 'french', 'german',
  'russian', 'arabic', 'portuguese', 'vietnamese', 'thai', 'hindi',
  'italian', 'indonesian', 'mongolian', 'malay', 'dutch', 'polish',
  'turkish', 'persian', 'swedish', 'finnish', 'danish', 'norwegian',
  'multilingual',
];

export const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'deadline', label: '마감임박순' },
  { key: 'company', label: '회사명순' },
  { key: 'title', label: '제목순' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];
