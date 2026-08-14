import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Plus,
  QrCode,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import DeviceTable from "../../components/admin/DeviceTable";
import {
  addDevice,
  deleteDevice,
  getAllDevices,
  updateDevice,
} from "../../services/adminService";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  farmer_id: "",
  qr_code: "",
  esp32_id: "",
  raspberrypi_id: "",
  shed_name: "",
  installation_date: "",
  status: "Active",
};

function Modal({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          <button
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", options }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {options ? (
        <select
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20"
          name={name}
          onChange={onChange}
          value={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20"
          name={name}
          onChange={onChange}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}

function drawQrLikePattern(canvas, value) {
  const ctx = canvas.getContext("2d");
  const size = 280;
  const cells = 29;
  const cellSize = size / cells;
  const text = value || "POULTRYGUARD-DEVICE";

  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111827";

  const finder = (x, y) => {
    ctx.fillRect(x * cellSize, y * cellSize, cellSize * 7, cellSize * 7);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = "#111827";
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, cellSize * 3, cellSize * 3);
  };

  finder(1, 1);
  finder(21, 1);
  finder(1, 21);

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const inFinder =
        (row < 9 && col < 9) ||
        (row < 9 && col > 19) ||
        (row > 19 && col < 9);

      if (inFinder) continue;

      const charCode = text.charCodeAt((row * cells + col) % text.length);
      const active = (charCode + row * 7 + col * 11) % 4 === 0;
      if (active) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

export default function ManageDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const canvasRef = useRef(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await getAllDevices();
      setDevices(res?.data || []);
    } catch (error) {
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (modal === "qr" && canvasRef.current) {
      drawQrLikePattern(canvasRef.current, selectedDevice?.qr_code || selectedDevice?.device_id);
    }
  }, [modal, selectedDevice]);

  const filteredDevices = useMemo(() => {
    const query = search.toLowerCase();
    return devices.filter((device) =>
      [
        device.device_id,
        device.farmer_id,
        device.qr_code,
        device.esp32_id,
        device.raspberrypi_id,
        device.shed_name,
        device.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [devices, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const paginatedDevices = filteredDevices.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const openAdd = () => {
    const qrCode = `PG-${Date.now()}`;
    setForm({ ...EMPTY_FORM, qr_code: qrCode });
    setModal("add");
  };

  const openEdit = (device) => {
    setSelectedDevice(device);
    setForm({ ...EMPTY_FORM, ...device });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDevice(null);
    setSubmitting(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveNewDevice = async () => {
    if (!form.farmer_id || !form.qr_code || !form.shed_name) {
      toast.warn("Farmer ID, QR code, and shed name are required");
      return;
    }

    try {
      setSubmitting(true);
      await addDevice(form);
      toast.success("Device added successfully");
      closeModal();
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to add device");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDeviceChanges = async () => {
    try {
      setSubmitting(true);
      await updateDevice(selectedDevice.device_id, form);
      toast.success("Device updated successfully");
      closeModal();
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update device");
    } finally {
      setSubmitting(false);
    }
  };

  const removeDevice = async () => {
    try {
      setSubmitting(true);
      await deleteDevice(selectedDevice.device_id);
      toast.success("Device deleted");
      closeModal();
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete device");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadQr = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = `${selectedDevice?.qr_code || "device-qr"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <Cpu className="text-[#166534]" size={24} />
            Manage Devices
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Register IoT devices, QR identifiers, sheds, and installation status.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#166534] to-[#22c55e] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-900/10 transition hover:shadow-xl"
          onClick={openAdd}
          type="button"
        >
          <Plus size={16} />
          Add Device
        </button>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by device, farmer, shed, QR, status..."
            value={search}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <DeviceTable
          devices={paginatedDevices}
          loading={loading}
          onDelete={(device) => {
            setSelectedDevice(device);
            setModal("delete");
          }}
          onEdit={openEdit}
          onQRCode={(device) => {
            setSelectedDevice(device);
            setModal("qr");
          }}
        />

        {!loading && filteredDevices.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-gray-200 p-2 text-gray-500 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="rounded-xl border border-gray-200 p-2 text-gray-500 disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {(modal === "add" || modal === "edit") && (
        <Modal
          footer={
            <>
              <button
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                onClick={closeModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#166534] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                disabled={submitting}
                onClick={modal === "add" ? saveNewDevice : saveDeviceChanges}
                type="button"
              >
                {submitting ? "Saving..." : modal === "add" ? "Add Device" : "Update Device"}
              </button>
            </>
          }
          onClose={closeModal}
          title={modal === "add" ? "Add Device" : "Edit Device"}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Farmer ID" name="farmer_id" onChange={handleChange} type="number" value={form.farmer_id} />
            <Field label="QR Code" name="qr_code" onChange={handleChange} value={form.qr_code} />
            <Field label="ESP32 ID" name="esp32_id" onChange={handleChange} value={form.esp32_id} />
            <Field label="Raspberry Pi ID" name="raspberrypi_id" onChange={handleChange} value={form.raspberrypi_id} />
            <Field label="Shed Name" name="shed_name" onChange={handleChange} value={form.shed_name} />
            <Field label="Installation Date" name="installation_date" onChange={handleChange} type="date" value={form.installation_date || ""} />
            {modal === "edit" && (
              <Field
                label="Status"
                name="status"
                onChange={handleChange}
                options={["Active", "Inactive", "Maintenance"]}
                value={form.status || "Active"}
              />
            )}
          </div>
        </Modal>
      )}

      {modal === "delete" && (
        <Modal
          footer={
            <>
              <button
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                onClick={closeModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                disabled={submitting}
                onClick={removeDevice}
                type="button"
              >
                {submitting ? "Deleting..." : "Delete Device"}
              </button>
            </>
          }
          onClose={closeModal}
          title="Delete Device"
        >
          <p className="text-sm leading-6 text-gray-600">
            Delete device <strong>#{selectedDevice?.device_id}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}

      {modal === "qr" && (
        <Modal
          footer={
            <>
              <button
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                onClick={closeModal}
                type="button"
              >
                Close
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-[#166534] px-5 py-2.5 text-sm font-bold text-white"
                onClick={downloadQr}
                type="button"
              >
                <Download size={16} />
                Download QR
              </button>
            </>
          }
          onClose={closeModal}
          title="Device QR Code"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-inner">
              <canvas ref={canvasRef} />
            </div>
            <div>
              <p className="flex items-center justify-center gap-2 text-sm font-bold text-gray-800">
                <QrCode size={16} />
                {selectedDevice?.qr_code || `Device #${selectedDevice?.device_id}`}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                QR pattern generated from device identifier.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
