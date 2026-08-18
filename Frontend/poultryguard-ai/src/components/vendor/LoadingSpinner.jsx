import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ message = "Loading data..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <Loader2 className="animate-spin text-[#166534] mb-3" size={32} />
      <p className="text-sm font-semibold text-gray-700">{message}</p>
    </div>
  );
}
