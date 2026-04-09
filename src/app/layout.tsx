/**
 * Role: 루트 레이아웃 — Pretendard 폰트 CDN + 메타데이터
 * Dependencies: globals.css
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "통역공고 서치",
  description: "통역/번역 채용공고 통합 검색 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
