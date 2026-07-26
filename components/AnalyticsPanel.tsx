"use client";

import { useMemo } from "react";
import { BIRTH_FIELD, TROOP_FIELD, getFieldValue } from "@/lib/fields";
import { computeAge } from "@/lib/utils";
import type { Row } from "@/lib/types";

const AGE_BUCKETS: [string, number, number][] = [
  ["أقل من ١٢", 0, 11],
  ["١٢-١٤", 12, 14],
  ["١٥-١٧", 15, 17],
  ["١٨-٢٥", 18, 25],
  ["٢٦ فما فوق", 26, 200],
];

function Bars({
  items,
  max,
}: {
  items: { label: string; count: number }[];
  max: number;
}) {
  return (
    <div className="bars-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width:
                  max > 0
                    ? `${Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0)}%`
                    : "0%",
              }}
            />
          </div>
          <div className="bar-count">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPanel({
  rows,
  showTroops,
}: {
  rows: Row[];
  showTroops: boolean;
}) {
  const ageData = useMemo(() => {
    const buckets = AGE_BUCKETS.map(([label]) => ({ label, count: 0 }));
    rows.forEach((r) => {
      const age = computeAge(getFieldValue(r, BIRTH_FIELD));
      if (age === null) return;
      const idx = AGE_BUCKETS.findIndex(
        ([, min, max]) => age >= min && age <= max,
      );
      if (idx >= 0) buckets[idx].count++;
    });
    return buckets;
  }, [rows]);

  const troopData = useMemo(() => {
    if (!showTroops) return [];
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const t = getFieldValue(r, TROOP_FIELD);
      if (!t) return;
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [rows, showTroops]);

  const ageMax = Math.max(1, ...ageData.map((d) => d.count));
  const troopMax = Math.max(1, ...troopData.map((d) => d.count));

  const hasAnyAge = ageData.some((d) => d.count > 0);

  if (!hasAnyAge && troopData.length === 0) return null;

  return (
    <div className="analytics-grid">
      {hasAnyAge && (
        <div className="analytics-card">
          <h4>التوزيع العمري</h4>
          <Bars items={ageData} max={ageMax} />
        </div>
      )}
      {showTroops && troopData.length > 0 && (
        <div className="analytics-card">
          <h4>التعداد</h4>
          <Bars items={troopData} max={troopMax} />
        </div>
      )}
    </div>
  );
}
