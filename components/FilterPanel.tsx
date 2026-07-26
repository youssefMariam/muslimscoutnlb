"use client";

import { TABLE_COLUMNS, OPTIONAL_COLUMNS } from "@/lib/fields";

function CheckboxGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="filter-group">
      <div className="filter-group-title">{title}</div>
      <div className="filter-group-options">
        {options.map((opt) => (
          <label key={opt} className="checkbox-row">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({
  open,
  onClose,
  isMainAdmin,
  troopOptions,
  stageOptions,
  selectedTroops,
  toggleTroop,
  selectedStages,
  toggleStage,
  selectedGenders,
  toggleGender,
  selectedStatuses,
  toggleStatus,
  visibleColumns,
  toggleColumn,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  isMainAdmin: boolean;
  troopOptions: string[];
  stageOptions: string[];
  selectedTroops: string[];
  toggleTroop: (v: string) => void;
  selectedStages: string[];
  toggleStage: (v: string) => void;
  selectedGenders: string[];
  toggleGender: (v: string) => void;
  selectedStatuses: string[];
  toggleStatus: (v: string) => void;
  visibleColumns: string[];
  toggleColumn: (v: string) => void;
  onReset: () => void;
}) {
  if (!open) return null;

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="filter-drawer-header">
          <h3>تصفية وتخصيص</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-drawer-body">
          {isMainAdmin && (
            <CheckboxGroup
              title="الفوج"
              options={troopOptions}
              selected={selectedTroops}
              onToggle={toggleTroop}
            />
          )}
          <CheckboxGroup
            title="المرحلة الكشفية"
            options={stageOptions}
            selected={selectedStages}
            onToggle={toggleStage}
          />
          <CheckboxGroup
            title="الجنس"
            options={["ذكر", "أنثى"]}
            selected={selectedGenders}
            onToggle={toggleGender}
          />
          <CheckboxGroup
            title="الحالة"
            options={["ناشط", "غير ناشط", "مسافر"]}
            selected={selectedStatuses}
            onToggle={toggleStatus}
          />

          <div className="filter-group">
            <div className="filter-group-title">الأعمدة الظاهرة بالجدول</div>
            <div className="filter-group-options">
              {[...TABLE_COLUMNS, ...OPTIONAL_COLUMNS].map((c) => (
                <label key={c.key} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(c.key)}
                    onChange={() => toggleColumn(c.key)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-drawer-footer">
          <button className="btn-clear-filters" onClick={onReset}>إعادة تعيين الكل</button>
          <button className="btn-primary-sm" onClick={onClose}>تم</button>
        </div>
      </div>
    </div>
  );
}
