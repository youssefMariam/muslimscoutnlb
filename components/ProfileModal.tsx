"use client";

import { useState } from "react";
import {
  FIELD_GROUPS,
  NAME_FIELD,
  TROOP_FIELD,
  STAGE_FIELD,
  GENDER_FIELD,
  ACTIVE_FIELD,
  PHONE_FIELD,
  getMatchingRowKey,
  getFieldValue,
  isFileFieldLabel,
} from "@/lib/fields";
import { parseFileLinks, initialsFromName, toWhatsAppLink } from "@/lib/utils";
import type { Row } from "@/lib/types";

function activeBadgeClass(value: string) {
  if (value?.includes("غير")) return "badge badge-inactive";
  if (value?.includes("مسافر")) return "badge badge-traveling";
  if (value?.includes("ناشط")) return "badge badge-active";
  return "badge";
}

function genderBadgeClass(value: string) {
  if (value?.includes("أنث") || value?.includes("انث")) return "badge badge-female";
  if (value?.includes("ذكر")) return "badge badge-male";
  return "badge";
}

export default function ProfileModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const name = getFieldValue(row, NAME_FIELD);
  const troop = getFieldValue(row, TROOP_FIELD);
  const stage = getFieldValue(row, STAGE_FIELD);
  const gender = getFieldValue(row, GENDER_FIELD);
  const status = getFieldValue(row, ACTIVE_FIELD);
  const phone = getFieldValue(row, PHONE_FIELD);
  const whatsapp = toWhatsAppLink(phone);

  async function copyPhone() {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard قد يكون غير متاح - تجاهل بهدوء
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close modal-close-floating" onClick={onClose}>✕</button>

        <div className="profile-header">
          <div className="profile-avatar">{initialsFromName(name)}</div>
          <h2>{name || "بيانات العضو"}</h2>
          <div className="profile-pills">
            {status && <span className={activeBadgeClass(status)}>{status}</span>}
            {stage && <span className="badge badge-stage">{stage}</span>}
            {gender && <span className={genderBadgeClass(gender)}>{gender}</span>}
          </div>
          {troop && <div className="profile-troop">🏕️ {troop}</div>}

          <div className="profile-actions">
            {phone && (
              <button className="profile-action-btn" onClick={copyPhone}>
                {copied ? "✓ تم النسخ" : "📋 نسخ الرقم"}
              </button>
            )}
            {whatsapp && (
              <a className="profile-action-btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
                💬 واتساب
              </a>
            )}
          </div>
        </div>

        <div className="modal-body">
          {FIELD_GROUPS.map((group) => (
            <div className="section-block" key={group.title}>
              <h3>{group.title}</h3>
              <div className="kv-grid">
                {group.fields.map((f) => {
                  if (isFileFieldLabel(f)) {
                    const matchedKey = getMatchingRowKey(row, f);
                    const links = parseFileLinks(matchedKey ? row[matchedKey] : "");
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
                                📎 عرض الملف{links.length > 1 ? ` ${i + 1}` : ""}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="v">— لا يوجد مرفق —</div>
                        )}
                      </div>
                    );
                  }
                  const value = getFieldValue(row, f);
                  return (
                    <div className="kv-item" key={f}>
                      <div className="k">{f}</div>
                      <div className="v">{value || "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
