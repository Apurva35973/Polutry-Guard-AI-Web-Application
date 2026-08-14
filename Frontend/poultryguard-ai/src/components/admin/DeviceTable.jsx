import React from "react";
import { Edit3, Trash2, Cpu, QrCode, Download } from "lucide-react";
import { SkeletonTableRow } from "./LoadingSpinner";

const statusConfig = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-500",
  Maintenance: "bg-yellow-100 text-yellow-700",
  Offline: "bg-red-100 text-red-600",
};

export default function DeviceTable({ devices, loading, onEdit, onDelete, onQRCode }) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Device ID", "Farmer", "Shed", "ESP32", "Pi", "Status", "Installed", "Actions"].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={9} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!devices?.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📡</div>
        <p className="text-gray-500 font-semibold">No devices found</p>
        <p className="text-gray-400 text-sm mt-1">Add your first IoT device to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {["#", "Device ID", "Farmer", "Shed", "ESP32", "Pi ID", "Status", "Installed", "Actions"].map((h) => (
              <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {devices.map((device, idx) => (
            <tr
              key={device.device_id}
              className="hover:bg-orange-50/40 transition-colors duration-150 group"
            >
              <td className="px-6 py-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-orange-500" />
                  <span className="font-mono text-xs font-semibold text-gray-700">
                    #{device.device_id}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="font-medium text-gray-700">
                  Farmer #{device.farmer_id}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600">{device.shed_name || "—"}</td>
              <td className="px-6 py-4 font-mono text-xs text-gray-500">
                {device.esp32_id ? device.esp32_id.slice(0, 12) + "…" : "—"}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-500">
                {device.raspberrypi_id ? device.raspberrypi_id.slice(0, 12) + "…" : "—"}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    statusConfig[device.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {device.status || "Active"}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-500 text-xs">
                {device.installation_date
                  ? new Date(device.installation_date).toLocaleDateString()
                  : "—"}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => onQRCode && onQRCode(device)}
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="View QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    onClick={() => onEdit(device)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Edit device"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(device)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete device"
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
