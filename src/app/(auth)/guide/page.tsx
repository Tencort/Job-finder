/**
 * Role: 서비스 이용 가이드 페이지
 */

export default function GuidePage() {
  return (
    <div className="px-6 py-6 max-w-2xl space-y-6">
      <h2 className="text-lg font-bold">이용 가이드</h2>

      <Section icon="🎯" title="이 서비스는 무엇인가요?">
        <p>
          사람인, 잡코리아, LinkedIn, Indeed, 원티드, GSIT, HUFS CIT — 7개 플랫폼의 통역·번역
          공고를 한 곳에서 확인할 수 있는 서비스입니다. 매일 오후 10시 자동으로 공고를 수집하며,
          의료·학원·비영어권 공고는 자동으로 걸러집니다.
        </p>
      </Section>

      <Section icon="🔄" title="공고 새로고침">
        <ul className="space-y-2">
          <Item>좌측 사이드바의 <Strong>새로고침</Strong> 버튼을 누르면 7개 플랫폼을 즉시 수집합니다.</Item>
          <Item>수집 완료 후 새로 추가된 공고는 상단 <Strong>🆕 새로 추가된 공고</Strong> 블록에 먼저 표시됩니다.</Item>
          <Item>오늘 날짜에 등록된 공고에는 <Strong>New</Strong> 배지가 항상 유지됩니다.</Item>
        </ul>
      </Section>

      <Section icon="🔍" title="검색 및 필터">
        <ul className="space-y-2">
          <Item><Strong>검색창</Strong>에 회사명 또는 공고 제목을 입력하면 실시간으로 필터링됩니다.</Item>
          <Item><Strong>정렬 탭</Strong>으로 최신순 / 마감임박순 / 회사명순 / 제목순 전환이 가능합니다.</Item>
          <Item><Strong>플랫폼 버튼</Strong>으로 특정 채용 플랫폼 공고만 볼 수 있습니다.</Item>
        </ul>
      </Section>

      <Section icon="⭐" title="추천 기업 설정">
        <ul className="space-y-2">
          <Item>필터 바의 <Strong>⭐ 추천</Strong> 탭을 선택하면 즐겨찾기 기업 관리 창이 열립니다.</Item>
          <Item>기업명 키워드를 입력하고 Enter 또는 추가 버튼을 누르면 저장됩니다.</Item>
          <Item>추천 탭이 활성화된 상태에서는 등록한 키워드 기업의 공고만 표시됩니다.</Item>
          <Item>키워드는 브라우저에 저장되므로 다음 방문에도 유지됩니다.</Item>
        </ul>
      </Section>

      <Section icon="🔖" title="북마크">
        <ul className="space-y-2">
          <Item>공고 카드 우상단 북마크 아이콘으로 관심 공고를 저장합니다.</Item>
          <Item>좌측 사이드바 <Strong>북마크</Strong> 탭에서 저장한 공고를 모아볼 수 있습니다.</Item>
          <Item>북마크한 공고는 마감일이 지나도, DB 정리 시에도 <Strong>절대 삭제되지 않습니다.</Strong></Item>
        </ul>
      </Section>

      <Section icon="🚫" title="기업 차단">
        <ul className="space-y-2">
          <Item>공고 카드의 <Strong>···</Strong> 메뉴 → 차단 버튼을 누르면 해당 기업 공고가 숨겨집니다.</Item>
          <Item><Strong>설정</Strong> 페이지에서 차단 목록을 확인하고 해제할 수 있습니다.</Item>
        </ul>
      </Section>

      <Section icon="📧" title="이메일 알림">
        <ul className="space-y-2">
          <Item>매일 오후 10시 자동 수집 후 신규 공고가 있으면 이메일로 알려드립니다.</Item>
          <Item><Strong>설정</Strong> 페이지에서 이메일 알림을 켜거나 끌 수 있습니다.</Item>
        </ul>
      </Section>

      <Section icon="🛡️" title="자동 필터링 기준">
        <p className="mb-2">아래 공고는 자동으로 제외됩니다.</p>
        <ul className="space-y-2">
          <Item>통역·번역과 무관한 직군 (엔지니어, 개발자, 세일즈 매니저 등)</Item>
          <Item>비영어권 언어 공고 (중국어, 일본어, 스페인어 등)</Item>
          <Item>의료 기관 및 의료 관련 통역 (병원, 의원, 클리닉 등)</Item>
          <Item>학원·어학원 공고</Item>
          <Item>마감일이 지난 공고 (북마크 제외)</Item>
        </ul>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <span className="text-gray-300 mt-0.5 shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-gray-800">{children}</span>;
}
