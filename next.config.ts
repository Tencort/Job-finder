import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  // 보안 헤더 — 클릭재킹, MIME 스니핑, XSS 등 방어
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // iframe 삽입 차단 (클릭재킹 방지)
          { key: "X-Frame-Options", value: "DENY" },
          // MIME 타입 스니핑 차단
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 리퍼러 정보 최소화
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 카메라/마이크 등 브라우저 기능 제한
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HTTPS 강제 (1년, 서브도메인 포함)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // XSS 필터 활성화 (구형 브라우저 호환)
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
