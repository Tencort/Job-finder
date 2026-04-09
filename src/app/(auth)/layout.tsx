/**
 * Role: 인증 필요 페이지 공통 레이아웃 — Nav 포함
 * Dependencies: Nav 컴포넌트
 */
import Nav from "@/components/Nav";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
