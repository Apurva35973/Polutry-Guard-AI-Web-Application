import React, { useEffect, useState, useMemo } from "react";
import { Plus, Search, X, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { toast } from "react-toastify";
import VendorTable from "../../components/admin/VendorTable";
import { getAllVendors, addVendor, updateVendor, deleteVendor } from "../../services/adminService";

const EMPTY_FORM = {
  full_name: "", business_name: "", email: "", phone_number: "",
  password_hash: "", vendor_type: "Feed", address: "",
  latitude: "", longitude: "", status: "Active",
};
const PAGE_SIZE = 10;

function Modal({ title, onClose, onSubmit, children, submitLabel = "Save", loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#166534] to-[#22c55e] text-white text-sm font-bold hover:shadow-lg disabled:opacity-60">
            {loading ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, id, type = "text", value, onChange, required, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534]">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534]" placeholder={label} />
      )}
    </div>
  );
}

export default function ManageVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await getAllVendors();
      setVendors(res?.data || []);
    } catch { toast.error("Failed to load vendors"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter((v) =>
      v.full_name?.toLowerCase().includes(q) ||
      v.business_name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.vendor_type?.toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (v) => { setSelected(v); setForm({ ...EMPTY_FORM, ...v, password_hash: "" }); setModal("edit"); };
  const openDelete = (v) => { setSelected(v); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };
  const fc = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleAdd = async () => {
    if (!form.full_name || !form.email || !form.business_name) { toast.warn("Please fill required fields"); return; }
    try {
      setSubmitting(true);
      await addVendor(form);
      toast.success("Vendor added!");
      closeModal(); fetchVendors();
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to add vendor"); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    try {
      setSubmitting(true);
      await updateVendor(selected.vendor_id, form);
      toast.success("Vendor updated!");
      closeModal(); fetchVendors();
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to update vendor"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await deleteVendor(selected.vendor_id);
      toast.success("Vendor deleted");
      closeModal(); fetchVendors();
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to delete vendor"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Store className="text-purple-600" size={24} /> Manage Vendors
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} vendor{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        <button id="add-vendor-btn" onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 text-white text-sm font-bold hover:shadow-lg transition-all">
          <Plus size={15} /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input id="vendor-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search vendors..." className="w-full pl-10 pr-4 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 bg-gray-50" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <VendorTable vendors={paginated} loading={loading} onEdit={openEdit} onDelete={openDelete} />
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {modal === "add" && (
        <Modal title="Add New Vendor" onClose={closeModal} onSubmit={handleAdd} loading={submitting}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" id="av-name" value={form.full_name} onChange={fc("full_name")} required />
            <FormField label="Business Name" id="av-biz" value={form.business_name} onChange={fc("business_name")} required />
            <FormField label="Email" id="av-email" type="email" value={form.email} onChange={fc("email")} required />
            <FormField label="Phone Number" id="av-phone" value={form.phone_number} onChange={fc("phone_number")} />
            <FormField label="Password" id="av-pass" type="password" value={form.password_hash} onChange={fc("password_hash")} required />
            <FormField label="Vendor Type" id="av-type" value={form.vendor_type} onChange={fc("vendor_type")} options={["Feed", "Medicine", "Equipment", "Poultry", "Other"]} />
            <div className="sm:col-span-2">
              <FormField label="Address" id="av-addr" value={form.address} onChange={fc("address")} />
            </div>
            <FormField label="Latitude" id="av-lat" type="number" value={form.latitude} onChange={fc("latitude")} />
            <FormField label="Longitude" id="av-lng" type="number" value={form.longitude} onChange={fc("longitude")} />
          </div>
        </Modal>
      )}

      {modal === "edit" && (
        <Modal title="Edit Vendor" onClose={closeModal} onSubmit={handleEdit} loading={submitting} submitLabel="Update">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" id="ev-name" value={form.full_name} onChange={fc("full_name")} required />
            <FormField label="Business Name" id="ev-biz" value={form.business_name} onChange={fc("business_name")} required />
            <FormField label="Email" id="ev-email" type="email" value={form.email} onChange={fc("email")} required />
            <FormField label="Phone Number" id="ev-phone" value={form.phone_number} onChange={fc("phone_number")} />
            <FormField label="Vendor Type" id="ev-type" value={form.vendor_type} onChange={fc("vendor_type")} options={["Feed", "Medicine", "Equipment", "Poultry", "Other"]} />
            <div className="sm:col-span-2">
              <FormField label="Address" id="ev-addr" value={form.address} onChange={fc("address")} />
            </div>
            <FormField label="Status" id="ev-status" value={form.status} onChange={fc("status")} options={["Active", "Inactive"]} />
          </div>
        </Modal>
      )}

      {modal === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-2xl">🏪</div>
              <h3 className="font-bold text-gray-800 text-lg">Delete Vendor?</h3>
              <p className="text-gray-500 text-sm mt-2">Are you sure you want to delete <strong>{selected?.business_name || selected?.full_name}</strong>?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">{submitting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
