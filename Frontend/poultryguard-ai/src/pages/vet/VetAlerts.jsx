import React, { useEffect, useState } from "react";
import {
  Bell,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  RefreshCcw,
  Building,
  Calendar,
  Eye,
  X,
  HeartPulse,
} from "lucide-react";
import { toast } from "react-toastify";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import {
  getVetAlerts,
  updateVetAlert,
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

export default function VetAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await getVetAlerts({ severity: severityFilter });
      if (res.status === "success") {
        setAlerts(res.data || []);
      } else {
        toast.error(res.error || "Failed to load alerts");
      }
    } catch {
      toast.error("Unable to load veterinary alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, [severityFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      const res = await updateVetAlert(alertId, { status: "Acknowledged" });
      if (res.status === "success") {
        toast.success("Alert acknowledged successfully.");
        void loadAlerts();
      } else {
        toast.error(res.error || "Failed to acknowledge alert");
      }
    } catch {
      toast.error("Error acknowledging alert.");
    }
  };

  const handleOpenNotes = (alert) => {
    setSelectedAlert(alert);
    setClinicalNotes("");
    setNotesModalOpen(true);
  };

  const handleConvertToCase = async () => {
    if (!selectedAlert) return;
    setProcessing(true);
    try {
      const res = await createVetCase({
        farmer_id: selectedAlert.farmer_id,
        disease_name: selectedAlert.ai_disease || selectedAlert.category || "Biosecurity Alert Follow-up",
        recommendation: clinicalNotes || `Opened from alert #${selectedAlert.alert_id}: ${selectedAlert.title || selectedAlert.description}`,
      });
      if (res.status === "success") {
        await updateVetAlert(selectedAlert.alert_id, { status: "Acknowledged" });
        toast.success("Alert converted to a new veterinary case successfully.");
        setNotesModalOpen(false);
        void loadAlerts();
      } else {
        toast.error(res.error || "Failed to create consultation case");
      }
    } catch {
      toast.error("Error creating clinical case from alert.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    const q = search.toLowerCase();
    return (
      !search ||
      (item.farmer_name || "").toLowerCase().includes(q) ||
      (item.farm_name || "").toLowerCase().includes(q) ||
      (item.title || "").toLowerCase().includes(q) ||
      (item.ai_disease || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <Bell size={13} />
              Early Warning Radar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Disease & Biosecurity Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time notifications from AI image screening models and IoT sensor threshold anomalies across client farms.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {["All", "Critical", "High", "Medium", "Low"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                severityFilter === sev
                  ? "bg-[#166534] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {sev}
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
            placeholder="Search by farm, farmer, or disease..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>
      </div>

      {/* ── Alerts Grid / Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            Biosecurity Alert Feed
          </h2>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filteredAlerts.length} Active Records
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
            Scanning for active alerts...
          </div>
        ) : filteredAlerts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAlerts.map((item) => {
              const sev = (item.severity || "MEDIUM").toUpperCase();
              const isCrit = sev === "CRITICAL" || sev === "HIGH";

              return (
                <div
                  key={item.alert_id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCrit
                      ? "border-red-200 bg-red-50/40 hover:bg-red-50/70"
                      : "border-gray-200 bg-gray-50/60 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          sev === "CRITICAL"
                            ? "bg-red-600 text-white"
                            : sev === "HIGH"
                            ? "bg-orange-500 text-white"
                            : sev === "MEDIUM"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {sev}
                      </span>
                      <StatusBadge status={item.status || "UNREAD"} size="sm" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar size={12} />
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-gray-900 text-base mb-1">
                    {item.title || `${item.category} Alert`}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    {item.description || "Environmental or image screening detected an anomaly."}
                  </p>

                  {/* Context chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-gray-200 mb-4">
                    <div>
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Farm & Location</span>
                      <p className="font-bold text-gray-900 mt-0.5">{item.farm_name}</p>
                      <p className="text-gray-500 text-[11px]">{item.farmer_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase text-[10px]">AI Screening Indication</span>
                      <p className="font-bold text-gray-900 mt-0.5">{item.ai_disease}</p>
                      <p className="text-[#166534] font-bold text-[11px]">
                        {item.ai_confidence ? `${Number(item.ai_confidence).toFixed(1)}% Conf.` : "Detected"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200/60">
                    {item.status !== "Acknowledged" && item.status !== "Resolved" && (
                      <button
                        onClick={() => handleAcknowledge(item.alert_id)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <CheckCircle2 size={14} />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenNotes(item)}
                      className="btn text-xs py-1.5 px-3"
                    >
                      <Stethoscope size={14} />
                      <span>Convert to Case / Add Notes</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No active alerts found"
            description="All farms are currently operating within normal parameters."
          />
        )}
      </div>

      {/* ── Convert to Case / Add Clinical Notes Modal ── */}
      {notesModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 sm:p-8 animate-fade-in relative">
            <button
              onClick={() => setNotesModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Alert Action
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-2">
                Convert Alert to Clinical Consultation
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Farm: <b>{selectedAlert.farm_name}</b> ({selectedAlert.farmer_name})
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs mb-4">
              <p className="font-bold text-gray-800">{selectedAlert.title}</p>
              <p className="text-gray-600 mt-1">{selectedAlert.description}</p>
            </div>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700 mb-6">
              Initial Clinical Diagnosis / Recommendations
              <textarea
                rows={4}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Enter treatment advice, medicine, or isolation instructions..."
                className="input resize-none"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNotesModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToCase}
                disabled={processing}
                className="btn text-xs"
              >
                <Stethoscope size={15} />
                <span>{processing ? "Creating Case..." : "Create Consultation Case"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
