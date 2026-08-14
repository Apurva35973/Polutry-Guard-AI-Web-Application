import React from "react";
import { Edit3, Trash2, Store } from "lucide-react";
import { SkeletonTableRow } from "./LoadingSpinner";

const vendorTypeBadge = {
  Feed: "bg-amber-100 text-amber-700",
  Medicine: "bg-red-100 text-red-700",
  Equipment: "bg-blue-100 text-blue-700",
  Poultry: "bg-green-100 text-green-700",
};

export default function VendorTable({ vendors, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Name", "Business", "Type", "Contact", "Address", "Status", "Actions"].map((h) => (
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

  if (!vendors?.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🏪</div>
        <p className="text-gray-500 font-semibold">No vendors found</p>
        <p className="text-gray-400 text-sm mt-1">Add your first vendor to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {["#", "Name", "Business", "Type", "Contact", "Address", "Status", "Actions"].map((h) => (
              <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {vendors.map((vendor, idx) => (
            <tr
              key={vendor.vendor_id}
              className="hover:bg-purple-50/40 transition-colors duration-150 group"
            >
              <td className="px-6 py-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(vendor.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{vendor.full_name}</p>
                    <p className="text-xs text-gray-400">{vendor.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Store size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{vendor.business_name || "—"}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    vendorTypeBadge[vendor.vendor_type] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {vendor.vendor_type || "—"}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-500">{vendor.phone_number || "—"}</td>
              <td className="px-6 py-4 text-gray-500 text-xs max-w-[140px] truncate">
                {vendor.address || "—"}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    vendor.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {vendor.status || "Active"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => onEdit(vendor)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Edit vendor"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(vendor)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete vendor"
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
