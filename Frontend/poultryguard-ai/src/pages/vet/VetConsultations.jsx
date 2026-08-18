import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  HeartPulse,
  RefreshCcw,
  Calendar,
  X,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import {
  getVetConsultations,
  updateVetConsultation,
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

export default function VetConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [statusVal, setStatusVal] = useState("Pending");
  const [saving, setSaving] = useState(false);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const res = await getVetConsultations();
      if (res.status === "success") {
        setConsultations(res.data || []);
      } else {
        toast.error(res.error || "Failed to load consultations");
      }
    } catch {
      toast.error("Unable to load clinical consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConsultations();
  }, []);

  const handleOpenConsultation = (item) => {
    setSelectedConsultation(item);
    setResponseNotes(item.recommendation || "");
    setStatusVal(item.status || "Pending");
    setModalOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedConsultation) return;
    setSaving(true);
    try {
      const res = await updateVetConsultation(selectedConsultation.consultation_id, {
        status: statusVal,
        recommendation: responseNotes,
      });
      if (res.status === "success") {
        toast.success("Consultation response saved successfully.");
        setModalOpen(false);
        void loadConsultations();
      } else {
        toast.error(res.error || "Failed to update consultation");
      }
    } catch {
      toast.error("Error saving consultation update.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = consultations.filter((item) => {
    const q = search.toLowerCase();
    return (
      !search ||
      (item.farmer_name || "").toLowerCase().includes(q) ||
      (item.farm_name || "").toLowerCase().includes(q) ||
      (item.disease_name || "").toLowerCase().includes(q) ||
      (item.subject || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <MessageSquare size={13} />
              Telemedicine Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Farmer Consultations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review incoming clinical inquiries, provide medical guidance, prescribe treatments, and resolve inquiries.
          </p>
        </div>

        <button
          onClick={loadConsultations}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Consultations</span>
        </button>
      </div>

      {/* ── Search & Metrics ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative min-w-[280px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by farmer, farm, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="bg-amber-50 text-amber-900 font-bold px-3 py-1.5 rounded-xl border border-amber-200">
            {consultations.filter((c) => c.status === "Pending").length} Pending Review
          </span>
          <span className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
            {consultations.filter((c) => c.status === "Completed" || c.status === "Resolved").length} Completed
          </span>
        </div>
      </div>

      {/* ── Consultations Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <MessageSquare className="text-[#166534]" size={20} />
            Consultation Inquiries
          </h2>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filtered.length} Total
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
            Loading consultations...
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-extrabold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-3 px-4 rounded-l-xl">ID</th>
                  <th className="py-3 px-4">Farmer / Farm</th>
                  <th className="py-3 px-4">Subject / Disease</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filtered.map((item) => (
                  <tr
                    key={item.consultation_id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-gray-900 text-xs">
                      #{item.consultation_id}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{item.farmer_name}</p>
                      <p className="text-xs text-gray-500 font-medium">{item.farm_name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                        <HeartPulse size={13} className="text-red-500" />
                        {item.disease_name || item.subject || "Clinical Inquiry"}
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
                        onClick={() => handleOpenConsultation(item)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#166534] hover:text-[#14532d] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                      >
                        <Eye size={13} />
                        <span>Open & Respond</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No consultations found"
            description="There are currently no open consultation requests."
          />
        )}
      </div>

      {/* ── Consultation Response Modal ── */}
      {modalOpen && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 sm:p-8 animate-fade-in relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Consultation #{selectedConsultation.consultation_id}
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">
                {selectedConsultation.disease_name || selectedConsultation.subject || "Clinical Inquiry"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Farmer: <b>{selectedConsultation.farmer_name}</b> · Farm: <b>{selectedConsultation.farm_name}</b>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Consultation Status
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="input"
                >
                  <option value="Pending">Pending Review</option>
                  <option value="Active">Active (In Treatment)</option>
                  <option value="Completed">Resolved / Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Veterinarian Clinical Guidance & Prescription Advice
                <textarea
                  rows={5}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Enter medical instructions, dosage recommendations, disinfectant guidelines, or follow-up schedule..."
                  className="input resize-none"
                />
              </label>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveResponse}
                  disabled={saving}
                  className="btn text-xs"
                >
                  <Send size={15} />
                  <span>{saving ? "Saving Response..." : "Send Guidance & Update"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
