import React from "react";
import { Edit3, Trash2, Stethoscope } from "lucide-react";
import { SkeletonTableRow } from "./LoadingSpinner";

export default function VetTable({ vets, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Name", "Specialization", "License", "Experience", "Hospital", "Status", "Actions"].map((h) => (
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

  if (!vets?.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🩺</div>
        <p className="text-gray-500 font-semibold">No veterinarians found</p>
        <p className="text-gray-400 text-sm mt-1">Add your first veterinarian to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {["#", "Name", "Specialization", "License", "Experience", "Hospital", "Status", "Actions"].map((h) => (
              <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {vets.map((vet, idx) => (
            <tr
              key={vet.vet_id}
              className="hover:bg-blue-50/40 transition-colors duration-150 group"
            >
              <td className="px-6 py-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(vet.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{vet.full_name}</p>
                    <p className="text-xs text-gray-400">{vet.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  {vet.specialization || "General"}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-600">{vet.license_number || "—"}</td>
              <td className="px-6 py-4">
                <span className="font-semibold text-gray-700">
                  {vet.experience_years || 0}
                </span>
                <span className="text-gray-400 text-xs ml-1">yrs</span>
              </td>
              <td className="px-6 py-4 text-gray-600">{vet.hospital_clinic || "—"}</td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    vet.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {vet.status || "Active"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => onEdit(vet)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Edit vet"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(vet)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete vet"
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
