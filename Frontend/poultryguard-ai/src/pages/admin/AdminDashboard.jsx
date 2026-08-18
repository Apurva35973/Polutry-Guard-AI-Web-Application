import { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  Store,
  Cpu,
  Bell,
  Activity,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";
import DashboardCard from "../../components/admin/DashboardCard";
import { FarmTypeChart, AdminBarChart, AdminAreaChart } from "../../components/admin/StatsChart";
import { SkeletonCard } from "../../components/admin/LoadingSpinner";
import { getAdminOverview, getAllFarmers, getAllVendors, getHardwareKits, getAllAlerts } from "../../services/adminService";

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildFarmTypeData(farmers) {
  const counts = { Broiler: 0, Layer: 0, Breeder: 0 };
  (farmers || []).forEach((f) => {
    if (counts[f.farm_type] !== undefined) counts[f.farm_type]++;
    else counts.Broiler++;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildMonthlyData(items, dateKey = "created_at") {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const counts = Array(12).fill(0);
  (items || []).forEach((item) => {
    if (item[dateKey]) {
      const m = new Date(item[dateKey]).getMonth();
      counts[m]++;
    }
  });
  return months.map((name, i) => ({ name, value: counts[i] }));
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, fRes, vnRes, dRes, aRes] = await Promise.allSettled([
          getAdminOverview(),
          getAllFarmers(),
          getAllVendors(),
          getHardwareKits(),
          getAllAlerts(),
        ]);

        if (sRes.status === "fulfilled") setStats(sRes.value?.data || sRes.value);
        if (fRes.status === "fulfilled") setFarmers(fRes.value?.data || []);
        if (vnRes.status === "fulfilled") setVendors(vnRes.value?.data || []);
        if (dRes.status === "fulfilled") setDevices(dRes.value?.data || []);
        if (aRes.status === "fulfilled") setAlerts(aRes.value?.data || []);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const farmTypeData = buildFarmTypeData(farmers);
  const alertTrends = buildMonthlyData(alerts, "created_at");

  const vendorTypeData = (() => {
    const counts = {};
    (vendors || []).forEach((v) => {
      const t = v.vendor_type || "Other";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const cardData = [
    {
      title: "Total Farmers",
      value: stats?.total_farmers ?? farmers.length,
      icon: Users,
      color: "green",
      trendLabel: "Registered farms",
    },
    {
      title: "Active Farmers",
      value: stats?.active_farmers ?? "—",
      icon: Stethoscope,
      color: "blue",
      trendLabel: "Farm profiles active",
    },
    {
      title: "Online Devices",
      value: stats?.online_devices ?? "—",
      icon: Store,
      color: "lime",
      trendLabel: `${stats?.offline_devices ?? 0} offline`,
    },
    {
      title: "IoT Devices",
      value: stats?.total_devices ?? devices.length,
      icon: Cpu,
      color: "orange",
      trendLabel: "Deployed devices",
    },
    {
      title: "Active Alerts",
      value: stats?.active_alerts ?? alerts.length,
      icon: Bell,
      color: "red",
      trendLabel: "Monitoring alerts",
    },
    {
      title: "Active Veterinarians",
      value: stats?.active_veterinarians ?? "—",
      icon: Activity,
      color: "emerald",
      trendLabel: `${stats?.total_veterinarians ?? 0} registered`,
    },
  ];

  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem("user")) || {}; }
    catch { return {}; }
  })();

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">
            Welcome back, {user.full_name || "Admin"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's what's happening across PoultryGuard AI today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#166534] font-semibold bg-green-50 px-4 py-2 rounded-full border border-green-200">
          <TrendingUp size={14} />
          Live Dashboard
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : cardData.map((card) => (
              <DashboardCard key={card.title} {...card} />
            ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Farm Type Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Farm Type Distribution</h2>
              <p className="text-xs text-gray-400 mt-0.5">Broiler · Layer · Breeder breakdown</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <FarmTypeChart data={farmTypeData} />
          )}
        </div>

        {/* Vendor Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Vendor Distribution</h2>
              <p className="text-xs text-gray-400 mt-0.5">By business type</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse" />
          ) : vendorTypeData.length > 0 ? (
            <FarmTypeChart data={vendorTypeData} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
              No vendor data available
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Trends */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="font-bold text-gray-800 text-base">Disease Alert Trends</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monthly alert activity this year</p>
          </div>
          {loading ? (
            <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <AdminAreaChart
              data={alertTrends}
              dataKey="value"
              color="#ef4444"
              name="Alerts"
            />
          )}
        </div>

        {/* Devices by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="font-bold text-gray-800 text-base">Device Status Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Active, Inactive, Maintenance, Offline</p>
          </div>
          {loading ? (
            <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse" />
          ) : (() => {
            const statusCounts = {};
            devices.forEach((d) => {
              const s = d.device_status || d.status || "Available";
              statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
            return chartData.length > 0 ? (
              <AdminBarChart data={chartData} dataKey="value" name="Devices" color="#22c55e" />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                No device data available
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Quick Summary ── */}
      <div className="bg-gradient-to-br from-[#166534] to-[#22c55e] rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-lg font-bold mb-4">Platform Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Birds Monitored", value: farmers.reduce((a, f) => a + (f.total_birds || 0), 0).toLocaleString() },
            { label: "Online Devices", value: stats?.online_devices ?? "—" },
            { label: "Open Support", value: stats?.open_support_tickets ?? "—" },
            { label: "Pending Assignments", value: stats?.pending_assignment_requests ?? "—" },
          ].map((item) => (
            <div key={item.label} className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-extrabold">{item.value}</p>
              <p className="text-xs text-green-100 mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
