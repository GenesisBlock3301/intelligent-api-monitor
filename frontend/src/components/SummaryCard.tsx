import type { ReactNode } from "react";

export function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <article className="summary-card">
      <div className="summary-card-icon" aria-hidden="true">{icon}</div>
      <div>
        <p className="summary-card-label">{label}</p>
        <p className="summary-card-value">{value}</p>
      </div>
    </article>
  );
}
