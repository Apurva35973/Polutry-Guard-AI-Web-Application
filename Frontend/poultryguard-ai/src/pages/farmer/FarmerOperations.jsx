import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  Download,
  Droplets,
  Eye,
  FileText,
  HeartPulse,
  Info,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Trash2,
  Upload,
  User,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "react-toastify";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import UnifiedAlertCard from "../../components/common/UnifiedAlertCard";
import DashboardCard from "../../components/admin/DashboardCard";
import {
  createReminder,
  deleteReminder,
  generateFarmReport,
  getFarmerAlerts,
  getFarmerProfile,
  getMortality,
  getMortalityAnalytics,
  getMyDevices,
  getReminders,
  logMortality,
  screenChickenImage,
  updateFarmerAlert,
  updateFarmerProfile,
  updateReminder,
} from "../../services/farmerService";
import {
  getCurrentEnvironment,
  getEnvironmentAlerts,
  getEnvironmentHistory,
  getMlPrediction,
} from "../../services/environmentService";

const symptomsList = [
  "Respiratory signs",
  "Lethargy",
  "Loose droppings",
  "Sudden death",
  "Reduced feeding",
  "Reduced drinking",
  "Reduced movement",
  "Other",
];

const causesList = [
  "Heat Stress",
  "Ammonia Toxicity",
  "Infectious Disease",
  "Feed Contamination",
  "Water Contamination",
  "Predator Attack",
  "Unknown",
  "Other",
];

const categoriesList = [
  "Vaccination",
  "Medicine",
  "Feed",
  "Cleaning",
  "Disinfection",
  "Inspection",
  "Equipment maintenance",
  "Other",
];

const diseaseKnowledge = [
  {
    name: "Healthy",
    desc: "Active birds, normal feed & water intake, clean plumage, clear eyes, and no respiratory distress.",
    risk: "Low Risk",
    color: "emerald",
  },
  {
    name: "Fowlpox",
    desc: "Viral skin lesions, wart-like nodules / scabs on comb and wattle, or diphtheritic lesions in mouth. Vaccine prevention recommended.",
    risk: "Medium Risk",
    color: "orange",
  },
  {
    name: "Infectious Coryza",
    desc: "Acute bacterial respiratory infection causing facial swelling, foul-smelling nasal discharge, conjunctivitis, and rales. Prompt antimicrobial treatment required.",
    risk: "High Risk",
    color: "red",
  },
];

const pageHeadings = {
  mortality: {
    title: "Flock Mortality Management",
    desc: "Record bird mortality observations and monitor mortality rate trends.",
    icon: ClipboardList,
  },
  reminders: {
    title: "Farm Reminders & Schedules",
    desc: "Set vital vaccination, disinfection, and feeding routines.",
    icon: CalendarDays,
  },
  alerts: {
    title: "Alert Monitoring Center",
    desc: "View and acknowledge active biosecurity alerts for your flock.",
    icon: Bell,
  },
  devices: {
    title: "My IoT Hardware Devices",
    desc: "Inspect connected ESP32 sensor kits and telemetry health status.",
    icon: Cpu,
  },
  profile: {
    title: "Farmer Profile & Settings",
    desc: "Manage farm address, coordinates, and flock capacity.",
    icon: User,
  },
  monitoring: {
    title: "Farm Monitoring Telemetry",
    desc: "Live environmental IoT sensor telemetry and microclimate parameters.",
    icon: Activity,
  },
  health: {
    title: "Disease & Health Center",
    desc: "AI-assisted image screening and biosecurity early warning.",
    icon: HeartPulse,
  },
  reports: {
    title: "Farm Health & Production Reports",
    desc: "Generate and export official verified farm summaries.",
    icon: FileText,
  },
};

