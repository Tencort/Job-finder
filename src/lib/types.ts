/**
 * Role: DB 테이블 타입 정의
 * Key Features: jobs, bookmarks, blocked_companies, user_settings, crawl_logs 타입
 * Dependencies: 없음
 */

export type Platform = 'saramin' | 'jobkorea' | 'worknet' | 'linkedin' | 'indeed' | 'gsit';

export interface Job {
  id: string;
  platform: Platform;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  url: string;
  external_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface BlockedCompany {
  id: string;
  user_id: string;
  company_name: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_alert: boolean;
  updated_at: string;
}

export interface CrawlLog {
  id: string;
  platform: Platform;
  status: 'success' | 'error';
  error_message: string | null;
  jobs_found: number;
  created_at: string;
}

// 크롤러가 반환하는 공고 데이터 (DB 저장 전)
export interface CrawledJob {
  platform: Platform;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  url: string;
  external_id: string;
}
