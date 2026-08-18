import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, Zap } from "lucide-react";
import StatusBadge from "./StatusBadge";

const severityConfig = {
  CRITICAL: {
    cardBg: "bg-red-50/90 border-red-200 text-red-950",
    iconBg: "bg-red-100 text-red-700 border-red-200",
    badgeSeverity: "CRITICAL",
    Icon: Zap,
    titleColor: "text-red-950",
    descColor: "text-red-900/90",
    sensorBg: "bg-white/80 border-red-200/80 text-red-950",
    timeColor: "text-red-800/80",
    btnColor: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  },
  HIGH: {
    cardBg: "bg-orange-50/90 border-orange-200 text-orange-950",
    iconBg: "bg-orange-100 text-orange-700 border-orange-200",
    badgeSeverity: "HIGH",
    Icon: AlertTriangle,
    titleColor: "text-orange-950",
    descColor: "text-orange-900/90",
    sensorBg: "bg-white/80 border-orange-200/80 text-orange-950",
    timeColor: "text-orange-800/80",
    btnColor: "bg-orange-600 hover:bg-orange-700 text-white shadow-sm",
  },
  WARNING: {
    cardBg: "bg-amber-50/90 border-amber-200 text-amber-950",
    iconBg: "bg-amber-100 text-amber-800 border-amber-200",
    badgeSeverity: "WARNING",
    Icon: AlertCircle,
    titleColor: "text-amber-950",
    descColor: "text-amber-900/90",
    sensorBg: "bg-white/80 border-amber-200/80 text-amber-950",
    timeColor: "text-amber-800/80",
    btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm",
  },
  MEDIUM: {
    cardBg: "bg-amber-50/90 border-amber-200 text-amber-950",
    iconBg: "bg-amber-100 text-amber-800 border-amber-200",
    badgeSeverity: "MEDIUM",
    Icon: AlertCircle,
    titleColor: "text-amber-950",
    descColor: "text-amber-900/90",
    sensorBg: "bg-white/80 border-amber-200/80 text-amber-950",
    timeColor: "text-amber-800/80",
    btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm",
  },
  INFO: {
    cardBg: "bg-blue-50/90 border-blue-200 text-blue-950",
    iconBg: "bg-blue-100 text-blue-700 border-blue-200",
    badgeSeverity: "INFO",
    Icon: Info,
    titleColor: "text-blue-950",
    descColor: "text-blue-900/90",
    sensorBg: "bg-white/80 border-blue-200/80 text-blue-950",
    timeColor: "text-blue-800/80",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  },
  LOW: {
    cardBg: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
    iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    badgeSeverity: "LOW",
    Icon: CheckCircle2,
    titleColor: "text-emerald-950",
    descColor: "text-emerald-900/90",
    sensorBg: "bg-white/80 border-emerald-200/80 text-emerald-950",
    timeColor: "text-emerald-800/80",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  },
  RESOLVED: {
    cardBg: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
    iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    badgeSeverity: "RESOLVED",
    Icon: CheckCircle2,
    titleColor: "text-emerald-950",
    descColor: "text-emerald-900/90",
    sensorBg: "bg-white/80 border-emerald-200/80 text-emerald-950",
    timeColor: "text-emerald-800/80",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  },
};

function formatTimestamp(value) {
  if (!value) return "Just now";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

export default function UnifiedAlertCard({
  alert,
  onAction,
  actionLabel,
  className = "",
}) {
  const rawSeverity = String(alert.severity || alert.alert_level || "WARNING").toUpperCase();
  const cfg = severityConfig[rawSeverity] || severityConfig.WARNING;
  const { Icon } = cfg;

  const title =
    alert.title ||
    alert.alert_type ||
    (alert.parameter ? `${alert.parameter} Alert` : "Environmental Alert");

  const description =
    alert.description ||
    alert.message ||
    "Environmental parameter threshold exceeded safe operating levels.";

  const sensorValue =
    alert.current_value ||
    alert.sensor_value ||
    alert.value ||
    (alert.parameter && alert.reading != null
      ? `${alert.reading} ${alert.unit || ""}`
      : null);

  const timestamp = alert.timestamp || alert.created_at || alert.alert_time;
  const status = alert.status || (rawSeverity === "RESOLVED" ? "Resolved" : "Active");

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 ${cfg.cardBg} ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center shadow-sm ${cfg.iconBg}`}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <StatusBadge status={rawSeverity} size="sm" />
              {status && status !== rawSeverity && (
                <StatusBadge status={status} size="sm" />
              )}
            </div>
            {timestamp && (
              <span
                className={`flex items-center gap-1 text-xs font-semibold ${cfg.timeColor}`}
              >
                <Clock size={13} />
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>

          <h3 className={`font-bold text-base sm:text-lg mb-1 ${cfg.titleColor}`}>
            {title}
          </h3>

          <p className={`text-sm leading-relaxed mb-3 ${cfg.descColor}`}>
            {description}
          </p>

          {sensorValue && (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold mb-3 shadow-xs ${cfg.sensorBg}`}
            >
              <span className="opacity-75 font-medium">Recorded Value:</span>
              <span className="font-extrabold">{sensorValue}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5">
            <div className="flex items-center gap-4 text-xs font-medium opacity-80">
              {alert.farmer_name && (
                <span>Farmer: <b>{alert.farmer_name}</b></span>
              )}
              {alert.farm_name && (
                <span>Farm: <b>{alert.farm_name}</b></span>
              )}
              {alert.parameter && (
                <span>Sensor: <b>{alert.parameter}</b></span>
              )}
            </div>

            {onAction && (
              <button
                type="button"
                onClick={() => onAction(alert)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all ${cfg.btnColor}`}
              >
                {actionLabel || "Acknowledge"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
