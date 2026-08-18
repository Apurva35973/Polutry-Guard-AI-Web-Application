import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  HeartPulse,
  RefreshCcw,
  Stethoscope,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import DashboardCard from "../../components/admin/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { getVeterinarianDashboard } from "../../services/vetService";

function formatTimestamp(value) {
  if (!value) return "Recent";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

export default function VetDashboard() {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: false,
  });

  const load = async () => {
    setState({ loading: true, data: null, error: false });
    try {
      const result = await getVeterinarianDashboard();
      if (result.status !== "success") throw new Error();
      setState({ loading: false, data: result.data, error: false });
    } catch {
      setState({ loading: false, data: null, error: true });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
        <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
        <h3 className="text-lg font-bold text-gray-900">
          Unable to Load Veterinary Overview
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Please verify network connectivity and try again.
        </p>
        <button onClick={load} className="btn mt-4 inline-flex">
          <RefreshCcw size={16} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  const { vet = {}, summary = {}, recent_cases: cases = [] } = state.data;

  const cardData = [
    {
      title: "Pending Consultations",
      value: summary.Pending ?? 0,
      icon: ClipboardCheck,
      color: "orange",
      subtitle: "Awaiting clinical review",
    },
    {
      title: "Active Cases",
      value: summary.Active ?? (summary.Pending ? summary.Pending : 0),
      icon: HeartPulse,
      color: "red",
      subtitle: "Ongoing disease management",
    },
    {
      title: "Resolved Cases",
      value: summary.Completed ?? 0,
      icon: CheckCircle2,
      color: "green",
      subtitle: "Successfully treated",
    },
    {
      title: "Recent Case Activity",
      value: cases.length,
      icon: Users,
      color: "blue",
      subtitle: "Assigned farmer interactions",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Veterinary Telemedicine
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Dr. {vet.full_name || "Specialist"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Clinical Health & Consultation Desk
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {vet.specialization || "Poultry Health Specialist"} · {vet.hospital_clinic || "Regional Veterinary Center"}
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardData.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </div>

      {/* ── Recent Consultation Cases Table / Cards ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-6">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Stethoscope className="text-[#166534]" size={20} />
              Recent Consultation Cases
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Assigned farmer clinical inquiries and diagnostic review requests
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {cases.length} Total Records
          </span>
        </div>

        {cases.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-extrabold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Farmer / Owner</th>
                  <th className="py-3 px-4">Farm Details</th>
                  <th className="py-3 px-4">Disease / Symptoms</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {cases.map((item) => (
                  <tr
                    key={item.consultation_id || item.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-[#166534] flex items-center justify-center font-extrabold text-xs">
                          {item.farmer_name?.[0] || "F"}
                        </div>
                        <span>{item.farmer_name || "Unknown Farmer"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700 font-medium">
                      {item.farm_name || "Poultry Farm"}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                        <HeartPulse size={13} className="text-red-500" />
                        {item.disease_name || "General Consultation"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500 font-medium">
                      {formatTimestamp(item.created_at || item.date)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={item.status || "PENDING"}
                        label={item.status || "Pending"}
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#166534] hover:text-[#14532d] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                      >
                        <span>View Details</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="No assigned consultation cases"
            description="There are currently no consultation cases assigned to you."
          />
        )}
      </section>
    </div>
  );
}
