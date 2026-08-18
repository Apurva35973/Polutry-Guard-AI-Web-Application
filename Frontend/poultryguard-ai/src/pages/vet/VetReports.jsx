import React, { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Printer,
  HeartPulse,
  AlertTriangle,
  Users,
  CheckCircle2,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "react-toastify";
import DashboardCard from "../../components/admin/DashboardCard";
import { getVetReports } from "../../services/vetService";

const COLORS = ["#166534", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function VetReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getVetReports({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (res.status === "success") {
        setReportData(res.data);
      } else {
        toast.error(res.error || "Failed to load reports");
      }
    } catch {
      toast.error("Unable to generate veterinarian report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    void loadReport();
  };

  const metrics = reportData?.metrics || {};
  const diseaseDist = reportData?.disease_distribution || [];
  const riskDist = reportData?.risk_distribution || [];
  const recentRecords = reportData?.recent_records || [];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <FileText size={13} />
              Clinical Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Veterinary Reports & Epidemiological Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Aggregate clinical consultations, pathogen prevalence, and biosecurity risk summaries.
          </p>
        </div>

        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="btn"
          >
            <Printer size={16} />
            <span>Print / Export Report</span>
          </button>
        </div>
      </div>

      {/* ── Date Filters ── */}
      <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
        <form onSubmit={handleApplyFilter} className="grid gap-4 sm:grid-cols-3 items-end">
          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            From Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input text-xs"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            To Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input text-xs"
            />
          </label>

          <button type="submit" className="btn text-xs">
            <Filter size={15} />
            <span>Filter Report Data</span>
          </button>
        </form>
      </section>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500 animate-pulse">
          Generating epidemiological summary report...
        </div>
      ) : reportData ? (
        <div className="space-y-8">
          {/* ── Summary KPI Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title="Total Consultations"
              value={metrics.total_consultations ?? 0}
              icon={FileText}
              color="blue"
              subtitle="All registered cases"
            />
            <DashboardCard
              title="Resolved Cases"
              value={metrics.resolved_cases ?? 0}
              icon={CheckCircle2}
              color="green"
              subtitle="Successfully treated"
            />
            <DashboardCard
              title="Active Cases"
              value={metrics.active_cases ?? 0}
              icon={HeartPulse}
              color="orange"
              subtitle="Under active treatment"
            />
            <DashboardCard
              title="High-Risk Farms"
              value={metrics.high_risk_farms ?? 0}
              icon={AlertTriangle}
              color="red"
              subtitle="Elevated biosecurity alert"
            />
          </div>

          {/* ── Charts Grid ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Disease Distribution Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Detected Pathogen & Disease Distribution
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Frequency of detected poultry conditions across all screened farm flocks
              </p>

              {diseaseDist.length ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diseaseDist}>
                      <XAxis dataKey="disease_name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#166534" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No disease distribution data in the selected period.
                </div>
              )}
            </div>

            {/* Risk Distribution Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Biosecurity Risk Tier Breakdown
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Proportion of flocks in Low, Medium, and High risk classifications
              </p>

              {riskDist.length ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDist}
                        dataKey="count"
                        nameKey="risk_level"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {riskDist.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.risk_level === "High"
                                ? "#ef4444"
                                : entry.risk_level === "Medium"
                                ? "#f59e0b"
                                : "#22c55e"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No risk distribution data available.
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Clinical Case Log ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
            <h3 className="font-bold text-gray-900 text-base mb-4">
              Clinical Case Audit Trail
            </h3>

            {recentRecords.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 uppercase text-gray-500 bg-gray-50/50">
                      <th className="py-2.5 px-3">Case ID</th>
                      <th className="py-2.5 px-3">Farmer</th>
                      <th className="py-2.5 px-3">Farm</th>
                      <th className="py-2.5 px-3">Disease / Condition</th>
                      <th className="py-2.5 px-3">Clinical Action</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentRecords.map((r) => (
                      <tr key={r.consultation_id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">
                          #{r.consultation_id}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-800">{r.farmer_name}</td>
                        <td className="py-3 px-3 text-gray-600">{r.farm_name}</td>
                        <td className="py-3 px-3 font-semibold text-[#166534]">
                          {r.disease_name || "General Health"}
                        </td>
                        <td className="py-3 px-3 text-gray-500 max-w-xs truncate">
                          {r.recommendation || "Pending guidance"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                              r.status === "Completed" || r.status === "Resolved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {r.status === "Completed" ? "Resolved" : r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-4">No records found for the period.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
