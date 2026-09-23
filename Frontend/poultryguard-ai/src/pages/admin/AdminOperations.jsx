import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  assignHardwareKit,
  getAssignmentHistory,
  getAssignmentRequests,
  getAvailableHardwareKits,
  getHardwareKits,
  getPeopleFarmers,
  getPeopleVeterinarians,
  getSupportTickets,
  replaceHardwareKit,
  updateSupportTicket,
  configureHardwareThingSpeak,
  testHardwareThingSpeak,
  getHardwareThingSpeakStatus,
} from "../../services/adminService";

const badge = (value) => {
  const colors = {
    Online: "bg-green-100 text-green-700",
    Offline: "bg-red-100 text-red-700",
    Available: "bg-blue-100 text-blue-700",
    Assigned: "bg-amber-100 text-amber-700",
    Maintenance: "bg-orange-100 text-orange-700",
    Faulty: "bg-red-100 text-red-700",
    Resolved: "bg-green-100 text-green-700",
    Open: "bg-orange-100 text-orange-700",
    Configured: "bg-emerald-100 text-emerald-700",
    "Not Set": "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        colors[value] || "bg-slate-100 text-slate-700"
      }`}
    >
      {value || "—"}
    </span>
  );
};

function AssignmentModal({ kits, farmers, selected, onClose, onSubmit, replacement }) {
  const [kitId, setKitId] = useState("");
  const [farmerId, setFarmerId] = useState(selected?.farmer_id || "");
  const [reason, setReason] = useState("");
  const [thingspeakChannelId, setThingspeakChannelId] = useState("");
  const [thingspeakReadKey, setThingspeakReadKey] = useState("");
  const [thingspeakWriteKey, setThingspeakWriteKey] = useState("");
  const [esp8266DeviceId, setEsp8266DeviceId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const kit = kits.find((item) => String(item.hardware_kit_id) === String(kitId));

  const testConnection = async () => {
    if (!thingspeakChannelId.trim()) {
      return toast.warn("Please enter a ThingSpeak Channel ID to test.");
    }
    if (!kitId) {
      return toast.warn("Please select a hardware kit first before testing the ThingSpeak connection.");
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testHardwareThingSpeak(kitId, {
        thingspeak_channel_id: thingspeakChannelId.trim(),
        thingspeak_read_api_key: thingspeakReadKey.trim() || undefined,
      });
      if (res.status === "success" && res.data?.success) {
        setTestResult({ ok: true, data: res.data });
        if (res.data.has_data) {
          toast.success(`Connected! Last Entry ID: ${res.data.last_entry_id ?? "None"}`);
        } else {
          toast.success(res.data.message || "Channel verified successfully! Awaiting first telemetry.");
        }
      } else {
        setTestResult({ ok: false, message: res.error || "Connection test failed." });
        toast.error(res.error || "Connection test failed.");
      }
    } catch (e) {
      const err = e.response?.data?.error || e.message || "Failed to reach ThingSpeak";
      setTestResult({ ok: false, message: err });
      toast.error(err);
    } finally {
      setTesting(false);
    }
  };

  const submit = () => {
    if (!kitId || !farmerId || (replacement && !reason.trim())) {
      return toast.warn("Select a kit and farmer; a replacement reason is required.");
    }
    onSubmit({
      hardware_kit_id: kitId,
      farmer_id: farmerId,
      request_id: selected?.request_id,
      thingspeak_channel_id: thingspeakChannelId.trim() || null,
      thingspeak_read_api_key: thingspeakReadKey.trim() || null,
      thingspeak_write_api_key: thingspeakWriteKey.trim() || null,
      esp8266_device_id: esp8266DeviceId.trim() || null,
      ...(replacement ? { current_hardware_kit_id: selected.hardware_kit_id, reason } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-slate-900">
          {replacement ? "Replace Hardware Node" : "Assign Hardware Kit"}
        </h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Available hardware kit
            <select
              className="mt-1 w-full rounded-xl border p-3"
              value={kitId}
              onChange={(e) => setKitId(e.target.value)}
            >
              <option value="">Select a kit</option>
              {kits.map((item) => (
                <option value={item.hardware_kit_id} key={item.hardware_kit_id}>
                  {item.kit_code} · {item.esp32_device_id}
                </option>
              ))}
            </select>
          </label>
          {kit && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              PCB: {kit.pcb_serial_number || "—"} · Firmware: {kit.firmware_version || "—"}
              <br />
              Sensors: Temp {kit.temperature_sensor_serial || "—"}, Humidity{" "}
              {kit.humidity_sensor_serial || "—"}, NH3 {kit.ammonia_sensor_serial || "—"}
            </div>
          )}
          <label className="block text-sm font-semibold">
            Farmer / farm
            <select
              className="mt-1 w-full rounded-xl border p-3"
              value={farmerId}
              disabled={!!selected?.farmer_id}
              onChange={(e) => setFarmerId(e.target.value)}
            >
              <option value="">Select farmer</option>
              {farmers.map((f) => (
                <option value={f.farmer_id} key={f.farmer_id}>
                  {f.full_name} · {f.farm_name}
                </option>
              ))}
            </select>
          </label>

          {/* IoT / ThingSpeak Channel Configuration */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#166534]">
              IoT Telemetry Configuration (ThingSpeak & ESP8266)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ESP8266 Device ID
              </label>
              <input
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                placeholder="e.g. ESP8266-NODE-01"
                value={esp8266DeviceId}
                onChange={(e) => setEsp8266DeviceId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  ThingSpeak Channel ID
                </label>
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 2418292"
                  value={thingspeakChannelId}
                  onChange={(e) => setThingspeakChannelId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Read API Key
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  placeholder="Read Key"
                  value={thingspeakReadKey}
                  onChange={(e) => setThingspeakReadKey(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Write API Key (Optional)
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                placeholder="Write Key"
                value={thingspeakWriteKey}
                onChange={(e) => setThingspeakWriteKey(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="text-xs font-bold text-[#166534] hover:underline"
              >
                {testing ? "Testing Ping..." : "🔍 Test Channel Connection"}
              </button>
              {testResult && (
                <span
                  className={`text-xs font-bold ${
                    testResult.ok ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {testResult.ok ? "✓ Connection Verified" : "✗ Verification Failed"}
                </span>
              )}
            </div>
          </div>

          {replacement && (
            <label className="block text-sm font-semibold">
              Replacement reason
              <textarea
                className="mt-1 w-full rounded-xl border p-3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl border px-4 py-2" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#166534] px-4 py-2 font-bold text-white"
            onClick={submit}
          >
            {replacement ? "Replace Node" : "Assign Hardware Kit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ThingSpeakConfigModal({ kit, onClose, onSaved }) {
  const [channelId, setChannelId] = useState(kit?.thingspeak_channel_id || "");
  const [readKey, setReadKey] = useState("");
  const [writeKey, setWriteKey] = useState("");
  const [esp8266Id, setEsp8266Id] = useState(kit?.esp8266_device_id || "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);

  useEffect(() => {
    if (kit?.hardware_kit_id) {
      getHardwareThingSpeakStatus(kit.hardware_kit_id)
        .then((res) => {
          if (res.status === "success" && res.data) {
            setStatusInfo(res.data);
            if (res.data.thingspeak_channel_id) setChannelId(res.data.thingspeak_channel_id);
            if (res.data.esp8266_device_id) setEsp8266Id(res.data.esp8266_device_id);
          }
        })
        .catch(() => {});
    }
  }, [kit]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testHardwareThingSpeak(kit.hardware_kit_id, {
        thingspeak_channel_id: channelId.trim() || undefined,
        thingspeak_read_api_key: readKey.trim() || undefined,
      });
      if (res.status === "success" && res.data?.success) {
        if (res.data.has_data) {
          toast.success(`Ping Successful! Last Entry: ${res.data.last_entry_id ?? "None"}`);
        } else {
          toast.success(res.data.message || "Channel verified successfully! Awaiting first telemetry.");
        }
      } else {
        toast.error(res.error || "Ping to ThingSpeak failed.");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await configureHardwareThingSpeak(kit.hardware_kit_id, {
        thingspeak_channel_id: channelId.trim() || null,
        thingspeak_read_api_key: readKey.trim() || null,
        thingspeak_write_api_key: writeKey.trim() || null,
        esp8266_device_id: esp8266Id.trim() || null,
      });
      toast.success("ThingSpeak IoT credentials updated.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update ThingSpeak configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">
          ThingSpeak IoT Setup: {kit?.kit_code}
        </h2>
        <p className="text-xs text-slate-500">
          Configure telemetry ingestion parameters for ESP8266 hardware transmission.
        </p>

        {statusInfo?.latest_telemetry?.success && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
            <p className="font-bold text-slate-700">Latest Live Telemetry:</p>
            <p className="mt-1 text-slate-600">
              Temp: {statusInfo.latest_telemetry.telemetry?.temperature ?? "—"} °C | Humidity:{" "}
              {statusInfo.latest_telemetry.telemetry?.humidity ?? "—"} % | Ammonia:{" "}
              {statusInfo.latest_telemetry.telemetry?.ammonia ?? "—"} ppm
            </p>
            <p className="text-slate-400 mt-1">
              Age: {statusInfo.latest_telemetry.age_seconds ?? "—"}s (
              {statusInfo.latest_telemetry.device_status})
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              ESP8266 Device ID
            </label>
            <input
              className="mt-1 w-full rounded-lg border p-2.5 text-sm"
              placeholder="e.g. ESP8266-PG-01"
              value={esp8266Id}
              onChange={(e) => setEsp8266Id(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              ThingSpeak Channel ID
            </label>
            <input
              className="mt-1 w-full rounded-lg border p-2.5 text-sm"
              placeholder="e.g. 2418292"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Read API Key {statusInfo?.thingspeak_read_api_key_masked && `(${statusInfo.thingspeak_read_api_key_masked})`}
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border p-2.5 text-sm"
              placeholder="New Read Key (leave blank to keep current)"
              value={readKey}
              onChange={(e) => setReadKey(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Write API Key {statusInfo?.thingspeak_write_api_key_masked && `(${statusInfo.thingspeak_write_api_key_masked})`}
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border p-2.5 text-sm"
              placeholder="New Write Key (leave blank to keep current)"
              value={writeKey}
              onChange={(e) => setWriteKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="text-xs font-bold text-[#166534] hover:underline"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <div className="flex gap-2">
            <button className="rounded-xl border px-3 py-1.5 text-xs font-semibold" onClick={onClose}>
              Cancel
            </button>
            <button
              className="rounded-xl bg-[#166534] px-4 py-1.5 text-xs font-bold text-white"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOperations({ initialTab = "people" }) {
  const [tab, setTab] = useState(initialTab);
  const [peopleTab, setPeopleTab] = useState("farmers");
  const [farmers, setFarmers] = useState([]);
  const [vets, setVets] = useState([]);
  const [kits, setKits] = useState([]);
  const [available, setAvailable] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const [configModalKit, setConfigModalKit] = useState(null);

  const load = useCallback(async () => {
    try {
      const [f, v, k, a, r, t, h] = await Promise.all([
        getPeopleFarmers({ search, status }),
        getPeopleVeterinarians(),
        getHardwareKits(),
        getAvailableHardwareKits(),
        getAssignmentRequests(),
        getSupportTickets(),
        getAssignmentHistory(),
      ]);
      setFarmers(f.data?.items || []);
      setVets(v.data || []);
      setKits(k.data || []);
      setAvailable(a.data || []);
      setRequests(r.data || []);
      setTickets(t.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Unable to load Superintendent data.");
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submitAssignment = async (payload) => {
    try {
      if (modal?.replacement) await replaceHardwareKit(payload);
      else await assignHardwareKit(payload);
      toast.success("Hardware kit assignment saved.");
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Assignment failed.");
    }
  };

  const updateTicket = async (id, value) => {
    try {
      await updateSupportTicket(id, { status: value });
      load();
    } catch {
      toast.error("Ticket update failed.");
    }
  };

  const pingKit = async (kitId) => {
    try {
      const res = await testHardwareThingSpeak(kitId);
      if (res.status === "success" && res.data?.success) {
        if (res.data.has_data) {
          toast.success(`Kit #${kitId} connected! Last Entry: ${res.data.last_entry_id ?? "None"}`);
        } else {
          toast.success(res.data.message || `Kit #${kitId} channel verified! Awaiting first telemetry.`);
        }
      } else {
        toast.warn(res.error || "Channel ping failed or not configured.");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Ping test failed.");
    }
  };

  const tabs = [
    ["people", "People"],
    ["hardware", "Hardware Kits"],
    ["support", "Support Center"],
    ["history", "Assignment History"],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Superintendent Console</h1>
        <p className="text-sm text-slate-500">
          People, field hardware, assignments, and support monitoring.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${
              tab === id
                ? "bg-[#166534] text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "people" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-3">
            <button className="font-bold" onClick={() => setPeopleTab("farmers")}>
              Farmers
            </button>
            <button className="font-bold" onClick={() => setPeopleTab("vets")}>
              Veterinarians
            </button>
            {peopleTab === "farmers" && (
              <>
                <input
                  className="ml-auto rounded-xl border px-3 py-2"
                  placeholder="Search farmer, farm, device..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="rounded-xl border px-3"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All devices</option>
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Available</option>
                </select>
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  {(peopleTab === "farmers"
                    ? ["Farmer", "Farm", "Device", "Status", "Last active"]
                    : ["Veterinarian", "Specialization", "Clinic", "Status", "Contact"]
                  ).map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(peopleTab === "farmers" ? farmers : vets).map((x) =>
                  peopleTab === "farmers" ? (
                    <tr className="border-b" key={x.farmer_id}>
                      <td className="p-3 font-semibold">{x.full_name}</td>
                      <td>{x.farm_name}</td>
                      <td>{x.esp32_device_id || "Unassigned"}</td>
                      <td>{badge(x.device_status)}</td>
                      <td>
                        {x.last_seen_at ? new Date(x.last_seen_at).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b" key={x.vet_id}>
                      <td className="p-3 font-semibold">{x.full_name}</td>
                      <td>{x.specialization || "—"}</td>
                      <td>{x.hospital_clinic || "—"}</td>
                      <td>{badge(x.status)}</td>
                      <td>{x.phone_number || x.email}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "hardware" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex justify-between">
            <h2 className="font-extrabold">Hardware inventory</h2>
            <button
              className="rounded-xl bg-[#166534] px-4 py-2 text-sm font-bold text-white"
              onClick={() => setModal({})}
            >
              Assign kit
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  {[
                    "Kit",
                    "ESP8266 / ESP32",
                    "ThingSpeak Channel",
                    "Firmware",
                    "Status",
                    "Farmer / Farm",
                    "Last Telemetry",
                    "Actions",
                  ].map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kits.map((k) => (
                  <tr className="border-b" key={k.hardware_kit_id}>
                    <td className="p-3 font-semibold">{k.kit_code}</td>
                    <td>
                      <span className="font-semibold">{k.esp8266_device_id || "ESP8266"}</span>
                      <br />
                      <small className="text-slate-400">{k.esp32_device_id || "—"}</small>
                    </td>
                    <td>
                      {k.thingspeak_channel_id ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            #{k.thingspeak_channel_id}
                          </span>
                          <br />
                          {badge("Configured")}
                        </div>
                      ) : (
                        badge("Not Set")
                      )}
                    </td>
                    <td>{k.firmware_version || "—"}</td>
                    <td>{badge(k.device_status)}</td>
                    <td>
                      {k.assigned_farmer || "—"}
                      <br />
                      <small className="text-slate-400">{k.farm_name || ""}</small>
                    </td>
                    <td>
                      {k.last_telemetry_at
                        ? new Date(k.last_telemetry_at).toLocaleString()
                        : k.last_seen_at
                        ? new Date(k.last_seen_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                        onClick={() => setConfigModalKit(k)}
                        title="Configure ThingSpeak IoT credentials"
                      >
                        IoT Setup
                      </button>
                      {k.thingspeak_channel_id && (
                        <button
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                          onClick={() => pingKit(k.hardware_kit_id)}
                          title="Ping ThingSpeak channel"
                        >
                          Ping
                        </button>
                      )}
                      {k.assigned_farmer_id && (
                        <button
                          className="rounded-lg border px-2 py-1 text-xs font-bold"
                          onClick={() =>
                            setModal({
                              replacement: true,
                              hardware_kit_id: k.hardware_kit_id,
                              farmer_id: k.assigned_farmer_id,
                            })
                          }
                        >
                          Replace
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 font-bold">Pending hardware requests</h3>
            {requests.filter((r) => r.status === "Pending").map((r) => (
              <div
                className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                key={r.request_id}
              >
                <span>
                  {r.farmer_name} · {r.reason}
                </span>
                <button className="font-bold text-[#166534]" onClick={() => setModal(r)}>
                  Assign device
                </button>
              </div>
            )) || "No pending assignment requests."}
          </div>
        </section>
      )}

      {tab === "support" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  {["Ticket", "Farmer", "Category", "Issue", "Device", "Priority", "Status"].map(
                    (x) => (
                      <th className="p-3" key={x}>
                        {x}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr className="border-b" key={t.ticket_id}>
                    <td className="p-3">#{t.ticket_id}</td>
                    <td>{t.farmer_name || "—"}</td>
                    <td>{t.category}</td>
                    <td>{t.issue}</td>
                    <td>{t.esp32_device_id || "—"}</td>
                    <td>{t.priority}</td>
                    <td>
                      <select
                        value={t.status}
                        onChange={(e) => updateTicket(t.ticket_id, e.target.value)}
                      >
                        {["Open", "In Progress", "Resolved", "Rejected"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "history" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  {[
                    "Kit",
                    "Device",
                    "Farmer",
                    "Assigned by",
                    "Assigned at",
                    "Status",
                    "Reason",
                  ].map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((x) => (
                  <tr className="border-b" key={x.assignment_id}>
                    <td className="p-3">{x.kit_code}</td>
                    <td>{x.esp32_device_id}</td>
                    <td>{x.farmer_name}</td>
                    <td>{x.assigned_by}</td>
                    <td>{new Date(x.assigned_at).toLocaleString()}</td>
                    <td>{badge(x.status)}</td>
                    <td>{x.replacement_reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal && (
        <AssignmentModal
          kits={available}
          farmers={farmers}
          selected={modal}
          replacement={modal.replacement}
          onClose={() => setModal(null)}
          onSubmit={submitAssignment}
        />
      )}

      {configModalKit && (
        <ThingSpeakConfigModal
          kit={configModalKit}
          onClose={() => setConfigModalKit(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
