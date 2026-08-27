import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Droplets,
  HeartPulse,
  Info,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Thermometer,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardCard from "../../components/admin/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import UnifiedAlertCard from "../../components/common/UnifiedAlertCard";
import {
  getCurrentEnvironment,
  getEnvironmentAlerts,
  getEnvironmentHistory,
  getMlPrediction,
  getRiskPrediction,
} from "../../services/environmentService";
import {
  getFarmerDashboard,
  getHardwareKitStatus,
  requestHardwareKit,
} from "../../services/farmerService";
import { completeFarmerProfile } from "../../services/authService";

const defaultRiskForm = {
  mortality_rate: "0.024",
  egg_production: "850",
  amount_of_feeding: "4300",
};

function formatTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function FarmerProfileModal({ onComplete }) {
  const [form, setForm] = useState({
    farm_name: "",
    farm_type: "Broiler",
    breed: "Broiler Ross 308",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState("");

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser. Please enter coordinates manually.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((current) => ({
          ...current,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        }));
        setDetecting(false);
        setMessage("");
      },
      () => {
        setDetecting(false);
        setMessage("Unable to detect your location. Please enter coordinates manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => String(value).trim() === "")) {
      setMessage("Please complete every farm profile field.");
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setMessage("Latitude must be between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setMessage("Longitude must be between -180 and 180.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await completeFarmerProfile({ ...form, latitude: lat, longitude: lng });
      if (response.status !== "success")
        throw new Error(response.error || "Unable to save your farm profile");
      onComplete(form);
    } catch (err) {
      setMessage(
        err?.response?.data?.error ||
          err.message ||
          "Unable to save your farm profile"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-2xl animate-fade-in"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-3 py-1 rounded-full w-fit mb-3 border border-emerald-200">
          <Shield size={13} />
          One-Time Farm Setup
        </div>
        <h2 className="text-2xl font-black text-gray-900">
          Complete Your Farm Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          This information enables precise environmental monitoring and disease risk scoring for your flock.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-gray-700 sm:col-span-2">
            Farm Name
            <input
              required
              name="farm_name"
              placeholder="e.g. Greenfield Poultry Farm"
              value={form.farm_name}
              onChange={update}
              className="input"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-gray-700 sm:col-span-2">
            Poultry Breed
            <select
              name="breed"
              value={form.breed || "Broiler Ross 308"}
              onChange={(e) => {
                const b = e.target.value;
                const mappedType = b === "White Leghorn" ? "Layer" : (b === "Rhode Island Red" ? "Breeder" : "Broiler");
                setForm((current) => ({ ...current, breed: b, farm_type: mappedType }));
              }}
              className="input"
            >
              <option value="White Leghorn">White Leghorn (Commercial Layer)</option>
              <option value="Rhode Island Red">Rhode Island Red (Dual Purpose)</option>
              <option value="Broiler Ross 308">Broiler Ross 308 (Commercial Meat)</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-gray-700 sm:col-span-2">
            Farm Type
            <select
              name="farm_type"
              value={form.farm_type}
              onChange={update}
              className="input"
            >
              <option>Broiler</option>
              <option>Layer</option>
              <option>Breeder</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-gray-700 sm:col-span-2">
            Address / City
            <input
              required
              name="address"
              placeholder="e.g. Pune, Maharashtra"
              value={form.address}
              onChange={update}
              className="input"
            />
          </label>

          <div className="sm:col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Farm GPS Coordinates</span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={detecting}
                className="text-xs font-bold text-[#166534] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all cursor-pointer"
              >
                {detecting ? "Detecting..." : "Use My Current Location"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs font-semibold text-gray-600">
                Latitude (-90 to 90)
                <input
                  required
                  type="number"
                  step="any"
                  name="latitude"
                  placeholder="e.g. 18.5204"
                  value={form.latitude}
                  onChange={update}
                  className="input text-xs"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-gray-600">
                Longitude (-180 to 180)
                <input
                  required
                  type="number"
                  step="any"
                  name="longitude"
                  placeholder="e.g. 73.8567"
                  value={form.longitude}
                  onChange={update}
                  className="input text-xs"
                />
              </label>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-medium">
            {message}
          </div>
        )}

        <button
          disabled={saving}
          className="btn w-full mt-6 text-base"
        >
          {saving ? "Saving Profile..." : "Save Farm Profile"}
        </button>
      </form>
    </div>
  );
}

function FarmerDashboard() {
  const farmId =
    sessionStorage.getItem("farmer_id") ||
    sessionStorage.getItem("user_id") ||
    "1";

  const [environment, setEnvironment] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskForm, setRiskForm] = useState(defaultRiskForm);
  const [risk, setRisk] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [hardware, setHardware] = useState({
    assignment: null,
    request: null,
  });
  const [farmSummary, setFarmSummary] = useState(null);
  const [requestingKit, setRequestingKit] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(() => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return !user.profile_completed;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .map((item) => ({
          time: new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          temperature: Number(item.temperature),
          humidity: Number(item.humidity),
        })),
    [history]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getCurrentEnvironment(farmId);
      setEnvironment(current);

      const [historyResponse, alertsResponse, summaryResponse] =
        await Promise.all([
          getEnvironmentHistory(farmId, 50),
          getEnvironmentAlerts(farmId, 20),
          getFarmerDashboard(),
        ]);
      setHistory(historyResponse.history || []);
      setAlerts(alertsResponse.alerts || current.alerts || []);
      if (summaryResponse.status === "success")
        setFarmSummary(summaryResponse.data);
    } catch {
      setError("Data temporarily unavailable. Live sensor sync will retry automatically.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  const loadHardware = useCallback(async () => {
    try {
      const response = await getHardwareKitStatus();
      if (response.status === "success")
        setHardware(
          response.data || { assignment: null, request: null }
        );
    } catch {
      // Non-blocking
    }
  }, []);

  const submitHardwareRequest = async () => {
    setRequestingKit(true);
    try {
      const response = await requestHardwareKit();
      if (response.status !== "success")
        throw new Error(response.error || "Unable to request a hardware kit");
      await loadHardware();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Unable to request a hardware kit"
      );
    } finally {
      setRequestingKit(false);
    }
  };

  const completeProfile = (form) => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const updatedUser = { ...user, ...form, profile_completed: true };
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setShowProfileForm(false);
    void loadHardware();
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadDashboard();
      void loadHardware();
    }, 0);
    const interval = window.setInterval(loadDashboard, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadDashboard, loadHardware]);

  const runRiskPrediction = async () => {
    if (environment?.temperature == null || environment?.humidity == null) {
      setError("Current environment readings are needed to estimate biosecurity risk.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getRiskPrediction(farmId, {
        temperature: environment.temperature,
        humidity: environment.humidity,
        ...riskForm,
      });
      setRisk(response);
      setRiskHistory((current) =>
        [
          ...current,
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            score: response.risk_score,
          },
        ].slice(-20)
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "AI risk prediction service unavailable"
      );
    } finally {
      setLoading(false);
    }
  };

  const runMlPrediction = async () => {
    if (!imageFile) {
      setError("Please select a poultry image file first.");
      return;
    }
    if (environment?.temperature == null || environment?.humidity == null) {
      setError("Current environmental sensor readings are required for ML ensemble analysis.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getMlPrediction(imageFile, {
        Temperature: Number(environment.temperature),
        Humidity: Number(environment.humidity),
        Mortality_Rate: Number(riskForm.mortality_rate),
        Egg_Production: Number(riskForm.egg_production),
        Amount_of_Feeding: Number(riskForm.amount_of_feeding),
      });
      setMlResult(response);
    } catch (err) {
      setError(
        err?.response?.data?.error || "ML image screening service unavailable"
      );
    } finally {
      setLoading(false);
    }
  };

  const envStatus = environment?.environment_status || "NORMAL";
  const elevated =
    risk?.elevated_biosecurity_risk ||
    (risk?.risk_level !== "Low" &&
      ["WARNING", "CRITICAL"].includes(envStatus));

  const activeAlertsCount = (farmSummary?.alerts || alerts || []).filter(
    (item) => item.status !== "Resolved"
  ).length;

  const kpiCards = [
    {
      title: "Temperature",
      value: environment?.temperature != null ? `${environment.temperature}°C` : "—",
      icon: Thermometer,
      color:
        envStatus === "CRITICAL"
          ? "red"
          : envStatus === "WARNING"
          ? "orange"
          : "green",
      subtitle: "Optimal: 20–26°C",
    },
    {
      title: "Humidity",
      value: environment?.humidity != null ? `${environment.humidity}%` : "—",
      icon: Droplets,
      color: "blue",
      subtitle: "Optimal: 50–70%",
    },
    {
      title: "Environment",
      value: envStatus,
      icon: envStatus === "NORMAL" ? ShieldCheck : AlertTriangle,
      color:
        envStatus === "CRITICAL"
          ? "red"
          : envStatus === "WARNING"
          ? "orange"
          : "emerald",
      subtitle: "Real-time sensor state",
    },
    {
      title: "AI Risk Level",
      value: risk?.risk_level || "Normal",
      icon: ShieldAlert,
      color:
        risk?.risk_level === "High"
          ? "red"
          : risk?.risk_level === "Medium"
          ? "orange"
          : "emerald",
      subtitle: risk ? `Score: ${Math.round(risk.risk_score * 100)}%` : "AI screening model",
    },
    {
      title: "Today's Mortality",
      value: farmSummary?.mortality?.today ?? "0",
      icon: HeartPulse,
      color: farmSummary?.mortality?.today > 0 ? "red" : "green",
      subtitle: "Birds recorded today",
    },
    {
      title: "Ammonia Level",
      value:
        environment?.ammonia != null
          ? `${environment.ammonia} ppm`
          : farmSummary?.environment?.ammonia != null
          ? `${farmSummary.environment.ammonia} ppm`
          : "— ppm",
      icon: Wind,
      color:
        (environment?.ammonia || 0) > 25
          ? "red"
          : (environment?.ammonia || 0) > 15
          ? "orange"
          : "lime",
      subtitle: "Safe threshold: < 20 ppm",
    },
    {
      title: "Active Alerts",
      value: activeAlertsCount,
      icon: Bell,
      color: activeAlertsCount > 0 ? "red" : "emerald",
      subtitle: "Unresolved notifications",
    },
    {
      title: "Upcoming Tasks",
      value:
        (farmSummary?.reminders || []).length +
        (farmSummary?.vaccinations || []).length,
      icon: Calendar,
      color: "blue",
      subtitle: "Reminders & vaccines",
    },
    {
      title: "Active Devices",
      value: hardware.assignment ? "1 Online" : "0 Connected",
      icon: Cpu,
      color: hardware.assignment ? "lime" : "emerald",
      subtitle: hardware.assignment?.kit_code || "IoT sensor hardware",
    },
  ];

  return (
    <div className="space-y-8">
      {showProfileForm && <FarmerProfileModal onComplete={completeProfile} />}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Live Monitoring
            </span>
            <span className="text-xs text-gray-400 font-medium">Farm #{farmId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Farm Biosecurity Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time IoT telemetry and AI-driven early outbreak risk indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin text-[#166534]" : "text-gray-600"} />
            <span>{loading ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Global Alert Banner if Error ── */}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 font-medium flex items-center gap-3 shadow-xs">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Stale Data Notice ── */}
      {environment?.stale && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 font-medium flex items-center gap-3 shadow-xs">
          <Info className="text-blue-600 flex-shrink-0" size={20} />
          <span>
            Data temporarily unavailable. Showing last valid telemetry from{" "}
            <b>{formatTime(environment.timestamp)}</b>.
          </span>
        </div>
      )}

      {/* ── Elevated Risk Warning Banner ── */}
      {elevated && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center">
              <Zap size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="font-extrabold text-red-950 text-base sm:text-lg">
                ⚠️ Elevated Biosecurity Risk Detected
              </h3>
              <p className="text-sm text-red-800 mt-0.5 leading-relaxed">
                Sensor anomalies or AI indicators suggest elevated stress or disease probability. Verify flock ventilation, water supply, and observe birds for lethargy. (Risk score estimate, not a veterinary confirmation).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Stat Cards Grid ── */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {kpiCards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* ── Flock Health Summary & Hardware Kit Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flock Health Summary */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <HeartPulse className="text-[#166534]" size={20} />
                  Flock Health Summary
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recorded mortality metrics and preventive health tasks
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="ACTIVE" label="Flock Active" size="sm" />
              </div>
            </div>

            {/* Quick Stat Pills */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase">Week Deaths</p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">
                  {farmSummary?.mortality?.week ?? "0"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase">Month Deaths</p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">
                  {farmSummary?.mortality?.month ?? "0"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase">Mortality Rate</p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">
                  {farmSummary?.mortality?.mortality_rate != null
                    ? `${farmSummary.mortality.mortality_rate}%`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Sub-panels for Vaccinations & AI Screening */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
                  <Syringe size={14} className="text-[#166534]" />
                  Upcoming Vaccinations
                </div>
                {farmSummary?.vaccinations?.length ? (
                  <div className="mt-2.5 space-y-2">
                    {farmSummary.vaccinations.slice(0, 2).map((v) => (
                      <div key={v.vaccination_id} className="text-xs font-medium text-gray-800 bg-white p-2 rounded-lg border border-gray-200">
                        <span className="font-bold">{v.vaccine_name}</span>
                        <p className="text-gray-500 mt-0.5">Date: {String(v.scheduled_date).slice(0, 10)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">No upcoming vaccinations scheduled.</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
                  <Camera size={14} className="text-[#166534]" />
                  Recent AI Screening
                </div>
                {farmSummary?.predictions?.length ? (
                  <div className="mt-2.5 space-y-2">
                    {farmSummary.predictions.slice(0, 2).map((p) => (
                      <div key={`${p.predicted_class}-${p.screened_at}`} className="text-xs font-medium text-gray-800 bg-white p-2 rounded-lg border border-gray-200">
                        <span className="font-bold">{p.predicted_class}</span>
                        <p className="text-[#166534] font-bold mt-0.5">{(Number(p.confidence) * 100).toFixed(1)}% Confidence</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">No images screened recently.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Farm Hardware Kit */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Cpu className="text-[#166534]" size={20} />
                  IoT Monitoring Kit
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hardware telemetry device deployed at your shed
                </p>
              </div>
              {hardware.assignment ? (
                <StatusBadge status="ONLINE" label="Hardware Online" size="sm" />
              ) : hardware.request ? (
                <StatusBadge status="PENDING" label="Request Pending" size="sm" />
              ) : (
                <StatusBadge status="UNAVAILABLE" label="Not Assigned" size="sm" />
              )}
            </div>

            {hardware.assignment ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Kit Code</p>
                  <p className="text-base font-extrabold text-gray-900 mt-1">
                    {hardware.assignment.kit_code}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">ESP32 Device ID</p>
                  <p className="text-base font-extrabold text-gray-900 mt-1 truncate">
                    {hardware.assignment.esp32_device_id}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Firmware</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {hardware.assignment.firmware_version || "v2.1.0-prod"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Last Telemetry</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {hardware.assignment.last_seen_at
                      ? formatTime(hardware.assignment.last_seen_at)
                      : "Receiving live"}
                  </p>
                </div>
              </div>
            ) : hardware.request ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-950">
                  Hardware Kit Request: <b>{hardware.request.status || "In Review"}</b>
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your hardware provisioning request is queued. An administrator will assign and dispatch an ESP32 telemetry sensor kit to your farm shortly.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-sm font-bold text-emerald-950">
                  No Hardware Kit Assigned
                </p>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Request an automated ESP32 environmental sensing kit to stream live temperature, humidity, and ammonia telemetry directly to this dashboard.
                </p>
                <button
                  type="button"
                  disabled={requestingKit}
                  onClick={submitHardwareRequest}
                  className="btn mt-4 w-full sm:w-auto"
                >
                  {requestingKit ? "Submitting Request..." : "Request Hardware Kit"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Charts Row: History & AI Risk Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Temperature & Humidity Chart */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">
                Temperature & Humidity History
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Live sensor telemetry over the last recording cycles
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-orange-600">
                <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                Temperature (°C)
              </span>
              <span className="flex items-center gap-1.5 text-sky-600">
                <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
                Humidity (%)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#0f172a",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature (°C)"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (%)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No telemetry points recorded yet.
              </div>
            )}
          </div>
        </section>

        {/* AI Biosecurity Risk Form */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <ShieldAlert className="text-[#166534]" size={20} />
                AI Biosecurity Risk Estimation
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Calculates risk level combining farm flock parameters
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {[
                ["mortality_rate", "Mortality Rate (e.g. 0.024)"],
                ["egg_production", "Egg Production (count/day)"],
                ["amount_of_feeding", "Feed Amount (kg/day)"],
              ].map(([name, label]) => (
                <label key={name} className="block text-xs font-semibold text-gray-700">
                  <span>{label}</span>
                  <input
                    value={riskForm[name]}
                    onChange={(event) =>
                      setRiskForm((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                    className="input mt-1"
                    type="number"
                    step="0.001"
                  />
                </label>
              ))}

              <button
                type="button"
                disabled={loading}
                onClick={runRiskPrediction}
                className="btn w-full mt-2"
              >
                <ShieldAlert size={17} />
                <span>{loading ? "Evaluating..." : "Estimate Biosecurity Risk"}</span>
              </button>
            </div>

            {risk && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-800">
                    Calculated Risk Score
                  </span>
                  <span className="text-xl font-black text-emerald-950">
                    {risk.risk_score}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-emerald-900 leading-relaxed">
                  {risk.message}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Recent Alerts Section ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Bell className="text-[#166534]" size={20} />
              Recent Environmental Alerts
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Active threshold crossings requiring farm attention
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {alerts.length} Total Records
          </span>
        </div>

        {alerts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.slice(0, 6).map((alert, index) => (
              <UnifiedAlertCard
                key={`${alert.timestamp || index}-${alert.parameter || "alert"}`}
                alert={alert}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No Active Alerts"
            description="Your farm's environmental sensors are currently operating within safe biosecurity thresholds."
          />
        )}
      </section>

      {/* ── Image Disease Screening Section ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="border-b border-gray-100 pb-4 mb-5">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Camera className="text-[#166534]" size={20} />
            AI Image Disease Screening & Early Warning
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload a flock droppings or bird photo to run the trained computer vision disease model.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#166534] file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-[#14532d] file:cursor-pointer cursor-pointer"
          />
          <button
            type="button"
            disabled={loading || !imageFile}
            onClick={runMlPrediction}
            className="btn shrink-0 w-full sm:w-auto"
          >
            <Camera size={17} />
            <span>{loading ? "Analyzing..." : "Analyze Image"}</span>
          </button>
        </div>

        {mlResult && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-xs">
              <p className="text-xs font-bold uppercase text-blue-800">
                Image Disease Model
              </p>
              <p className="text-xl font-extrabold text-blue-950 mt-1">
                {mlResult.image_model.predicted_disease}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-blue-900">
                <span>Model Confidence:</span>
                <span className="font-extrabold">
                  {(mlResult.image_model.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
              <p className="text-xs font-bold uppercase text-amber-800">
                Environment Model
              </p>
              <p className="text-xl font-extrabold text-amber-950 mt-1">
                {mlResult.environmental_model.risk_level} Risk
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-amber-900">
                <span>Risk Score:</span>
                <span className="font-extrabold">
                  {(mlResult.environmental_model.risk_score * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
              <p className="text-xs font-bold uppercase text-emerald-800">
                Ensemble Alert
              </p>
              <p className="text-xl font-extrabold text-emerald-950 mt-1">
                {mlResult.ensemble.alert_level}
              </p>
              <p className="mt-2 text-xs text-emerald-900 font-medium leading-relaxed">
                {mlResult.ensemble.message}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Risk History Line Chart ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              Historical Risk Trend
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Historical timeline of AI risk calculations
            </p>
          </div>
        </div>

        <div className="h-60 w-full">
          {riskHistory.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis domain={[0, 1]} stroke="#64748b" tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    color: "#0f172a",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Risk Score (0–1)"
                  stroke="#166534"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#166534" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Run AI risk estimates to visualize trends.
            </div>
          )}
        </div>
      </section>

      {/* ── Veterinary Consultations Section ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Stethoscope className="text-[#166534]" size={20} />
              Veterinary Consultations
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Diagnoses and prescriptions issued by your assigned veterinary doctor
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {(farmSummary?.vet_consultations || []).length} Records
          </span>
        </div>

        {(farmSummary?.vet_consultations || []).length ? (
          <div className="space-y-3">
            {(farmSummary.vet_consultations).map((item) => {
              const statusColor =
                item.status === "Completed" || item.status === "Resolved"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : item.status === "Active"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : item.status === "Cancelled"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-amber-50 text-amber-800 border-amber-200";
              return (
                <div
                  key={item.consultation_id}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                        <Stethoscope size={16} className="text-[#166534]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          Dr. {item.vet_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.vet_specialization} &mdash; {item.vet_clinic}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(item.consultation_date)}
                      </span>
                    </div>
                  </div>

                  {item.disease_name && (
                    <div className="mt-3 flex items-center gap-2">
                      <ClipboardList size={13} className="text-rose-500 shrink-0" />
                      <span className="text-xs font-semibold text-rose-700">
                        Diagnosed: {item.disease_name}
                      </span>
                    </div>
                  )}

                  {item.recommendation ? (
                    <div className="mt-2 bg-white rounded-lg border border-emerald-100 p-3">
                      <p className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wide">
                        Veterinary Prescription / Notes
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {item.recommendation}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400 italic">
                      No prescription written yet — awaiting vet response.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="No Veterinary Consultations"
            description="Your vet consultation records will appear here once a veterinary doctor has reviewed your case."
          />
        )}
      </section>
    </div>
  );
}

export default FarmerDashboard;
