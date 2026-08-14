import React from "react";

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner({ size = "md", text = "Loading..." }) {
  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-10 w-10 border-4",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizes[size]} rounded-full border-[#166534]/30 border-t-[#22c55e] animate-spin`}
      />
      {text && (
        <p className="text-sm text-gray-500 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-32" />
    </div>
  );
}

// ─── Skeleton Table Row ───────────────────────────────────────────────────────
export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Page Loader ─────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#166534] to-[#22c55e] mb-6 shadow-lg">
          <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
        <p className="text-gray-600 font-semibold text-lg">Loading data...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
