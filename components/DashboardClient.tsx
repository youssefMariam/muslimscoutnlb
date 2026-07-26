"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ALL_COLUMNS,
  TABLE_COLUMNS,
  NAME_FIELD,
  TROOP_FIELD,
  STAGE_FIELD,
  GENDER_FIELD,
  ACTIVE_FIELD,
  PHONE_FIELD,
  REGISTRY_FIELD,
  getFieldValue,
} from "@/lib/fields";
import { cleanExportValue } from "@/lib/utils";
import type { SessionData } from "@/lib/session";
import type { Row } from "@/lib/types";
import FilterPanel from "@/components/FilterPanel";
import ProfileModal from "@/components/ProfileModal";
import AnalyticsPanel from "@/components/AnalyticsPanel";

type SortDir = "asc" | "desc" | null;

const POLL_MS = 30000;
const PAGE_SIZE = 20;
const COLUMNS_STORAGE_KEY = "scout-dashboard-visible-columns";

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

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function parseListParam(sp: URLSearchParams, key: string): string[] {
  const v = sp.get(key);
  return v ? v.split(",").filter(Boolean) : [];
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function DashboardClient({ session }: { session: SessionData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const search = useDebounced(searchInput, 250);

  const [troops, setTroops] = useState<string[]>(() =>
    parseListParam(searchParams, "troop"),
  );
  const [stages, setStages] = useState<string[]>(() =>
    parseListParam(searchParams, "stage"),
  );
  const [genders, setGenders] = useState<string[]>(() =>
    parseListParam(searchParams, "gender"),
  );
  const [statuses, setStatuses] = useState<string[]>(() =>
    parseListParam(searchParams, "status"),
  );

  const [sortKey, setSortKey] = useState<string>(NAME_FIELD);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    TABLE_COLUMNS.map((c) => c.key),
  );

  const isMainAdmin = session.troop === "all";

  // تحميل تفضيل الأعمدة المحفوظ محليًا
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0)
          setVisibleColumns(parsed);
      }
    } catch {
      // تجاهل - نستخدم الافتراضي
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify(visibleColumns),
      );
    } catch {
      // تجاهل
    }
  }, [visibleColumns]);

  // مزامنة الفلاتر مع رابط الصفحة (قابل للمشاركة، ويشتغل معه زر رجوع بالمتصفح)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("q", search.trim());
    if (troops.length) qs.set("troop", troops.join(","));
    if (stages.length) qs.set("stage", stages.join(","));
    if (genders.length) qs.set("gender", genders.join(","));
    if (statuses.length) qs.set("status", statuses.join(","));
    const next = qs.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, troops, stages, genders, statuses]);

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!selected && !filterPanelOpen) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [selected, filterPanelOpen]);

  useEffect(() => {
    setPage(1);
  }, [search, troops, stages, genders, statuses]);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/");
  }

  async function handleExportExcel() {
    if (filteredRows.length === 0) return;
    setExporting(true);
    try {
      const origin = window.location.origin;
      const preferredKeys = TABLE_COLUMNS.map((c) => c.key);
      const allKeys = Array.from(
        new Set(filteredRows.flatMap((r) => Object.keys(r))),
      );
      const exportKeys = [
        ...preferredKeys,
        ...allKeys.filter((k) => !preferredKeys.includes(k)),
      ];

      const exportRows = filteredRows.map((row, index) => {
        const output: Record<string, string | number> = { "#": index + 1 };
        exportKeys.forEach((key) => {
          output[key] = cleanExportValue(row[key] ?? "", origin);
        });
        return output;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "البيانات");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `scout-dashboard-${stamp}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const troopOptions = useMemo(() => {
    if (!isMainAdmin) return [];
    const set = new Set(
      rows.map((r) => getFieldValue(r, TROOP_FIELD)).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [rows, isMainAdmin]);

  const stageOptions = useMemo(() => {
    const set = new Set(
      rows.map((r) => getFieldValue(r, STAGE_FIELD)).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows.filter((r) => {
      if (troops.length && !troops.includes(getFieldValue(r, TROOP_FIELD)))
        return false;
      if (stages.length && !stages.includes(getFieldValue(r, STAGE_FIELD)))
        return false;
      if (genders.length) {
        const g = getFieldValue(r, GENDER_FIELD);
        const isFemale = g.includes("أنث") || g.includes("انث");
        const label = isFemale ? "أنثى" : g.includes("ذكر") ? "ذكر" : "";
        if (!genders.includes(label)) return false;
      }
      if (statuses.length) {
        const a = getFieldValue(r, ACTIVE_FIELD);
        const isActive = a.includes("ناشط") && !a.includes("غير");
        const label = isActive
          ? "ناشط"
          : a.includes("غير")
            ? "غير ناشط"
            : a.includes("مسافر")
              ? "مسافر"
              : "";
        if (!statuses.includes(label)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const hay = [
          getFieldValue(r, NAME_FIELD),
          getFieldValue(r, PHONE_FIELD),
          getFieldValue(r, TROOP_FIELD),
          getFieldValue(r, STAGE_FIELD),
          getFieldValue(r, REGISTRY_FIELD),
        ]
          .join(" ")
          .toLowerCase();
        if (!q.every((term) => hay.includes(term))) return false;
      }
      return true;
    });

    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const cmp = getFieldValue(a, sortKey).localeCompare(
          getFieldValue(b, sortKey),
          "ar",
        );
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, troops, stages, genders, statuses, search, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const active = filteredRows.filter((r) => {
      const a = getFieldValue(r, ACTIVE_FIELD);
      return a.includes("ناشط") && !a.includes("غير");
    }).length;
    const female = filteredRows.filter((r) => {
      const g = getFieldValue(r, GENDER_FIELD);
      return g.includes("أنث") || g.includes("انث");
    }).length;
    const male = filteredRows.filter((r) =>
      getFieldValue(r, GENDER_FIELD).includes("ذكر"),
    ).length;
    const troopsCount = new Set(
      filteredRows.map((r) => getFieldValue(r, TROOP_FIELD)).filter(Boolean),
    ).size;
    return { total, active, female, male, troops: troopsCount };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  );

  const activeFilterCount =
    troops.length +
    stages.length +
    genders.length +
    statuses.length +
    (search.trim() ? 1 : 0);

  function resetAll() {
    setSearchInput("");
    setTroops([]);
    setStages([]);
    setGenders([]);
    setStatuses([]);
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortDir(null);
        setSortKey("");
      } else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: string) {
    if (sortKey !== key || !sortDir) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  const shownColumns = ALL_COLUMNS.filter((c) =>
    visibleColumns.includes(c.key),
  );

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
            <span className="pill pill-desktop-only">
              آخر تحديث: {lastUpdated.toLocaleTimeString("ar-LB")}
            </span>
          )}
          <button
            className="btn-ghost"
            onClick={() => loadData()}
            title="تحديث البيانات"
          >
            🔄 <span className="btn-label">تحديث</span>
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

        <AnalyticsPanel rows={filteredRows} showTroops={isMainAdmin} />

        <div className="toolbar-sticky">
          <div className="toolbar">
            <input
              className="search-input"
              placeholder="ابحث بالاسم، الهاتف، الفوج، المرحلة، رقم السجل..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              className="btn-filter-toggle"
              onClick={() => setFilterPanelOpen(true)}
            >
              ⚙️ فلاتر وأعمدة
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <button
              className="btn-export"
              onClick={handleExportExcel}
              disabled={loading || exporting || rows.length === 0}
            >
              {exporting ? "جارٍ التصدير..." : "⬇️ تحميل Excel"}
            </button>
          </div>
        </div>

        {!loading && !error && filteredRows.length > 0 && (
          <div className="results-meta">
            عرض {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredRows.length)} من{" "}
            {filteredRows.length} عضو
          </div>
        )}

        <div className="table-card">
          {loading ? (
            <div className="skeleton-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="skeleton-row" key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              ما في نتائج مطابقة
            </div>
          ) : (
            <>
              <div className="table-scroll table-only">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      {shownColumns.map((c) => (
                        <th
                          key={c.key}
                          className="sortable-th"
                          onClick={() => toggleSort(c.key)}
                        >
                          {c.label}
                          <span className="sort-arrow">
                            {sortIndicator(c.key)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, idx) => (
                      <tr key={idx} onClick={() => setSelected(row)}>
                        <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        {shownColumns.map((c) => {
                          const value = getFieldValue(row, c.key);
                          if (c.key === ACTIVE_FIELD) {
                            return (
                              <td key={c.key}>
                                <span className={activeBadgeClass(value)}>
                                  {value || "-"}
                                </span>
                              </td>
                            );
                          }
                          if (c.key === GENDER_FIELD) {
                            return (
                              <td key={c.key}>
                                <span className={genderBadgeClass(value)}>
                                  {value || "-"}
                                </span>
                              </td>
                            );
                          }
                          return <td key={c.key}>{value || "-"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="cards-only">
                {pagedRows.map((row, idx) => {
                  const name = getFieldValue(row, NAME_FIELD);
                  const troop = getFieldValue(row, TROOP_FIELD);
                  const stage = getFieldValue(row, STAGE_FIELD);
                  const gender = getFieldValue(row, GENDER_FIELD);
                  const activeStatus = getFieldValue(row, ACTIVE_FIELD);
                  const phone = getFieldValue(row, PHONE_FIELD);
                  return (
                    <div
                      className="member-card"
                      key={idx}
                      onClick={() => setSelected(row)}
                    >
                      <div className="member-card-top">
                        <div className="member-card-name">
                          {name || "بدون اسم"}
                        </div>
                        <span className={genderBadgeClass(gender)}>
                          {gender || "-"}
                        </span>
                      </div>
                      <div className="member-card-meta">
                        <span>🏕️ {troop || "-"}</span>
                        <span>🎖️ {stage || "-"}</span>
                        {phone && <span>📞 {phone}</span>}
                      </div>
                      <span className={activeBadgeClass(activeStatus)}>
                        {activeStatus || "-"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn-ghost-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹ السابق
                  </button>
                  <span className="pagination-info">
                    صفحة {page} من {totalPages}
                  </span>
                  <button
                    className="btn-ghost-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        isMainAdmin={isMainAdmin}
        troopOptions={troopOptions}
        stageOptions={stageOptions}
        selectedTroops={troops}
        toggleTroop={(v) => setTroops((prev) => toggleInArray(prev, v))}
        selectedStages={stages}
        toggleStage={(v) => setStages((prev) => toggleInArray(prev, v))}
        selectedGenders={genders}
        toggleGender={(v) => setGenders((prev) => toggleInArray(prev, v))}
        selectedStatuses={statuses}
        toggleStatus={(v) => setStatuses((prev) => toggleInArray(prev, v))}
        visibleColumns={visibleColumns}
        toggleColumn={(v) =>
          setVisibleColumns((prev) => toggleInArray(prev, v))
        }
        onReset={resetAll}
      />

      {selected && (
        <ProfileModal row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
