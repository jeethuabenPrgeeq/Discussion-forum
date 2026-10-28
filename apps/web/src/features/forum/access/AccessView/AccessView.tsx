"use client";

import { useState } from "react";
import {
  ACCESS_PERMISSIONS,
  ACCESS_ROLES,
  DEFAULT_ACCESS,
  type AccessMatrix,
  type AccessPermission,
  type AccessRole,
} from "@/features/forum/lib/access";
import styles from "./AccessView.module.css";

export default function AccessView() {
  const [matrix, setMatrix] = useState<AccessMatrix>(DEFAULT_ACCESS);

  const toggle = (permission: AccessPermission, role: AccessRole) =>
    setMatrix((prev) => ({
      ...prev,
      [permission]: { ...prev[permission], [role]: !prev[permission][role] },
    }));

  const handleSave = () => console.info("access", matrix);

  return (
    <div className={styles.wrap}>
      <section className={styles.card} aria-label="Access permissions">
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colDetails} />
              <col className={styles.colRole} />
              <col className={styles.colRole} />
              <col className={styles.colRole} />
              <col className={styles.colLast} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={styles.detailsHead}>
                  Details
                </th>
                {ACCESS_ROLES.map((r) => (
                  <th key={r.key} scope="col">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCESS_PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <th scope="row" className={styles.rowHead}>
                    {p.label}
                  </th>
                  {ACCESS_ROLES.map((r) => (
                    <td key={r.key}>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          className={styles.input}
                          checked={matrix[p.key][r.key]}
                          onChange={() => toggle(p.key, r.key)}
                          aria-label={`${r.label}: ${p.label}`}
                        />
                        <span className={styles.box} aria-hidden="true">
                          <svg className={styles.tick} viewBox="0 0 24 24">
                            <rect x="2.5" y="2.5" width="19" height="19" rx="4" />
                            <path d="M8 12.2 10.8 15 16 9" />
                          </svg>
                        </span>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.footer}>
        <button type="button" className={styles.save} onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}