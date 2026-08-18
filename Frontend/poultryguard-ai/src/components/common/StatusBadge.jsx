import React from "react";

const badgeVariants = {
  NORMAL: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  ONLINE: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  ACTIVE: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  RESOLVED: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  COMPLETED: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  LOW: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  WARNING: {
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  PENDING: {
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  MEDIUM: {
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  HIGH: {
    bg: "bg-orange-50 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  CRITICAL: {
    bg: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  OFFLINE: {
    bg: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  FAULT: {
    bg: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  CANCELLED: {
    bg: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
  AVAILABLE: {
    bg: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  INFO: {
    bg: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  ASSIGNED: {
    bg: "bg-purple-50 text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  INACTIVE: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  UNAVAILABLE: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  UNKNOWN: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
};

export default function StatusBadge({
  status = "NORMAL",
  label,
  showDot = true,
  size = "md",
  className = "",
}) {
  const normalized = String(status || "").trim().toUpperCase();
  const variant = badgeVariants[normalized] || badgeVariants.UNKNOWN;
  const displayText = label || status || "Unknown";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-2.5 py-1 text-xs font-bold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-bold gap-2",
  }[size] || "px-2.5 py-1 text-xs font-bold gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${variant.bg} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${variant.dot}`}
        />
      )}
      <span className="truncate uppercase tracking-wide">{displayText}</span>
    </span>
  );
}
