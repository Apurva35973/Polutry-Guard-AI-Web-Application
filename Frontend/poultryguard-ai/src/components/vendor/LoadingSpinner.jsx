import React from "react";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="grid min-h-72 place-items-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-400" />
        <p className="mt-4 text-sm font-semibold text-emerald-200">{message}</p>
      </div>
    </div>
  );
}
