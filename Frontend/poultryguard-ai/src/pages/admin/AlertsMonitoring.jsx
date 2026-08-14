import React, { useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
import AlertCard from "../../components/admin/AlertCard";
import { LoadingSpinner } from "../../components/admin/LoadingSpinner";
import { getAllAlerts } from "../../services/adminService";

export default function AlertsMonitoring() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const res = await getAllAlerts();
        setAlerts(res?.data || []);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    const query = search.toLowerCase();
    return alerts.filter((alert) =>
      [
        alert.alert_type,
        alert.severity,
        alert.message,
        alert.farmer_name,
        alert.full_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [alerts, search]);

  const counts = useMemo(
    () =>
      filteredAlerts.reduce(
        (acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        },
        { Low: 0, Medium: 0, High: 0, Critical: 0 }
      ),
    [filteredAlerts]
  );

  if (loading) return <LoadingSpinner text="Loading alert feed..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <Bell className="text-[#166534]" size={24} />
            Alerts Monitoring
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track farm alert type, severity, message, farmer, and creation date.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Low", "bg-green-50 text-green-700"],
          ["Medium", "bg-yellow-50 text-yellow-700"],
          ["High", "bg-orange-50 text-orange-700"],
          ["Critical", "bg-red-50 text-red-700"],
        ].map(([label, classes]) => (
          <div className={`rounded-2xl border border-gray-100 p-5 shadow-sm ${classes}`} key={label}>
            <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-3xl font-extrabold">{counts[label] || 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alerts..."
            value={search}
          />
        </div>
      </section>

      {filteredAlerts.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredAlerts.map((alert) => (
            <AlertCard alert={alert} key={alert.alert_id} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="font-bold text-gray-800">No alerts found</p>
          <p className="mt-1 text-sm text-gray-500">The current filters did not match any alerts.</p>
        </section>
      )}
    </div>
  );
}
