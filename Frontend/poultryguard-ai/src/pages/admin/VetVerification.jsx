import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  XCircle,
  FileText,
  User,
  Mail,
  Phone,
  Stethoscope,
  Award,
  Clock,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import { getVetApplications, verifyVetApplication } from "../../services/adminService";

const statusBadge = (status) => {
  const colors = {
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const icons = {
    Pending: <Clock size={12} />,
    Approved: <CheckCircle2 size={12} />,
    Rejected: <XCircle size={12} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        colors[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {icons[status]}
      {status || "Unknown"}
    </span>
  );
};

function VetDetailModal({ vet, onClose, onVerify }) {
  const [processing, setProcessing] = useState(false);

  const handleVerify = async (status) => {
    setProcessing(true);
    try {
      await onVerify(vet.vet_id, status);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const certFilename = vet.certificate_url
    ? vet.certificate_url.split("/").pop()
    : null;
  // Use the public (no-auth) endpoint so the browser can load it directly
  const certPreviewUrl = certFilename
    ? `http://localhost:5000/public/certificates/${certFilename}`
    : null;
  const isPdf = certFilename?.toLowerCase().endsWith(".pdf");
  const isImage = certFilename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2419] to-[#166534] px-6 py-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold">{vet.full_name}</h2>
              <p className="text-green-200 text-sm mt-0.5">
                {vet.specialization || "Avian Medicine & Poultry Health"}
              </p>
            </div>
            {statusBadge(vet.verification_status)}
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Mail, label: "Email", value: vet.email },
              { icon: Phone, label: "Phone", value: vet.phone_number || "—" },
              { icon: Award, label: "License No.", value: vet.license_number || "—" },
              { icon: Stethoscope, label: "Experience", value: vet.experience_years ? `${vet.experience_years} years` : "—" },
              { icon: User, label: "Clinic / Hospital", value: vet.hospital_clinic || "—" },
              { icon: Clock, label: "Applied On", value: vet.created_at ? new Date(vet.created_at).toLocaleDateString() : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-[#166534]" />
                  <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Certificate preview */}
          {certPreviewUrl ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#166534]" />
                  <span className="text-sm font-bold text-[#166534]">Veterinary Certificate</span>
                </div>
                <a
                  href={certPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800"
                >
                  <FileText size={12} />
                  Open Document
                </a>
              </div>
              {isImage ? (
                <img
                  src={certPreviewUrl}
                  alt="Vet Certificate"
                  className="w-full rounded-lg border border-emerald-200 max-h-64 object-contain bg-white"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling && (e.target.nextSibling.style.display = "block");
                  }}
                />
              ) : isPdf ? (
                <iframe
                  src={certPreviewUrl}
                  title="Vet Certificate PDF"
                  className="w-full rounded-lg border border-emerald-200 bg-white"
                  style={{ height: "300px" }}
                />
              ) : (
                <p className="text-xs text-emerald-700 italic">Preview not available. Click "Open Document" to view.</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle size={14} />
              No certificate uploaded with this application.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
          {vet.verification_status === "Pending" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleVerify("Rejected")}
                disabled={processing}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={15} />
                Reject
              </button>
              <button
                onClick={() => handleVerify("Approved")}
                disabled={processing}
                className="flex items-center gap-1.5 rounded-xl bg-[#166534] px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                <BadgeCheck size={15} />
                Approve
              </button>
            </div>
          )}
          {vet.verification_status === "Approved" && (
            <button
              onClick={() => handleVerify("Rejected")}
              disabled={processing}
              className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              <XCircle size={15} />
              Revoke Approval
            </button>
          )}
          {vet.verification_status === "Rejected" && (
            <button
              onClick={() => handleVerify("Approved")}
              disabled={processing}
              className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm font-bold text-[#166534] hover:bg-green-100"
            >
              <BadgeCheck size={15} />
              Re-Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VetVerification() {
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [selectedVet, setSelectedVet] = useState(null);

  const loadVets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVetApplications();
      if (res.status === "success") {
        setVets(res.data || []);
      } else {
        toast.error("Failed to load vet applications.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to load vet applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVets();
  }, [loadVets]);

  const handleVerify = async (vetId, status) => {
    try {
      const res = await verifyVetApplication(vetId, status);
      if (res.status === "success") {
        toast.success(
          `Veterinarian ${status === "Approved" ? "approved" : "rejected"} successfully.`
        );
        await loadVets();
      } else {
        toast.error(res.error || "Verification action failed.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update vet status.");
    }
  };

  const filters = ["All", "Pending", "Approved", "Rejected"];
  const filtered =
    filter === "All" ? vets : vets.filter((v) => v.verification_status === filter);

  const pendingCount = vets.filter((v) => v.verification_status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <BadgeCheck size={24} className="text-[#166534]" />
            Veterinarian Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve veterinarian registration applications.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
                {pendingCount} Pending
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadVets}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              filter === f
                ? "bg-[#166534] text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
            {f === "Pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-400 text-white text-xs font-black px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3 w-2/3" />
              <div className="h-3 bg-gray-100 rounded mb-2 w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center shadow-sm">
          <BadgeCheck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            No {filter !== "All" ? filter.toLowerCase() : ""} vet applications found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vet) => (
            <div
              key={vet.vet_id}
              className="group rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-green-200 transition-all cursor-pointer"
              onClick={() => setSelectedVet(vet)}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#166534] to-emerald-500 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                  {vet.full_name?.charAt(0)?.toUpperCase() || "V"}
                </div>
                {statusBadge(vet.verification_status)}
              </div>

              {/* Name & specialization */}
              <h3 className="font-bold text-slate-900 text-sm">{vet.full_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {vet.specialization || "Avian Medicine & Poultry Health"}
              </p>

              {/* Details */}
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Mail size={11} className="text-slate-400" />
                  <span className="truncate">{vet.email}</span>
                </div>
                {vet.license_number && (
                  <div className="flex items-center gap-1.5">
                    <Award size={11} className="text-slate-400" />
                    <span>License: {vet.license_number}</span>
                  </div>
                )}
                {vet.hospital_clinic && (
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="text-slate-400" />
                    <span className="truncate">{vet.hospital_clinic}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-400" />
                  <span>Applied: {vet.created_at ? new Date(vet.created_at).toLocaleDateString() : "—"}</span>
                </div>
              </div>

              {/* Certificate indicator */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    vet.certificate_url ? "text-[#166534]" : "text-amber-600"
                  }`}
                >
                  <FileText size={11} />
                  {vet.certificate_url ? "Certificate uploaded" : "No certificate"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVet && (
        <VetDetailModal
          vet={selectedVet}
          onClose={() => setSelectedVet(null)}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}
