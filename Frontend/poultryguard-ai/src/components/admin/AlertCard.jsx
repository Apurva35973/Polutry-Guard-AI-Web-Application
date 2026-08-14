import React from "react";
import { AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";

const severityConfig = {
  Low: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
    Icon: Info,
  },
  Medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
    Icon: AlertCircle,
  },
  High: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
    Icon: AlertTriangle,
  },
  Critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
    Icon: Zap,
  },
};

export default function AlertCard({ alert }) {
  const severity = alert.severity || "Low";
  const cfg = severityConfig[severity] || severityConfig.Low;
  const { Icon } = cfg;

  return (
    <div
      className={`${cfg.bg} ${cfg.border} border rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.badge} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 className="font-bold text-gray-800 text-sm">
              {alert.alert_type || "System Alert"}
            </h4>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge} flex items-center gap-1.5`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {alert.message || "No message available"}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium flex-wrap gap-1">
            <span>
              👤 {alert.farmer_name || alert.full_name || "Unknown Farmer"}
            </span>
            <span>
              {alert.created_at
                ? new Date(alert.created_at).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
