import React from "react";
import {
  Users,
  Activity,
  ShieldAlert,
  Building2,
} from "lucide-react";

export default function Analytics() {
  const stats = [
    {
      title: "Total Farmers",
      value: "245",
      icon: Users,
    },
    {
      title: "Total Vendors",
      value: "82",
      icon: Building2,
    },
    {
      title: "Active Devices",
      value: "567",
      icon: Activity,
    },
    {
      title: "Outbreak Alerts",
      value: "12",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Analytics Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          PoultryGuard AI system analytics overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    {item.title}
                  </p>

                  <h2 className="text-3xl font-bold mt-2 text-[#166534]">
                    {item.value}
                  </h2>
                </div>

                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Icon
                    size={22}
                    className="text-[#166534]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Placeholders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg mb-4">
            Farmer Growth
          </h3>

          <div className="h-72 flex items-center justify-center text-gray-400">
            Recharts Farmer Growth Chart
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg mb-4">
            Vendor Growth
          </h3>

          <div className="h-72 flex items-center justify-center text-gray-400">
            Recharts Vendor Growth Chart
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg mb-4">
            Alert Trends
          </h3>

          <div className="h-72 flex items-center justify-center text-gray-400">
            Recharts Alert Trend Chart
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg mb-4">
            Outbreak Trends
          </h3>

          <div className="h-72 flex items-center justify-center text-gray-400">
            Recharts Outbreak Trend Chart
          </div>
        </div>
      </div>
    </div>
  );
}