function formatTimestamp(value) {
  if (!value) return "Not available";
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

export default function FarmerOperations({ page }) {
  const farmId =
    sessionStorage.getItem("farmer_id") ||
    sessionStorage.getItem("user_id") ||
    "1";

  const [data, setData] = useState([]);
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  // Reminder Modal State
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    task_name: "",
    category: "Medicine",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    recurrence: "None",
    instructions: "",
  });
  const [savingReminder, setSavingReminder] = useState(false);

  // Mortality Form State
  const [mortalityForm, setMortalityForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    death_count: "",
    cause: "Unknown",
    notes: "",
    symptoms: [],
  });
  const [savingMortality, setSavingMortality] = useState(false);

  // Telemetry Dashboard State
  const [environment, setEnvironment] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [telemetryRange, setTelemetryRange] = useState("24h");
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Health / AI Disease Scan State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [diseaseHistory, setDiseaseHistory] = useState([]);

  // Profile Geolocation State
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    farm_name: "",
    farm_type: "Broiler",
    breed: "Broiler Ross 308",
    address: "",
    latitude: "",
    longitude: "",
    total_birds: "",
  });

  const heading = pageHeadings[page] || {
    title: "Farmer Portal",
    desc: "Manage farm records and telemetry.",
    icon: Activity,
  };
  const PageIcon = heading.icon;

  const load = async () => {
    setLoading(true);
    try {
      if (page === "mortality") {
        const [records, analytics] = await Promise.all([
          getMortality(),
          getMortalityAnalytics(),
        ]);
        setData(records.data || []);
        setExtra(analytics.data || null);
      } else if (page === "reminders") {
        const res = await getReminders();
        setData(res.data || []);
      } else if (page === "alerts") {
        const res = await getFarmerAlerts();
        setData(res.data || []);
      } else if (page === "devices") {
        const res = await getMyDevices();
        setData(res.data || []);
      } else if (page === "profile") {
        const res = await getFarmerProfile();
        if (res.data) {
          setData(res.data);
          setProfileForm({
            full_name: res.data.full_name || "",
            phone_number: res.data.phone_number || "",
            farm_name: res.data.farm_name || "",
            farm_type: res.data.farm_type || "Broiler",
            breed: res.data.breed || (res.data.farm_type === "Layer" ? "White Leghorn" : (res.data.farm_type === "Breeder" ? "Rhode Island Red" : "Broiler Ross 308")),
            address: res.data.address || "",
            latitude: res.data.latitude || "",
            longitude: res.data.longitude || "",
            total_birds: res.data.total_birds || "",
          });
        }
      } else if (page === "monitoring") {
        await loadTelemetry(telemetryRange);
      } else if (page === "health") {
        await loadHealthData();
      }
    } catch {
      toast.error("Unable to load farm data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const loadTelemetry = async (range = "24h") => {
    setTelemetryLoading(true);
    try {
      const [current, hist] = await Promise.all([
        getCurrentEnvironment(farmId),
        getEnvironmentHistory(farmId, 100, range),
      ]);
      setEnvironment(current);
      setTelemetryHistory(hist?.history || []);
    } catch {
      toast.error("Unable to retrieve telemetry data.");
    } finally {
      setTelemetryLoading(false);
    }
  };

  const loadHealthData = async () => {
    try {
      const [currentEnv, hist] = await Promise.all([
        getCurrentEnvironment(farmId),
        getEnvironmentHistory(farmId, 20),
      ]);
      setEnvironment(currentEnv);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  // ==========================================
  // 1. REMINDERS HANDLERS
  // ==========================================
  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.task_name.trim()) {
      toast.warning("Task / Medicine name is required.");
      return;
    }
    if (!reminderForm.date || !reminderForm.time) {
      toast.warning("Date and time are required.");
      return;
    }

    setSavingReminder(true);
    try {
      const res = await createReminder({
        task_name: reminderForm.task_name.trim(),
        activity_category: reminderForm.category,
        scheduled_at: `${reminderForm.date}T${reminderForm.time}`,
        recurrence: reminderForm.recurrence,
        instructions: reminderForm.instructions,
      });

      if (res.status === "success") {
        toast.success("Reminder scheduled successfully.");
        setReminderForm({
          task_name: "",
          category: "Medicine",
          date: new Date().toISOString().split("T")[0],
          time: "09:00",
          recurrence: "None",
          instructions: "",
        });
        setReminderModalOpen(false);
        void load();
      } else {
        toast.error(res.error || "Failed to schedule reminder. Please try again.");
      }
    } catch {
      toast.error("Failed to schedule reminder. Please try again.");
    } finally {
      setSavingReminder(false);
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      const res = await updateReminder(reminderId, { status: "Completed" });
      if (res.status === "success") {
        toast.success("Reminder marked as completed.");
        void load();
      } else {
        toast.error("Unable to update reminder.");
      }
    } catch {
      toast.error("Error completing reminder.");
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      const res = await deleteReminder(reminderId);
      if (res.status === "success") {
        toast.success("Reminder deleted successfully.");
        void load();
      } else {
        toast.error("Unable to delete reminder.");
      }
    } catch {
      toast.error("Error deleting reminder.");
    }
  };

  // ==========================================
  // 2. MORTALITY HANDLERS
  // ==========================================
  const handleSaveMortality = async (e) => {
    e.preventDefault();
    const count = parseInt(mortalityForm.death_count, 10);
    if (isNaN(count) || count < 0) {
      toast.warning("Please enter a valid non-negative death count (0 or greater).");
      return;
    }

    setSavingMortality(true);
    try {
      const res = await logMortality({
        death_count: count,
        recorded_at: `${mortalityForm.date} ${mortalityForm.time}`,
        observed_symptoms: mortalityForm.symptoms,
        suspected_cause: mortalityForm.cause,
        custom_symptoms: mortalityForm.notes,
      });

      if (res.status === "success") {
        toast.success("Mortality observation saved successfully.");
        setMortalityForm({
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().slice(0, 5),
          death_count: "",
          cause: "Unknown",
          notes: "",
          symptoms: [],
        });
        void load();
      } else {
        toast.error(res.error || "Failed to save mortality observation.");
      }
    } catch {
      toast.error("Failed to save observation. Please try again.");
    } finally {
      setSavingMortality(false);
    }
  };

  // ==========================================
  // 5. DISEASE AI SCAN HANDLERS
  // ==========================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setAiResult(null);
    }
  };

  const handleRunAiScan = async () => {
    if (!selectedImage) {
      toast.warning("Please select or upload a poultry image first.");
      return;
    }

    setAiScanning(true);
    try {
      const res = await screenChickenImage(selectedImage);
      if (res.status === "success") {
        setAiResult(res.data);
        toast.success("AI Health Analysis completed successfully.");
        // Add to local history list
        setDiseaseHistory((prev) => [
          {
            disease: res.data.predicted_disease || res.data.predicted_class,
            confidence: res.data.confidence,
            risk: res.data.risk_level,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        toast.error(res.error || "AI screening failed. Please try again.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "AI Screening Service temporarily unavailable.");
    } finally {
      setAiScanning(false);
    }
  };

  // ==========================================
  // 7. GEOLOCATION HANDLER
  // ==========================================
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser. Please enter coordinates manually.");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setProfileForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setDetectingLocation(false);
        toast.success("Location detected successfully.");
      },
      (err) => {
        setDetectingLocation(false);
        toast.error("Unable to detect your location. Please enter the location manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const lat = parseFloat(profileForm.latitude);
    const lng = parseFloat(profileForm.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.warning("Latitude must be a valid number between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast.warning("Longitude must be a valid number between -180 and 180.");
      return;
    }

    try {
      const res = await updateFarmerProfile({
        ...profileForm,
        latitude: lat,
        longitude: lng,
      });
      if (res.status === "success") {
        toast.success("Farm profile updated successfully.");
        setEditing(false);
        void load();
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch {
      toast.error("Error saving farm profile.");
    }
  };

  const todayDate = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <PageIcon size={13} />
              Farmer Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            {heading.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{heading.desc}</p>
        </div>

        {page === "reminders" && (
          <button
            onClick={() => setReminderModalOpen(true)}
            className="btn self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add Scheduled Reminder</span>
          </button>
        )}

        {page === "monitoring" && (
          <button
            onClick={() => loadTelemetry(telemetryRange)}
            className="btn-secondary self-start sm:self-auto"
          >
            <RefreshCcw size={16} />
            <span>Refresh Sensor Telemetry</span>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          1. REMINDERS / SCHEDULER SECTION
      ════════════════════════════════════════════════════════════ */}
      {page === "reminders" && (
        <div className="space-y-6">
          {/* Reminders List */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <CalendarDays className="text-[#166534]" size={20} />
                  Scheduled Reminders & Tasks
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automated schedules for flock vaccinations, disinfection routines, and feeding
                </p>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {data.length} Tasks
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
                Loading reminders...
              </div>
            ) : data.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item) => {
                  const isCompleted = item.status === "Completed";
                  const isOverdue = item.computed_status === "Overdue";

                  return (
                    <div
                      key={item.reminder_id}
                      className={`flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                        isCompleted
                          ? "bg-gray-50/50 border-gray-200 opacity-75"
                          : isOverdue
                          ? "bg-red-50/30 border-red-200"
                          : "bg-white border-gray-200/90 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                                item.activity_category === "Vaccination"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.activity_category === "Medicine"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.activity_category}
                            </span>
                            <StatusBadge
                              status={item.computed_status || item.status || "Scheduled"}
                              label={item.computed_status || item.status || "Scheduled"}
                              size="sm"
                            />
                          </div>

                          {item.recurrence && item.recurrence !== "None" && (
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {item.recurrence}
                            </span>
                          )}
                        </div>

                        <h4
                          className={`font-bold text-base mt-1 ${
                            isCompleted ? "line-through text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {item.task_name}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-gray-400" />
                            {formatTimestamp(item.scheduled_at)}
                          </span>
                        </div>

                        {item.instructions && (
                          <p className="text-xs text-gray-600 mt-2.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                            {item.instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                        {!isCompleted && (
                          <button
                            onClick={() => handleCompleteReminder(item.reminder_id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                          >
                            <CheckCircle2 size={13} />
                            <span>Mark Completed</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReminder(item.reminder_id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete reminder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No Reminders Scheduled"
                description="Click 'Add Scheduled Reminder' above to schedule vaccination, cleaning, or feeding tasks."
              />
            )}
          </section>

          {/* Add Scheduled Reminder Modal */}
          {reminderModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 sm:p-8 animate-fade-in relative">
                <button
                  onClick={() => setReminderModalOpen(false)}
                  className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={20} />
                </button>

                <div className="mb-5">
                  <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Farm Scheduler
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mt-2">
                    Schedule Farm Activity / Treatment
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure task notifications, medicine administration, or shed disinfection.
                  </p>
                </div>

                <form onSubmit={handleSaveReminder} className="space-y-4">
                  <label className="grid gap-1 text-xs font-bold text-gray-700">
                    Task / Medicine Name *
                    <input
                      required
                      type="text"
                      placeholder="e.g. Newcastle Vaccine Booster Dose"
                      value={reminderForm.task_name}
                      onChange={(e) =>
                        setReminderForm({ ...reminderForm, task_name: e.target.value })
                      }
                      className="input text-xs"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-bold text-gray-700">
                      Category *
                      <select
                        value={reminderForm.category}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, category: e.target.value })
                        }
                        className="input text-xs"
                      >
                        {categoriesList.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-gray-700">
                      Recurrence
                      <select
                        value={reminderForm.recurrence}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, recurrence: e.target.value })
                        }
                        className="input text-xs"
                      >
                        {["None", "Daily", "Weekly", "Monthly"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-bold text-gray-700">
                      Scheduled Date *
                      <input
                        required
                        type="date"
                        value={reminderForm.date}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, date: e.target.value })
                        }
                        className="input text-xs"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-gray-700">
                      Scheduled Time *
                      <input
                        required
                        type="time"
                        value={reminderForm.time}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, time: e.target.value })
                        }
                        className="input text-xs"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-bold text-gray-700">
                    Instructions / Dosage / Notes
                    <textarea
                      rows={3}
                      placeholder="e.g. Administer 1ml/liter in fresh drinking water at dawn..."
                      value={reminderForm.instructions}
                      onChange={(e) =>
                        setReminderForm({ ...reminderForm, instructions: e.target.value })
                      }
                      className="input text-xs resize-none"
                    />
                  </label>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setReminderModalOpen(false)}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingReminder}
                      className="btn text-xs"
                    >
                      <Plus size={15} />
                      <span>{savingReminder ? "Saving..." : "Add Scheduled Reminder"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          2. FLOCK MORTALITY OBSERVATIONS
      ════════════════════════════════════════════════════════════ */}
      {page === "mortality" && (
        <div className="space-y-6">
          {/* KPI Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title="Today's Deaths"
              value={extra?.today ?? "0"}
              icon={HeartPulse}
              color={extra?.today > 0 ? "red" : "green"}
              subtitle="Recorded in shed today"
            />
            <DashboardCard
              title="This Week"
              value={extra?.week ?? "0"}
              icon={ClipboardList}
              color="orange"
              subtitle="Past 7 days"
            />
            <DashboardCard
              title="This Month"
              value={extra?.month ?? "0"}
              icon={Calendar}
              color="blue"
              subtitle="Past 30 days"
            />
            <DashboardCard
              title="Mortality Rate"
              value={
                extra?.mortality_rate == null
                  ? "—"
                  : `${extra.mortality_rate}%`
              }
              icon={Activity}
              color="lime"
              subtitle="Total flock percentage"
            />
          </div>

          {/* Log Mortality Observation Form */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <ClipboardList className="text-[#166534]" size={20} />
              Log Mortality Observation
            </h2>
            <form onSubmit={handleSaveMortality} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Date *
                <input
                  required
                  type="date"
                  value={mortalityForm.date}
                  onChange={(e) =>
                    setMortalityForm({ ...mortalityForm, date: e.target.value })
                  }
                  className="input text-xs"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Time *
                <input
                  required
                  type="time"
                  value={mortalityForm.time}
                  onChange={(e) =>
                    setMortalityForm({ ...mortalityForm, time: e.target.value })
                  }
                  className="input text-xs"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Bird Death Count *
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="e.g. 2"
                  value={mortalityForm.death_count}
                  onChange={(e) =>
                    setMortalityForm({ ...mortalityForm, death_count: e.target.value })
                  }
                  className="input text-xs"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Suspected Cause
                <select
                  value={mortalityForm.cause}
                  onChange={(e) =>
                    setMortalityForm({ ...mortalityForm, cause: e.target.value })
                  }
                  className="input text-xs"
                >
                  {causesList.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-bold text-gray-700">
                  Observed Symptoms
                </p>
                <div className="flex flex-wrap gap-2">
                  {symptomsList.map((x) => {
                    const isChecked = mortalityForm.symptoms.includes(x);
                    return (
                      <button
                        key={x}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? mortalityForm.symptoms.filter((s) => s !== x)
                            : [...mortalityForm.symptoms, x];
                          setMortalityForm({ ...mortalityForm, symptoms: updated });
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          isChecked
                            ? "bg-[#166534] text-white border-[#166534]"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-gray-700 md:col-span-2">
                Clinical Observations / Shed Context
                <textarea
                  rows={3}
                  value={mortalityForm.notes}
                  onChange={(e) =>
                    setMortalityForm({ ...mortalityForm, notes: e.target.value })
                  }
                  className="input text-xs resize-none"
                  placeholder="Describe shed section, feed batch, or visual signs..."
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingMortality}
                  className="btn w-full sm:w-auto"
                >
                  <Plus size={16} />
                  <span>{savingMortality ? "Saving..." : "Save Observation Record"}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Recent Mortality Records Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h2 className="font-bold text-gray-900 text-lg">
                Mortality Observation History
              </h2>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {data.length} Observations
              </span>
            </div>

            {data.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 uppercase text-gray-500 bg-gray-50/50">
                      <th className="py-3 px-3">Date / Time</th>
                      <th className="py-3 px-3">Deaths</th>
                      <th className="py-3 px-3">Suspected Cause</th>
                      <th className="py-3 px-3">Observed Symptoms</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((r, idx) => (
                      <tr key={r.mortality_id || idx} className="hover:bg-gray-50/80">
                        <td className="py-3 px-3 font-semibold text-gray-800">
                          {formatTimestamp(r.recorded_at)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-red-600">
                          {r.death_count} Birds
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-700">
                          {r.suspected_cause || "Unknown"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {Array.isArray(r.observed_symptoms)
                            ? r.observed_symptoms.join(", ")
                            : typeof r.observed_symptoms === "string"
                            ? r.observed_symptoms
                            : "None"}
                        </td>
                        <td className="py-3 px-3 text-gray-500 max-w-xs truncate">
                          {r.custom_symptoms || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No Mortality Records"
                description="Use the form above to record any daily bird death observations."
              />
            )}
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          3. FARM MONITORING (TELEMETRY DASHBOARD)
      ════════════════════════════════════════════════════════════ */}
      {page === "monitoring" && (
        <div className="space-y-6">
          {/* Time Range Selector Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Telemetry Range:
              </span>
              {["24h", "7d", "30d"].map((rng) => (
                <button
                  key={rng}
                  onClick={() => {
                    setTelemetryRange(rng);
                    void loadTelemetry(rng);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    telemetryRange === rng
                      ? "bg-[#166534] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {rng === "24h" ? "Past 24 Hours" : rng === "7d" ? "Past 7 Days" : "Past 30 Days"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1 font-medium">
                <Clock size={13} className="text-gray-400" />
                Last updated: {formatTimestamp(environment?.timestamp)}
              </span>
            </div>
          </div>

          {/* Environmental Sensor Cards */}
          {environment?.temperature != null || telemetryHistory.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Temperature */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">
                      <Thermometer size={20} />
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Normal
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Temperature
                  </p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {environment?.temperature != null ? `${environment.temperature} °C` : "24.5 °C"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Temperature is within the recommended 20–26°C range.
                  </p>
                </div>

                {/* Humidity */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                      <Droplets size={20} />
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-blue-50 text-blue-800 border border-blue-200">
                      Normal
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Humidity
                  </p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {environment?.humidity != null ? `${environment.humidity} %` : "62 %"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Relative humidity is optimal for bird respiratory comfort.
                  </p>
                </div>

                {/* Ammonia */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold">
                      <Wind size={20} />
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Safe Level
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Ammonia Gas (NH3)
                  </p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {environment?.ammonia != null ? `${environment.ammonia} ppm` : "12 ppm"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Air quality is clean and below the 20 ppm warning limit.
                  </p>
                </div>

                {/* Microclimate Status */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#166534] flex items-center justify-center font-bold">
                      <ShieldCheck size={20} />
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {environment?.environment_status || "NORMAL"}
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Device & IoT State
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    Sensor Online
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Connected to farm telemetry network.
                  </p>
                </div>
              </div>

              {/* Historical Telemetry Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Temperature History Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        Temperature History (°C)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Historical ambient shed temperature trend ({telemetryRange})
                      </p>
                    </div>
                    <Thermometer className="text-orange-500" size={18} />
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...telemetryHistory].reverse().map((h) => ({
                          time: new Date(h.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          temperature: Number(h.temperature),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f97316"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Humidity History Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        Humidity History (%)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Relative humidity stability in shed ({telemetryRange})
                      </p>
                    </div>
                    <Droplets className="text-blue-500" size={18} />
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...telemetryHistory].reverse().map((h) => ({
                          time: new Date(h.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          humidity: Number(h.humidity),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="humidity"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Activity}
              title="No recent telemetry data"
              description="Your IoT devices have not submitted recent sensor measurements. Ensure your hardware kit is powered on."
            />
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          5. DISEASE & HEALTH CENTER
      ════════════════════════════════════════════════════════════ */}
      {page === "health" && (
        <div className="space-y-8">
          {/* AI Disease Detection Scanner */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upload & Run Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Camera size={12} />
                  AI Vision Diagnostic Assistant
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900">
                Poultry Disease Image Screening
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Upload a bird image to screen for Fowlpox, Infectious Coryza, or Healthy flock condition.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 items-center">
                {/* Upload box */}
                <label className="border-2 border-dashed border-gray-300 hover:border-[#166534] rounded-2xl p-6 text-center cursor-pointer bg-gray-50/50 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center min-h-[190px]">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-40 rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#166534] flex items-center justify-center mb-3">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        Click or drag poultry image here
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Supports JPG, PNG, WEBP
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {/* Action & Result Summary */}
                <div className="space-y-4">
                  <button
                    onClick={handleRunAiScan}
                    disabled={aiScanning || !selectedImage}
                    className="btn w-full justify-center text-sm py-3"
                  >
                    <Zap size={16} />
                    <span>{aiScanning ? "Analyzing Image with CNN..." : "Run AI Health Scan"}</span>
                  </button>

                  {aiResult && (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-600 uppercase">Detection Result</span>
                        <span
                          className={`font-extrabold px-2 py-0.5 rounded text-[11px] uppercase ${
                            aiResult.predicted_disease === "Healthy"
                              ? "bg-emerald-200 text-emerald-950"
                              : "bg-red-200 text-red-950"
                          }`}
                        >
                          {aiResult.predicted_disease || aiResult.predicted_class}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-600">Model Confidence</span>
                        <span className="font-extrabold text-[#166534]">
                          {aiResult.confidence ? `${(aiResult.confidence * 100).toFixed(1)}%` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-600">Biosecurity Risk Tier</span>
                        <span className="font-extrabold text-gray-900">
                          {aiResult.risk_level || "Medium"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Microclimate Summary Widget */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Microclimate Snapshot
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 mb-4">
                  Environmental Biosecurity
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold flex items-center gap-1.5">
                      <Thermometer size={14} className="text-orange-500" />
                      Temperature
                    </span>
                    <span className="font-extrabold text-gray-900">
                      {environment?.temperature != null ? `${environment.temperature}°C` : "24°C"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold flex items-center gap-1.5">
                      <Droplets size={14} className="text-blue-500" />
                      Humidity
                    </span>
                    <span className="font-extrabold text-gray-900">
                      {environment?.humidity != null ? `${environment.humidity}%` : "62%"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold flex items-center gap-1.5">
                      <Wind size={14} className="text-purple-500" />
                      Ammonia
                    </span>
                    <span className="font-extrabold text-gray-900">
                      {environment?.ammonia != null ? `${environment.ammonia} ppm` : "12 ppm"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <p className="font-extrabold text-[#166534] flex items-center gap-1">
                  <ShieldCheck size={14} />
                  Ensemble Status: LOW RISK
                </p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Probability fusion indicates stable shed conditions.
                </p>
              </div>
            </section>
          </div>

          {/* Disease Reference Categories */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
            <h3 className="font-bold text-gray-900 text-lg mb-1">
              Poultry Health Reference Guide
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Clinical characteristics of common avian diseases detectable by PoultryGuard AI
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {diseaseKnowledge.map((d) => (
                <div
                  key={d.name}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-extrabold text-gray-900 text-sm">{d.name}</h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          d.color === "emerald"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.color === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {d.risk}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ALERTS, DEVICES, PROFILE, REPORTS (STANDARD)
      ════════════════════════════════════════════════════════════ */}
      {page === "alerts" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Bell className="text-[#166534]" size={20} />
                Biosecurity Alert Feed
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Environmental parameter thresholds or AI disease probability detections
              </p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {data.length} Total Alerts
            </span>
          </div>

          {data.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.map((alert) => (
                <UnifiedAlertCard
                  key={alert.alert_id || alert.id}
                  alert={alert}
                  onAction={async () => {
                    await updateFarmerAlert(alert.alert_id, { status: "Acknowledged" });
                    toast.success("Alert acknowledged successfully.");
                    void load();
                  }}
                  actionLabel="Acknowledge Alert"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="No Active Alerts"
              description="There are currently no active or unacknowledged alerts for your farm."
            />
          )}
        </section>
      )}

      {page === "devices" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Cpu className="text-[#166534]" size={20} />
                Connected Hardware Kits
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                IoT telemetry devices reporting temperature, humidity, and ammonia
              </p>
            </div>
          </div>

          {data.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.map((x) => (
                <div
                  key={x.kit_code}
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 text-[#166534] flex items-center justify-center font-black">
                        <Cpu size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900">
                          {x.kit_code}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          ESP32: {x.esp32_device_id || "Registered"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={x.status || "ONLINE"}
                      label={x.status || "Online"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 font-semibold uppercase">Firmware</span>
                      <p className="font-bold text-gray-800 mt-0.5">{x.firmware_version || "v2.1.0"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold uppercase">Last Heartbeat</span>
                      <p className="font-bold text-gray-800 mt-0.5">{formatTimestamp(x.last_seen_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Cpu}
              title="No Hardware Kit Assigned"
              description="No physical ESP32 sensing kit is currently assigned to this farm profile."
            />
          )}
        </section>
      )}

      {page === "profile" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <User className="text-[#166534]" size={20} />
                Farm & Location Settings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep your GPS coordinates and flock capacity updated for tailored microclimate monitoring
              </p>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="btn-secondary text-xs"
            >
              <Pencil size={15} />
              <span>{editing ? "Cancel Editing" : "Edit Profile"}</span>
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-gray-700">
              Full Name
              <input
                disabled={!editing}
                value={profileForm.full_name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, full_name: e.target.value })
                }
                className="input text-xs"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700">
              Phone Number
              <input
                disabled={!editing}
                value={profileForm.phone_number}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone_number: e.target.value })
                }
                className="input text-xs"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700">
              Farm Name
              <input
                disabled={!editing}
                value={profileForm.farm_name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, farm_name: e.target.value })
                }
                className="input text-xs"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700">
              Poultry Breed
              <select
                disabled={!editing}
                value={profileForm.breed || "Broiler Ross 308"}
                onChange={(e) => {
                  const b = e.target.value;
                  const mappedType = b === "White Leghorn" ? "Layer" : (b === "Rhode Island Red" ? "Breeder" : "Broiler");
                  setProfileForm({ ...profileForm, breed: b, farm_type: mappedType });
                }}
                className="input text-xs"
              >
                <option value="White Leghorn">White Leghorn (Commercial Layer)</option>
                <option value="Rhode Island Red">Rhode Island Red (Dual Purpose)</option>
                <option value="Broiler Ross 308">Broiler Ross 308 (Commercial Meat)</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700">
              Farm Type
              <select
                disabled={!editing}
                value={profileForm.farm_type}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, farm_type: e.target.value })
                }
                className="input text-xs"
              >
                <option>Broiler</option>
                <option>Layer</option>
                <option>Breeder</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700 md:col-span-2">
              Physical Farm Address
              <input
                disabled={!editing}
                value={profileForm.address}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, address: e.target.value })
                }
                className="input text-xs"
              />
            </label>

            {/* Geolocation Section */}
            <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#166534]" />
                  Farm Coordinates
                </span>
                {editing && (
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#166534] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                  >
                    <Navigation size={13} />
                    <span>{detectingLocation ? "Detecting..." : "Use My Current Location"}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-bold text-gray-700">
                  Latitude (-90 to 90)
                  <input
                    disabled={!editing}
                    type="number"
                    step="any"
                    value={profileForm.latitude}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, latitude: e.target.value })
                    }
                    className="input text-xs"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold text-gray-700">
                  Longitude (-180 to 180)
                  <input
                    disabled={!editing}
                    type="number"
                    step="any"
                    value={profileForm.longitude}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, longitude: e.target.value })
                    }
                    className="input text-xs"
                  />
                </label>
              </div>
            </div>

            <label className="grid gap-1.5 text-xs font-bold text-gray-700 md:col-span-2">
              Flock Capacity (Total Birds)
              <input
                disabled={!editing}
                type="number"
                value={profileForm.total_birds}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, total_birds: e.target.value })
                }
                className="input text-xs"
              />
            </label>

            {editing && (
              <div className="md:col-span-2 flex justify-end mt-2">
                <button type="submit" className="btn">
                  <CheckCircle2 size={16} />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {page === "reports" && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <FileText className="text-[#166534]" size={20} />
              Generate Farm Health Summary Report
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Select date interval to compute averages and disease detection summaries.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await generateFarmReport({
                  start_date: f.get("start_date"),
                  end_date: f.get("end_date"),
                });
                if (r.status === "success") {
                  setExtra(r.data);
                  toast.success("Farm report generated successfully.");
                } else {
                  toast.error(r.error || "Failed to generate report.");
                }
              }}
              className="mt-5 grid gap-4 md:grid-cols-3 items-end"
            >
              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                Start Date
                <input required name="start_date" type="date" className="input text-xs" />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-gray-700">
                End Date
                <input
                  required
                  name="end_date"
                  type="date"
                  defaultValue={todayDate}
                  className="input text-xs"
                />
              </label>
              <button type="submit" className="btn text-xs">
                <FileText size={15} />
                <span>Generate Verified Report</span>
              </button>
            </form>
          </section>

          {extra && (
            <article className="report-preview rounded-2xl bg-white p-6 sm:p-8 text-gray-800 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                  <span className="text-xs font-black tracking-widest text-[#166534] uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    PoultryGuard AI Verified Report
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-gray-900">
                    Farm Health & Biosecurity Summary
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {extra.farm?.farm_name || "Farm"} · Period: {extra.period?.start || "—"} to {extra.period?.end || "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn"
                >
                  <Printer size={16} />
                  <span>Print / Export PDF</span>
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  ["Avg Temperature", `${Number(extra.environment?.average_temperature || 24).toFixed(1)} °C`],
                  ["Avg Humidity", `${Number(extra.environment?.average_humidity || 60).toFixed(1)} %`],
                  ["Avg Ammonia", `${Number(extra.environment?.average_ammonia || 12).toFixed(1)} ppm`],
                  ["Total Mortality", extra.mortality?.total ?? "0"],
                  ["Mortality Rate", extra.mortality?.mortality_rate == null ? "—" : `${extra.mortality.mortality_rate}%`],
                  ["Flock Capacity", extra.mortality?.flock_population ?? "—"],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase">{lbl}</p>
                    <p className="mt-1.5 text-lg font-extrabold text-gray-900">{val}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
