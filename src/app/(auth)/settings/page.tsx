/**
 * Role: 설정 페이지 — 블랙리스트 관리 + 이메일 알림 ON/OFF
 * Dependencies: blocked-companies API, settings API
 */
"use client";

import { useState, useEffect } from "react";
import type { BlockedCompany } from "@/lib/types";

export default function SettingsPage() {
  const [blocked, setBlocked] = useState<BlockedCompany[]>([]);
  const [emailAlert, setEmailAlert] = useState(true);
  const [newCompany, setNewCompany] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/blocked-companies").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([blockedData, settingsData]) => {
      setBlocked(blockedData.blocked || []);
      setEmailAlert(settingsData.settings?.email_alert ?? true);
      setLoading(false);
    });
  }, []);

  async function handleAddBlock() {
    const name = newCompany.trim();
    if (!name) return;
    await fetch("/api/blocked-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: name }),
    });
    setBlocked((prev) => [{ id: "", user_id: "", company_name: name, created_at: new Date().toISOString() }, ...prev]);
    setNewCompany("");
  }

  async function handleUnblock(companyName: string) {
    await fetch("/api/blocked-companies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName }),
    });
    setBlocked((prev) => prev.filter((b) => b.company_name !== companyName));
  }

  async function handleToggleAlert() {
    const newValue = !emailAlert;
    setEmailAlert(newValue);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_alert: newValue }),
    });
  }

  if (loading) return <p className="p-6 text-sm text-gray-400">로딩 중...</p>;

  return (
    <div className="px-6 py-6 max-w-2xl">
      <h2 className="text-lg font-bold mb-6">설정</h2>

      {/* 이메일 알림 */}
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">이메일 알림</h3>
            <p className="text-xs text-gray-400 mt-1">새로운 공고가 수집되면 이메일로 알려드립니다</p>
          </div>
          <button
            onClick={handleToggleAlert}
            className={`w-11 h-6 rounded-full transition relative ${emailAlert ? "bg-blue-500" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition ${emailAlert ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 블랙리스트 */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">차단된 기업</h3>

        {/* 추가 입력 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
            placeholder="기업명 입력"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddBlock}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            추가
          </button>
        </div>

        {/* 목록 */}
        {blocked.length === 0 ? (
          <p className="text-xs text-gray-400">차단된 기업이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {blocked.map((b) => (
              <li key={b.company_name} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">{b.company_name}</span>
                <button
                  onClick={() => handleUnblock(b.company_name)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
