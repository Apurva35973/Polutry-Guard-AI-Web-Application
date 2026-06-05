import React from "react";
import { AlertCircle, AlertOctagon, Info, ShieldAlert } from "lucide-react";

const severityMap = {
  Low: {
    icon: Info,
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  Medium: {
    icon: AlertCircle,
    classes: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
  },
  High: {
    icon: ShieldAlert,
    classes: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  },
  Critical: {
    icon: AlertOctagon,
    classes: "border-red-500/40 bg-red-500/10 text-red-200",
  },
};

export default function AlertCard({ alert }) {
  const severity = severityMap[alert.severity] || severityMap.Low;
  const Icon = severity.icon;

  return (
    <article className={`rounded-lg border p-5 shadow-xl shadow-black/10 ${severity.classes}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-lg border border-current/20 bg-black/20 p-3">
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-black text-white">{alert.alert_type || "Alert"}</h3>
            <span className="rounded-full border border-current/25 px-3 py-1 text-xs font-black">
              {alert.severity || "Low"}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-200">
            {alert.message || "No alert message available."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            {alert.farmer_id && <span>Farm ID: {alert.farmer_id}</span>}
            {(alert.created_at || alert.alert_time) && (
              <span>{new Date(alert.created_at || alert.alert_time).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
