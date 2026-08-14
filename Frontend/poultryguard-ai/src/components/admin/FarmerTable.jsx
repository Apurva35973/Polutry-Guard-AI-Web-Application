import React from "react";
import { Edit3, Trash2, MapPin } from "lucide-react";
import { SkeletonTableRow } from "./LoadingSpinner";

export default function FarmerTable({ farmers, loading, onEdit, onDelete }) {
  const farmTypeBadge = {
    Broiler: "bg-amber-100 text-amber-700",
    Layer: "bg-blue-100 text-blue-700",
    Breeder: "bg-purple-100 text-purple-700",
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Name", "Farm", "Type", "Birds", "Contact", "Status", "Actions"].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={8} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!farmers?.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🐔</div>
        <p className="text-gray-500 font-semibold">No farmers found</p>
        <p className="text-gray-400 text-sm mt-1">Add your first farmer to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {["#", "Name", "Farm", "Type", "Birds", "Contact", "Status", "Actions"].map((h) => (
              <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {farmers.map((farmer, idx) => (
            <tr
              key={farmer.farmer_id}
              className="hover:bg-green-50/40 transition-colors duration-150 group"
            >
              <td className="px-6 py-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#166534] to-[#22c55e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(farmer.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{farmer.full_name}</p>
                    <p className="text-xs text-gray-400">{farmer.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="font-medium text-gray-700">{farmer.farm_name}</p>
                {farmer.address && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {farmer.address.slice(0, 30)}…
                  </p>
                )}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    farmTypeBadge[farmer.farm_type] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {farmer.farm_type || "—"}
                </span>
              </td>
              <td className="px-6 py-4 font-semibold text-gray-700">
                {farmer.total_birds?.toLocaleString() || "—"}
              </td>
              <td className="px-6 py-4 text-gray-500">{farmer.phone_number || "—"}</td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    farmer.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {farmer.status || "Active"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => onEdit(farmer)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Edit farmer"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(farmer)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete farmer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
