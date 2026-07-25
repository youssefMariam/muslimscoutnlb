"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FIELD_GROUPS,
  TABLE_COLUMNS,
  NAME_FIELD,
  TROOP_FIELD,
  STAGE_FIELD,
  GENDER_FIELD,
  ACTIVE_FIELD,
  getMatchingRowKey,
  isFileFieldLabel,
} from "@/lib/fields";
import type { SessionData } from "@/lib/session";

type Row = Record<string, string>;

const POLL_MS = 30000;

function activeBadgeClass(value: string) {
  if (value?.includes("غير")) return "badge badge-inactive";
  if (value?.includes("مسافر")) return "badge badge-traveling";
  if (value?.includes("ناشط")) return "badge badge-active";
  return "badge";
}

function genderBadgeClass(value: string) {
  if (value?.includes("أنث") || value?.includes("انث"))
    return "badge badge-female";
  if (value?.includes("ذكر")) return "badge badge-male";
  return "badge";
}

function parseFileLinks(value: string): string[] {
  if (!value) return [];
  const links = value.match(/https?:\/\/[^\s,\)]+/g) || [];
  return Array.from(new Set(links.map((s) => s.trim())));
}

export default function DashboardClient({ session }: { session: SessionData }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [troopFilter, setTroopFilter] = useState("الكل");
  const [stageFilter, setStageFilter] = useState("الكل");
  const [selected, setSelected] = useState<Row | null>(null);

  const isMainAdmin = session.troop === "all";

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/sheet-data", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ بجلب البيانات");
      } else {
        setRows(data.rows || []);
        setError("");
        setLastUpdated(new Date());
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), POLL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/");
  }

  const troopOptions = useMemo(() => {
    if (!isMainAdmin) return [];
    const set = new Set(rows.map((r) => r[TROOP_FIELD]).filter(Boolean));
    return Array.from(set).sort();
  }, [rows, isMainAdmin]);

  const stageOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r[STAGE_FIELD]).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (troopFilter !== "الكل" && r[TROOP_FIELD] !== troopFilter)
        return false;
      if (stageFilter !== "الكل" && r[STAGE_FIELD] !== stageFilter)
        return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay =
          `${r[NAME_FIELD] || ""} ${r["رقم الهاتف الشخصي"] || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, troopFilter, stageFilter, search]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const active = filteredRows.filter(
      (r) =>
        r[ACTIVE_FIELD]?.includes("ناشط") && !r[ACTIVE_FIELD]?.includes("غير"),
    ).length;
    const female = filteredRows.filter(
      (r) =>
        r[GENDER_FIELD]?.includes("أنث") || r[GENDER_FIELD]?.includes("انث"),
    ).length;
    const male = filteredRows.filter((r) =>
      r[GENDER_FIELD]?.includes("ذكر"),
    ).length;
    const troops = new Set(
      filteredRows.map((r) => r[TROOP_FIELD]).filter(Boolean),
    ).size;
    return { total, active, female, male, troops };
  }, [filteredRows]);
  return (
    <div>
      <header className="app-header">
        <div className="brand">
          <div className="emblem">🌿</div>
          <div>
            <h1>مفوضية الشمال - لوحة بيانات الأعضاء</h1>
            <div className="who">
              {session.displayName} ·{" "}
              {isMainAdmin ? "كل الأفواج" : session.troop}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {lastUpdated && (
            <span className="pill">
              آخر تحديث: {lastUpdated.toLocaleTimeString("ar-LB")}
            </span>
          )}
          <button className="btn-ghost" onClick={() => loadData()}>
            🔄 تحديث
          </button>
          <button className="btn-ghost" onClick={handleLogout}>
            خروج
          </button>
        </div>
      </header>

      <div className="container">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">إجمالي الأعضاء</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">ناشطون كشفيًا</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧑</div>
            <div className="stat-value">{stats.male}</div>
            <div className="stat-label">ذكور</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👩</div>
            <div className="stat-value">{stats.female}</div>
            <div className="stat-label">إناث</div>
          </div>
          {isMainAdmin && (
            <div className="stat-card">
              <div className="stat-icon">🏕️</div>
              <div className="stat-value">{stats.troops}</div>
              <div className="stat-label">عدد الأفواج</div>
            </div>
          )}
        </div>

        <div className="toolbar">
          <input
            className="search-input"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isMainAdmin && (
            <select
              className="select-input"
              value={troopFilter}
              onChange={(e) => setTroopFilter(e.target.value)}
            >
              <option value="الكل">كل الأفواج</option>
              {troopOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <select
            className="select-input"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="الكل">كل المراحل</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-state">جارٍ تحميل البيانات...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state">ما في نتائج مطابقة</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  {TABLE_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx} onClick={() => setSelected(row)}>
                    <td>{idx + 1}</td>
                    {TABLE_COLUMNS.map((c) => {
                      if (c.key === ACTIVE_FIELD) {
                        return (
                          <td key={c.key}>
                            <span className={activeBadgeClass(row[c.key])}>
                              {row[c.key] || "-"}
                            </span>
                          </td>
                        );
                      }
                      if (c.key === GENDER_FIELD) {
                        return (
                          <td key={c.key}>
                            <span className={genderBadgeClass(row[c.key])}>
                              {row[c.key] || "-"}
                            </span>
                          </td>
                        );
                      }
                      return <td key={c.key}>{row[c.key] || "-"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected[NAME_FIELD] || "بيانات العضو"}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {FIELD_GROUPS.map((group) => (
                <div className="section-block" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="kv-grid">
                    {group.fields.map((f) => {
                      if (isFileFieldLabel(f)) {
                        const matchedKey = getMatchingRowKey(selected, f);

                        const links = parseFileLinks(
                          matchedKey ? selected[matchedKey] : "",
                        );

                        return (
                          <div className="kv-item kv-item-file" key={f}>
                            <div className="k">{f}</div>

                            {links.length > 0 ? (
                              <div className="file-links">
                                {links.map((link, i) => (
                                  <a
                                    key={i}
                                    href={`/api/file-proxy?u=${encodeURIComponent(link)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-link-btn"
                                  >
                                    📎 عرض الملف
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="v">— لا يوجد مرفق —</div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="kv-item" key={f}>
                          <div className="k">{f}</div>
                          <div className="v">{selected[f] || "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
