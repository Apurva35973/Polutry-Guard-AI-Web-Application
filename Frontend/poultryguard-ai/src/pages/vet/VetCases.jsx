import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  HeartPulse,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  RefreshCcw,
  Building,
  Phone,
  MapPin,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import {
  getVetCases,
  getVetCaseDetails,
  updateVetCase,
  createVetCase,
} from "../../services/vetService";

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

export default function VetCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [recommendationText, setRecommendationText] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await getVetCases({ status: statusFilter });
      if (res.status === "success") {
        setCases(res.data || []);
      } else {
        toast.error(res.error || "Failed to load cases");
      }
    } catch {
      toast.error("Unable to load veterinary cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [statusFilter]);

  const handleOpenCase = async (caseId) => {
    setCaseModalOpen(true);
    setCaseDetailLoading(true);
    try {
      const res = await getVetCaseDetails(caseId);
      if (res.status === "success") {
        setSelectedCase(res.data);
        setRecommendationText(res.data?.case?.recommendation || "");
        setStatusUpdate(res.data?.case?.status || "Pending");
      } else {
        toast.error(res.error || "Unable to load case details");
      }
    } catch {
      toast.error("Failed to fetch case details.");
    } finally {
      setCaseDetailLoading(false);
    }
  };

  const handleSaveCaseUpdate = async () => {
    if (!selectedCase?.case?.consultation_id) return;
    setSavingAction(true);
    try {
      const res = await updateVetCase(selectedCase.case.consultation_id, {
        status: statusUpdate,
        recommendation: recommendationText,
      });
      if (res.status === "success") {
        toast.success("Case updated successfully.");
        setCaseModalOpen(false);
        void loadCases();
      } else {
        toast.error(res.error || "Failed to update case.");
      }
    } catch {
      toast.error("Unable to save case changes.");
    } finally {
      setSavingAction(false);
    }
  };

  const filteredCases = cases.filter((item) => {
    const q = search.toLowerCase();
    return (
      !search ||
      (item.farmer_name || "").toLowerCase().includes(q) ||
      (item.farm_name || "").toLowerCase().includes(q) ||
      (item.disease_name || "").toLowerCase().includes(q) ||
      String(item.case_id || "").includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <ClipboardList size={13} />
              Clinical Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Veterinary Case Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review active flock consultations, update diagnoses, and provide clinical recommendations.
          </p>
        </div>

        <button
          onClick={loadCases}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Cases</span>
        </button>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {["All", "Pending", "Active", "Completed", "Cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab
                  ? "bg-[#166534] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {tab === "Completed" ? "Resolved" : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by farmer, farm, or disease..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>
      </div>

      {/* ── Cases Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <ClipboardList className="text-[#166534]" size={20} />
            Assigned Clinical Cases
          </h2>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filteredCases.length} Records
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
            Loading veterinary case records...
          </div>
        ) : filteredCases.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-extrabold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Case ID</th>
                  <th className="py-3 px-4">Farmer / Farm</th>
                  <th className="py-3 px-4">Disease / Issue</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredCases.map((item) => (
                  <tr
                    key={item.case_id || item.consultation_id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-gray-900 text-xs">
                      #{item.case_id || item.consultation_id}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-gray-900">{item.farmer_name}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          {item.farm_name} · {item.farm_type || "Broiler"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                        <HeartPulse size={13} className="text-red-500" />
                        {item.disease_name || "General Health"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500 font-medium">
                      {formatTimestamp(item.consultation_date)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={item.status || "PENDING"}
                        label={item.status === "Completed" ? "Resolved" : item.status}
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenCase(item.case_id || item.consultation_id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#166534] hover:text-[#14532d] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                      >
                        <Eye size={13} />
                        <span>Manage Case</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No matching cases found"
            description="There are currently no cases matching the selected status or search filter."
          />
        )}
      </div>

      {/* ── Case Details & Management Modal ── */}
      {caseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 sm:p-8 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCaseModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            {caseDetailLoading ? (
              <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
                Loading detailed clinical case context...
              </div>
            ) : selectedCase ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Case #{selectedCase.case?.consultation_id}
                    </span>
                    <StatusBadge
                      status={selectedCase.case?.status || "PENDING"}
                      label={selectedCase.case?.status === "Completed" ? "Resolved" : selectedCase.case?.status}
                      size="sm"
                    />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {selectedCase.case?.disease_name || "Flock Health Case"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar size={13} />
                    Opened on {formatTimestamp(selectedCase.case?.consultation_date)}
                  </p>
                </div>

                {/* Farmer & Farm Info Card */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Farmer Name</span>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                      {selectedCase.case?.farmer_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Farm Details</span>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                      {selectedCase.case?.farm_name} ({selectedCase.case?.farm_type})
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Contact Phone</span>
                    <p className="font-bold text-gray-800 mt-0.5">
                      {selectedCase.case?.phone_number || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Flock Capacity</span>
                    <p className="font-bold text-gray-800 mt-0.5">
                      {selectedCase.case?.total_birds ? `${Number(selectedCase.case.total_birds).toLocaleString()} Birds` : "—"}
                    </p>
                  </div>
                </div>

                {/* Telemetry Snapshot if available */}
                {selectedCase.telemetry && (
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <p className="text-xs font-bold text-[#166534] uppercase tracking-wider mb-2">
                      Live Shed Environmental Snapshot
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-gray-500">Temp</span>
                        <p className="font-extrabold text-gray-900 text-sm">{selectedCase.telemetry.temperature}°C</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-gray-500">Humidity</span>
                        <p className="font-extrabold text-gray-900 text-sm">{selectedCase.telemetry.humidity}%</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-gray-500">Status</span>
                        <p className="font-extrabold text-[#166534] text-sm">{selectedCase.telemetry.status || "NORMAL"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manage / Update Status & Prescription */}
                <div className="space-y-4 border-t border-gray-200 pt-5">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Veterinary Diagnosis & Treatment Action
                  </h3>

                  <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                    Case Status
                    <select
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value)}
                      className="input"
                    >
                      <option value="Pending">Pending Review</option>
                      <option value="Active">Active (In Treatment)</option>
                      <option value="Completed">Resolved / Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                    Clinical Notes & Recommendations / Prescription
                    <textarea
                      rows={4}
                      value={recommendationText}
                      onChange={(e) => setRecommendationText(e.target.value)}
                      placeholder="Add veterinary diagnosis, medication instructions, dosage in drinking water, or biosecurity recommendations..."
                      className="input resize-none"
                    />
                  </label>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCaseModalOpen(false)}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCaseUpdate}
                      disabled={savingAction}
                      className="btn text-xs"
                    >
                      <CheckCircle2 size={15} />
                      <span>{savingAction ? "Saving..." : "Save Case Updates"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
