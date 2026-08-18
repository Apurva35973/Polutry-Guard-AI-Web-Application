import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Home,
  MapPin,
  Package,
  RefreshCcw,
  ShieldAlert,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import DashboardCard from "../../components/admin/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import {
  getAlerts,
  getDashboard,
  getOutbreakAlerts,
} from "../../services/vendorService";

const severityColors = {
  Low: "#166534",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

export default function VendorDashboard() {
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardData, alertData, outbreakData] = await Promise.all([
        getDashboard(),
        getAlerts(),
        getOutbreakAlerts(),
      ]);

      setStats(
        Array.isArray(dashboardData)
          ? dashboardData[0] || {}
          : dashboardData || {}
      );
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setOutbreaks(Array.isArray(outbreakData) ? outbreakData : []);
    } catch (err) {
      setError(err.message || "Unable to load vendor dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const alertStats = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    alerts.forEach((alert) => {
      if (counts[alert.severity] !== undefined) counts[alert.severity] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const outbreakStats = useMemo(() => {
    const counts = {};
    outbreaks.forEach((outbreak) => {
      const disease = outbreak.disease_name || "Unknown";
      counts[disease] = (counts[disease] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [outbreaks]);

  if (loading) return <LoadingSpinner message="Loading vendor operations dashboard..." />;

  const cardData = [
    {
      title: "Total Farms in Network",
      value: stats.total_farms || 0,
      icon: Home,
      color: "green",
      subtitle: "Registered nearby farms",
    },
    {
      title: "Active Outbreak Zones",
      value: stats.active_outbreaks || 0,
      icon: ShieldAlert,
      color: (stats.active_outbreaks || 0) > 0 ? "red" : "green",
      subtitle: "Containment perimeters",
    },
    {
      title: "Active Alert Records",
      value: stats.active_alerts || alerts.length,
      icon: Bell,
      color: alerts.length > 0 ? "orange" : "emerald",
      subtitle: "Open biosecurity signals",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Hardware & Distribution
            </span>
            <span className="text-xs text-gray-400 font-medium">Vendor Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Vendor Operations Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor nearby registered farms, hardware demand, active disease outbreaks, and biosecurity alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Operations</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <section className="grid gap-4 md:grid-cols-3">
        {cardData.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      {/* ── Charts Row ── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Alert Severity Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Alert Severity Distribution
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Breakdown of active alert levels in your sector
              </p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {alerts.length} Records
            </span>
          </div>

          <div className="h-72 w-full">
            {alerts.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={alertStats}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {alertStats.map((entry) => (
                      <Cell
                        fill={severityColors[entry.name] || "#166534"}
                        key={entry.name}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#0f172a",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No alert records to display
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            {alertStats.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-gray-700">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: severityColors[item.name] || "#166534" }}
                />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disease Outbreak Frequency */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Outbreak Containment Frequency
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Active quarantine zones by pathogen
              </p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {outbreaks.length} Zones
            </span>
          </div>

          <div className="h-72 w-full">
            {outbreakStats.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={outbreakStats}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#64748b"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#0f172a",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No active outbreak zones detected
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
