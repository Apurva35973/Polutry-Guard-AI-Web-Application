import { useCallback, useEffect, useState } from "react";
import {
  PackageCheck,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wifi,
  Plus,
  X,
  Cpu,
  Hash,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getAssignmentRequests,
  updateAssignmentRequestStatus,
  getAvailableHardwareKits,
  assignHardwareKit,
  createHardwareKit,
} from "../../services/adminService";

const statusBadge = (status) => {
  const colors = {
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Approved: "bg-blue-100 text-blue-700 border-blue-200",
    Assigned: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const icons = {
    Pending: <Clock size={11} />,
    Approved: <CheckCircle2 size={11} />,
    Assigned: <PackageCheck size={11} />,
    Rejected: <XCircle size={11} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        colors[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {icons[status]}
      {status}
    </span>
  );
};

// ─── Quick-Create Kit Modal ──────────────────────────────────────────────────
const EMPTY_KIT = {
  kit_code: "",
  esp32_device_id: "",
  esp8266_device_id: "",
  thingspeak_channel_id: "",
  thingspeak_read_api_key: "",
  thingspeak_write_api_key: "",
  firmware_version: "v2.4.0",
};

function KitField({ label, id, value, onChange, placeholder, required, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#166534] focus:outline-none focus:ring-2 focus:ring-[#166534]/20"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function CreateKitModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_KIT);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const kitCode = form.kit_code.trim().toUpperCase();
    if (!kitCode) return toast.warn("Kit Code is required.");
    setSaving(true);
    try {
      const res = await createHardwareKit({ ...form, kit_code: kitCode });
      if (res.status === "success") {
        toast.success(`Hardware kit "${kitCode}" created successfully!`);
        onCreated();
        onClose();
      } else {
        toast.error(res.error || "Failed to create hardware kit.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create hardware kit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#166534]/10 p-2">
              <Cpu size={18} className="text-[#166534]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Create Hardware Kit</h2>
              <p className="text-xs text-slate-400">Add a new kit to the inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <KitField
            label="Kit Code"
            id="kit_code"
            value={form.kit_code}
            onChange={set("kit_code")}
            placeholder="e.g. KIT-001"
            required
            hint="Unique identifier for this hardware kit"
          />

          <div className="grid grid-cols-2 gap-3">
            <KitField
              label="ESP32 Device ID"
              id="esp32_device_id"
              value={form.esp32_device_id}
              onChange={set("esp32_device_id")}
              placeholder="e.g. ESP32-001"
              hint="Leave blank to auto-generate"
            />
            <KitField
              label="ESP8266 Device ID"
              id="esp8266_device_id"
              value={form.esp8266_device_id}
              onChange={set("esp8266_device_id")}
              placeholder="e.g. ESP8266-001"
              hint="Leave blank to auto-generate"
            />
          </div>

          {/* ThingSpeak section */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={14} className="text-[#166534]" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">ThingSpeak (Optional)</span>
            </div>
            <KitField
              label="Channel ID"
              id="ts_channel_id"
              value={form.thingspeak_channel_id}
              onChange={set("thingspeak_channel_id")}
              placeholder="e.g. 2993408"
            />
            <div className="grid grid-cols-2 gap-3">
              <KitField
                label="Read API Key"
                id="ts_read_key"
                value={form.thingspeak_read_api_key}
                onChange={set("thingspeak_read_api_key")}
                placeholder="Read key"
              />
              <KitField
                label="Write API Key"
                id="ts_write_key"
                value={form.thingspeak_write_api_key}
                onChange={set("thingspeak_write_api_key")}
                placeholder="Write key"
              />
            </div>
          </div>

          <KitField
            label="Firmware Version"
            id="firmware_version"
            value={form.firmware_version}
            onChange={set("firmware_version")}
            placeholder="v2.4.0"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#166534] px-5 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Creating..." : "Create Kit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HardwareRequests() {
  const [requests, setRequests] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [assignModal, setAssignModal] = useState(null);
  const [selectedKit, setSelectedKit] = useState("");
  const [processing, setProcessing] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([
        getAssignmentRequests(),
        getAvailableHardwareKits(),
      ]);
      if (rRes.status === "success") setRequests(rRes.data || []);
      if (aRes.status === "success") setAvailable(aRes.data || []);
    } catch {
      toast.error("Failed to load hardware requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusUpdate = async (requestId, status) => {
    setProcessing(true);
    try {
      const res = await updateAssignmentRequestStatus(requestId, status);
      if (res.status === "success") {
        toast.success(`Request ${status === "Approved" ? "approved" : "rejected"}.`);
        await load();
      } else {
        toast.error(res.error || "Status update failed.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update request status.");
    } finally {
      setProcessing(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedKit) return toast.warn("Please select a hardware kit.");
    if (!assignModal) return;
    setProcessing(true);
    try {
      const res = await assignHardwareKit({
        hardware_kit_id: selectedKit,
        farmer_id: assignModal.farmer_id,
        request_id: assignModal.request_id,
      });
      if (res.status === "success") {
        toast.success("Hardware kit assigned successfully.");
        setAssignModal(null);
        setSelectedKit("");
        await load();
      } else {
        toast.error(res.error || "Assignment failed.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Assignment failed.");
    } finally {
      setProcessing(false);
    }
  };

  const filters = ["All", "Pending", "Approved", "Assigned", "Rejected"];
  const filtered = filter === "All" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <PackageCheck size={24} className="text-[#166534]" />
            Hardware Assignment Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage farmer requests for IoT hardware kits.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
                {pendingCount} Pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#166534] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-800"
          >
            <Plus size={15} />
            New Kit
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Available Kits Banner */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
        <div className="rounded-lg bg-[#166534]/10 p-2">
          <Hash size={14} className="text-[#166534]" />
        </div>
        <span className="text-sm text-slate-600">
          <strong className="text-slate-900">{available.length}</strong> hardware kit
          {available.length !== 1 ? "s" : ""} currently available for assignment
        </span>
        {available.length === 0 && (
          <button
            onClick={() => setCreateModal(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800"
          >
            <Plus size={12} /> Create Kit
          </button>
        )}
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

      {/* Requests Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <RefreshCcw size={20} className="animate-spin mx-auto mb-2" />
            Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <PackageCheck size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No {filter !== "All" ? filter.toLowerCase() : ""} hardware requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-slate-500">
                  {["Farmer", "Reason", "Priority", "Wi-Fi", "Requested", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-xs uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.request_id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.farmer_name || "—"}</div>
                      <div className="text-xs text-slate-400">ID #{r.farmer_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {r.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.priority === "High" || r.priority === "Critical"
                            ? "bg-red-100 text-red-700"
                            : r.priority === "Medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.wifi_ssid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534]">
                          <Wifi size={11} /> Configured
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => setAssignModal(r)}
                              disabled={processing}
                              className="rounded-lg bg-[#166534] px-3 py-1 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
                            >
                              Assign Kit
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(r.request_id, "Rejected")}
                              disabled={processing}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "Approved" && (
                          <button
                            onClick={() => setAssignModal(r)}
                            disabled={processing}
                            className="rounded-lg bg-[#166534] px-3 py-1 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            Assign Kit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Kit Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">
              Assign Hardware Kit
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Farmer: <strong>{assignModal.farmer_name}</strong>
            </p>

            <label className="block text-sm font-semibold mb-2">
              Select Available Kit
              <select
                className="mt-1 w-full rounded-xl border p-3 text-sm"
                value={selectedKit}
                onChange={(e) => setSelectedKit(e.target.value)}
              >
                <option value="">Choose a kit...</option>
                {available.map((k) => (
                  <option key={k.hardware_kit_id} value={k.hardware_kit_id}>
                    {k.kit_code} — {k.esp32_device_id || k.esp8266_device_id || "No Device ID"}
                  </option>
                ))}
              </select>
            </label>

            {available.length === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2 mb-3">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  No available hardware kits.{" "}
                  <button
                    className="underline font-bold hover:text-amber-900"
                    onClick={() => { setAssignModal(null); setCreateModal(true); }}
                  >
                    Create a new kit
                  </button>{" "}
                  and return here to assign it.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                onClick={() => { setAssignModal(null); setSelectedKit(""); }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={processing || !selectedKit}
                className="rounded-xl bg-[#166534] px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {processing ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Kit Modal ── */}
      {createModal && (
        <CreateKitModal
          onClose={() => setCreateModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
