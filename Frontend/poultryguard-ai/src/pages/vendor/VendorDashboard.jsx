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
import { Bell, Home, ShieldAlert } from "lucide-react";
import DashboardCard from "../../components/vendor/DashboardCard";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import {
  getAlerts,
  getDashboard,
  getOutbreakAlerts,
} from "../../services/vendorService";

const severityColors = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};

export default function VendorDashboard() {
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [dashboardData, alertData, outbreakData] = await Promise.all([
          getDashboard(),
          getAlerts(),
          getOutbreakAlerts(),
        ]);

        setStats(Array.isArray(dashboardData) ? dashboardData[0] || {} : dashboardData || {});
        setAlerts(Array.isArray(alertData) ? alertData : []);
        setOutbreaks(Array.isArray(outbreakData) ? outbreakData : []);
      } catch (err) {
        setError(err.message || "Unable to load vendor dashboard.");
      } finally {
        setLoading(false);
      }
    };

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

  if (loading) return <LoadingSpinner message="Loading vendor dashboard..." />;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase text-emerald-300">Overview</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
          Vendor Dashboard
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Monitor nearby farms, active alerts, and disease outbreak activity from one operations view.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          caption="Registered farms in the network"
          icon={Home}
          title="Total Farms"
          tone="sky"
          value={stats.total_farms || 0}
        />
        <DashboardCard
          caption="Currently active containment zones"
          icon={ShieldAlert}
          title="Active Outbreaks"
          tone="red"
          value={stats.active_outbreaks || 0}
        />
        <DashboardCard
          caption="Open biosecurity alert records"
          icon={Bell}
          title="Active Alerts"
          tone="amber"
          value={stats.active_alerts || 0}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black text-white">Alert Statistics</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={alertStats}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={104}
                  paddingAngle={3}
                >
                  {alertStats.map((entry) => (
                    <Cell fill={severityColors[entry.name]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#07130f",
                    border: "1px solid rgba(16,185,129,.35)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black text-white">Outbreak Statistics</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={outbreakStats}>
                <CartesianGrid stroke="rgba(148,163,184,.12)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#07130f",
                    border: "1px solid rgba(16,185,129,.35)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
