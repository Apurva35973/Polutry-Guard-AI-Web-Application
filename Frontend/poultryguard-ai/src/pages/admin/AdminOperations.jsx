import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  assignHardwareKit, getAssignmentHistory, getAssignmentRequests,
  getAvailableHardwareKits, getHardwareKits, getPeopleFarmers,
  getPeopleVeterinarians, getSupportTickets, replaceHardwareKit,
  updateSupportTicket,
} from "../../services/adminService";

const badge = (value) => {
  const colors = {
    Online: "bg-green-100 text-green-700", Offline: "bg-red-100 text-red-700",
    Available: "bg-blue-100 text-blue-700", Assigned: "bg-amber-100 text-amber-700",
    Maintenance: "bg-orange-100 text-orange-700", Faulty: "bg-red-100 text-red-700",
    Resolved: "bg-green-100 text-green-700", Open: "bg-orange-100 text-orange-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[value] || "bg-slate-100 text-slate-700"}`}>{value || "—"}</span>;
};

function AssignmentModal({ kits, farmers, selected, onClose, onSubmit, replacement }) {
  const [kitId, setKitId] = useState("");
  const [farmerId, setFarmerId] = useState(selected?.farmer_id || "");
  const [reason, setReason] = useState("");
  const kit = kits.find((item) => String(item.hardware_kit_id) === String(kitId));
  const submit = () => {
    if (!kitId || !farmerId || (replacement && !reason.trim())) return toast.warn("Select a kit and farmer; a replacement reason is required.");
    onSubmit({ hardware_kit_id: kitId, farmer_id: farmerId, request_id: selected?.request_id,
      ...(replacement ? { current_hardware_kit_id: selected.hardware_kit_id, reason } : {}) });
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
    <h2 className="text-lg font-extrabold text-slate-900">{replacement ? "Replace Hardware Node" : "Assign Hardware Kit"}</h2>
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-semibold">Available hardware kit<select className="mt-1 w-full rounded-xl border p-3" value={kitId} onChange={(e) => setKitId(e.target.value)}><option value="">Select a kit</option>{kits.map((item) => <option value={item.hardware_kit_id} key={item.hardware_kit_id}>{item.kit_code} · {item.esp32_device_id}</option>)}</select></label>
      {kit && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">PCB: {kit.pcb_serial_number || "—"} · Firmware: {kit.firmware_version || "—"}<br />Sensors: Temp {kit.temperature_sensor_serial || "—"}, Humidity {kit.humidity_sensor_serial || "—"}, NH3 {kit.ammonia_sensor_serial || "—"}, Mic {kit.microphone_sensor_serial || "—"}</div>}
      <label className="block text-sm font-semibold">Farmer / farm<select className="mt-1 w-full rounded-xl border p-3" value={farmerId} disabled={!!selected?.farmer_id} onChange={(e) => setFarmerId(e.target.value)}><option value="">Select farmer</option>{farmers.map((f) => <option value={f.farmer_id} key={f.farmer_id}>{f.full_name} · {f.farm_name}</option>)}</select></label>
      {replacement && <label className="block text-sm font-semibold">Replacement reason<textarea className="mt-1 w-full rounded-xl border p-3" value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
    </div><div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border px-4 py-2" onClick={onClose}>Cancel</button><button className="rounded-xl bg-[#166534] px-4 py-2 font-bold text-white" onClick={submit}>{replacement ? "Replace Node" : "Assign Hardware Kit"}</button></div>
  </div></div>;
}

export default function AdminOperations({ initialTab = "people" }) {
  const [tab, setTab] = useState(initialTab); const [peopleTab, setPeopleTab] = useState("farmers");
  const [farmers, setFarmers] = useState([]); const [vets, setVets] = useState([]); const [kits, setKits] = useState([]); const [available, setAvailable] = useState([]); const [requests, setRequests] = useState([]); const [tickets, setTickets] = useState([]); const [history, setHistory] = useState([]); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [modal, setModal] = useState(null);
  const load = useCallback(async () => { try { const [f, v, k, a, r, t, h] = await Promise.all([getPeopleFarmers({ search, status }), getPeopleVeterinarians(), getHardwareKits(), getAvailableHardwareKits(), getAssignmentRequests(), getSupportTickets(), getAssignmentHistory()]); setFarmers(f.data?.items || []); setVets(v.data || []); setKits(k.data || []); setAvailable(a.data || []); setRequests(r.data || []); setTickets(t.data || []); setHistory(h.data || []); } catch { toast.error("Unable to load Superintendent data."); } }, [search, status]);
  // Defer the initial/filtered fetch so the effect only subscribes to query changes.
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer);
  }, [load]);
  const submitAssignment = async (payload) => { try { if (modal?.replacement) await replaceHardwareKit(payload); else await assignHardwareKit(payload); toast.success("Hardware kit assignment saved."); setModal(null); load(); } catch (e) { toast.error(e.response?.data?.error || "Assignment failed."); } };
  const updateTicket = async (id, value) => { try { await updateSupportTicket(id, { status: value }); load(); } catch { toast.error("Ticket update failed."); } };
  const tabs = [["people", "People"], ["hardware", "Hardware Kits"], ["support", "Support Center"], ["history", "Assignment History"]];
  return <div className="space-y-5"><div><h1 className="text-2xl font-extrabold text-slate-900">Superintendent Console</h1><p className="text-sm text-slate-500">People, field hardware, assignments, and support monitoring.</p></div><div className="flex gap-2 overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? "bg-[#166534] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{label}</button>)}</div>
    {tab === "people" && <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap gap-3"><button className="font-bold" onClick={() => setPeopleTab("farmers")}>Farmers</button><button className="font-bold" onClick={() => setPeopleTab("vets")}>Veterinarians</button>{peopleTab === "farmers" && <><input className="ml-auto rounded-xl border px-3 py-2" placeholder="Search farmer, farm, device..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="rounded-xl border px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All devices</option><option>Online</option><option>Offline</option><option>Available</option></select></>}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">{(peopleTab === "farmers" ? ["Farmer", "Farm", "Device", "Status", "Last active"] : ["Veterinarian", "Specialization", "Clinic", "Status", "Contact"]).map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{(peopleTab === "farmers" ? farmers : vets).map((x) => peopleTab === "farmers" ? <tr className="border-b" key={x.farmer_id}><td className="p-3 font-semibold">{x.full_name}</td><td>{x.farm_name}</td><td>{x.esp32_device_id || "Unassigned"}</td><td>{badge(x.device_status)}</td><td>{x.last_seen_at ? new Date(x.last_seen_at).toLocaleString() : "Never"}</td></tr> : <tr className="border-b" key={x.vet_id}><td className="p-3 font-semibold">{x.full_name}</td><td>{x.specialization || "—"}</td><td>{x.hospital_clinic || "—"}</td><td>{badge(x.status)}</td><td>{x.phone_number || x.email}</td></tr>)}</tbody></table></div></section>}
    {tab === "hardware" && <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-4 flex justify-between"><h2 className="font-extrabold">Hardware inventory</h2><button className="rounded-xl bg-[#166534] px-4 py-2 text-sm font-bold text-white" onClick={() => setModal({})}>Assign kit</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">{["Kit", "ESP32 / PCB", "Firmware", "Status", "Farmer / Farm", "Last communication", "Actions"].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{kits.map(k => <tr className="border-b" key={k.hardware_kit_id}><td className="p-3 font-semibold">{k.kit_code}</td><td>{k.esp32_device_id}<br /><small>{k.pcb_serial_number || "—"}</small></td><td>{k.firmware_version || "—"}</td><td>{badge(k.device_status)}</td><td>{k.assigned_farmer || "—"}<br /><small>{k.farm_name || ""}</small></td><td>{k.last_seen_at ? new Date(k.last_seen_at).toLocaleString() : "Never"}</td><td>{k.assigned_farmer_id && <button className="rounded-lg border px-2 py-1 text-xs font-bold" onClick={() => setModal({ replacement: true, hardware_kit_id: k.hardware_kit_id, farmer_id: k.assigned_farmer_id })}>Replace node</button>}</td></tr>)}</tbody></table></div><div className="mt-6"><h3 className="mb-2 font-bold">Pending hardware requests</h3>{requests.filter(r => r.status === "Pending").map(r => <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm" key={r.request_id}><span>{r.farmer_name} · {r.reason}</span><button className="font-bold text-[#166534]" onClick={() => setModal(r)}>Assign device</button></div>) || "No pending assignment requests."}</div></section>}
    {tab === "support" && <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">{["Ticket", "Farmer", "Category", "Issue", "Device", "Priority", "Status"].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{tickets.map(t => <tr className="border-b" key={t.ticket_id}><td className="p-3">#{t.ticket_id}</td><td>{t.farmer_name || "—"}</td><td>{t.category}</td><td>{t.issue}</td><td>{t.esp32_device_id || "—"}</td><td>{t.priority}</td><td><select value={t.status} onChange={e => updateTicket(t.ticket_id, e.target.value)}>{["Open", "In Progress", "Resolved", "Rejected"].map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div></section>}
    {tab === "history" && <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">{["Kit", "Device", "Farmer", "Assigned by", "Assigned at", "Status", "Reason"].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{history.map(x => <tr className="border-b" key={x.assignment_id}><td className="p-3">{x.kit_code}</td><td>{x.esp32_device_id}</td><td>{x.farmer_name}</td><td>{x.assigned_by}</td><td>{new Date(x.assigned_at).toLocaleString()}</td><td>{badge(x.status)}</td><td>{x.replacement_reason || "—"}</td></tr>)}</tbody></table></div></section>}
    {modal && <AssignmentModal kits={available} farmers={farmers} selected={modal} replacement={modal.replacement} onClose={() => setModal(null)} onSubmit={submitAssignment} />}
  </div>;
}
