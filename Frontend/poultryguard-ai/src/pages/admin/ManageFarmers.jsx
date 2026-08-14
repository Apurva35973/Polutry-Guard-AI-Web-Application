import React, { useEffect, useState, useMemo } from "react";
import { Plus, Search, Download, X, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { toast } from "react-toastify";
import FarmerTable from "../../components/admin/FarmerTable";
import { getAllFarmers, addFarmer, updateFarmer, deleteFarmer } from "../../services/adminService";

const EMPTY_FORM = {
  full_name: "", email: "", phone_number: "", password_hash: "",
  farm_name: "", farm_type: "Broiler", address: "",
  latitude: "", longitude: "", total_birds: "", status: "Active",
};

const PAGE_SIZE = 10;

// ── Reusable Modal ────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSubmit, children, submitLabel = "Save", loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#166534] to-[#22c55e] text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
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
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534]"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534]"
          placeholder={label}
        />
      )}
    </div>
  );
}

export default function ManageFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // "add" | "edit" | "delete"
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const res = await getAllFarmers();
      setFarmers(res?.data || []);
    } catch {
      toast.error("Failed to load farmers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return farmers.filter(
      (f) =>
        f.full_name?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.farm_name?.toLowerCase().includes(q) ||
        f.farm_type?.toLowerCase().includes(q)
    );
  }, [farmers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (farmer) => {
    setSelectedFarmer(farmer);
    setForm({ ...EMPTY_FORM, ...farmer, password_hash: "" });
    setModal("edit");
  };
  const openDelete = (farmer) => { setSelectedFarmer(farmer); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelectedFarmer(null); };

  const handleAdd = async () => {
    if (!form.full_name || !form.email || !form.farm_name) {
      toast.warn("Please fill required fields"); return;
    }
    try {
      setSubmitting(true);
      await addFarmer(form);
      toast.success("Farmer added successfully!");
      closeModal();
      fetchFarmers();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add farmer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    try {
      setSubmitting(true);
      await updateFarmer(selectedFarmer.farmer_id, form);
      toast.success("Farmer updated successfully!");
      closeModal();
      fetchFarmers();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update farmer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await deleteFarmer(selectedFarmer.farmer_id);
      toast.success("Farmer deleted");
      closeModal();
      fetchFarmers();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete farmer");
    } finally {
      setSubmitting(false);
    }
  };

  // ── CSV Export ──
  const exportCSV = () => {
    const headers = ["ID", "Name", "Email", "Phone", "Farm Name", "Farm Type", "Total Birds", "Status"];
    const rows = filtered.map((f) => [
      f.farmer_id, f.full_name, f.email, f.phone_number,
      f.farm_name, f.farm_type, f.total_birds, f.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "farmers.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const fieldChange = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Users className="text-[#166534]" size={24} /> Manage Farmers
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} farmer{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            id="add-farmer-btn"
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#166534] to-[#22c55e] text-white text-sm font-bold hover:shadow-lg transition-all"
          >
            <Plus size={15} /> Add Farmer
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="farmer-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, farm..."
            className="w-full pl-10 pr-4 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] bg-gray-50"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <FarmerTable
          farmers={paginated}
          loading={loading}
          onEdit={openEdit}
          onDelete={openDelete}
        />

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                      page === pageNum
                        ? "bg-[#166534] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {modal === "add" && (
        <Modal title="Add New Farmer" onClose={closeModal} onSubmit={handleAdd} loading={submitting}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" id="fn-name" value={form.full_name} onChange={fieldChange("full_name")} required />
            <FormField label="Email" id="fn-email" type="email" value={form.email} onChange={fieldChange("email")} required />
            <FormField label="Phone Number" id="fn-phone" value={form.phone_number} onChange={fieldChange("phone_number")} />
            <FormField label="Password" id="fn-pass" type="password" value={form.password_hash} onChange={fieldChange("password_hash")} required />
            <FormField label="Farm Name" id="fn-farm" value={form.farm_name} onChange={fieldChange("farm_name")} required />
            <FormField label="Farm Type" id="fn-type" value={form.farm_type} onChange={fieldChange("farm_type")} options={["Broiler", "Layer", "Breeder"]} />
            <div className="sm:col-span-2">
              <FormField label="Address" id="fn-address" value={form.address} onChange={fieldChange("address")} />
            </div>
            <FormField label="Latitude" id="fn-lat" type="number" value={form.latitude} onChange={fieldChange("latitude")} />
            <FormField label="Longitude" id="fn-lng" type="number" value={form.longitude} onChange={fieldChange("longitude")} />
            <FormField label="Total Birds" id="fn-birds" type="number" value={form.total_birds} onChange={fieldChange("total_birds")} />
            <FormField label="Status" id="fn-status" value={form.status} onChange={fieldChange("status")} options={["Active", "Inactive"]} />
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal === "edit" && (
        <Modal title="Edit Farmer" onClose={closeModal} onSubmit={handleEdit} loading={submitting} submitLabel="Update">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" id="ef-name" value={form.full_name} onChange={fieldChange("full_name")} required />
            <FormField label="Email" id="ef-email" type="email" value={form.email} onChange={fieldChange("email")} required />
            <FormField label="Phone Number" id="ef-phone" value={form.phone_number} onChange={fieldChange("phone_number")} />
            <FormField label="Farm Name" id="ef-farm" value={form.farm_name} onChange={fieldChange("farm_name")} required />
            <FormField label="Farm Type" id="ef-type" value={form.farm_type} onChange={fieldChange("farm_type")} options={["Broiler", "Layer", "Breeder"]} />
            <FormField label="Total Birds" id="ef-birds" type="number" value={form.total_birds} onChange={fieldChange("total_birds")} />
            <div className="sm:col-span-2">
              <FormField label="Address" id="ef-address" value={form.address} onChange={fieldChange("address")} />
            </div>
            <FormField label="Status" id="ef-status" value={form.status} onChange={fieldChange("status")} options={["Active", "Inactive"]} />
          </div>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {modal === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Delete Farmer?</h3>
              <p className="text-gray-500 text-sm mt-2">
                Are you sure you want to delete{" "}
                <strong>{selectedFarmer?.full_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
