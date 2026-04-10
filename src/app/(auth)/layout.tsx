/**
 * Role: 인증 필요 페이지 공통 레이아웃 — Nav 포함
 * Dependencies: Nav 컴포넌트
 * Notes: 인증 필요 페이지는 정적 생성 불가 — force-dynamic 필수
 */
import Nav from "@/components/Nav";

// 인증 상태에 따라 동적으로 렌더링 필요
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Nav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
