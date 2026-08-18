import React from "react";
import { Info } from "lucide-react";

export default function EmptyState({
  icon: Icon = Info,
  title = "No records found",
  description = "There are currently no items to display in this view.",
  action,
  actionText,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-gray-200/80 shadow-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#166534] mb-4 shadow-sm">
        <Icon size={26} strokeWidth={2} />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-md leading-relaxed">
        {description}
      </p>
      {action && actionText && (
        <button
          type="button"
          onClick={action}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#166534] hover:bg-[#14532d] rounded-xl shadow-sm transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
