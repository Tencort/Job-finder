/**
 * Role: 앱 전역 상수 정의
 * Key Features: 플랫폼 색상, 검색 키워드, 플랫폼 라벨
 * Dependencies: types.ts
 */
import { Platform } from './types';

export const PLATFORMS: { key: Platform; label: string; color: string; bgColor: string; textColor: string }[] = [
  { key: 'saramin', label: '사람인', color: '#e94560', bgColor: '#fff0f3', textColor: '#e94560' },
  { key: 'jobkorea', label: '잡코리아', color: '#f59e0b', bgColor: '#fef3c7', textColor: '#b45309' },
  { key: 'worknet', label: '워크넷', color: '#10b981', bgColor: '#d1fae5', textColor: '#065f46' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0a66c2', bgColor: '#e8f4fd', textColor: '#0a66c2' },
  { key: 'indeed', label: 'Indeed', color: '#2557a7', bgColor: '#e0ecf9', textColor: '#2557a7' },
  { key: 'gsit', label: 'GSIT', color: '#8b5cf6', bgColor: '#ede9fe', textColor: '#5b21b6' },
];

export const SEARCH_KEYWORDS = ['통역', '번역', '통번역', 'translator', 'translation', 'interpreter', 'interpretation'];

export const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'deadline', label: '마감임박순' },
  { key: 'company', label: '회사명순' },
  { key: 'title', label: '제목순' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];
