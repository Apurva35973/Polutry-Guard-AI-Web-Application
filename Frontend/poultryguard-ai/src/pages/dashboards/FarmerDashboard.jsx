import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Droplets,
  RefreshCcw,
  ShieldAlert,
  Thermometer,
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
import {
  getCurrentEnvironment,
  getEnvironmentAlerts,
  getEnvironmentHistory,
  getMlPrediction,
  getRiskPrediction,
} from "../../services/environmentService";

const statusStyles = {
  NORMAL: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  WARNING: "border-amber-400/35 bg-amber-400/10 text-amber-100",
  CRITICAL: "border-red-400/35 bg-red-500/10 text-red-100",
  UNAVAILABLE: "border-slate-500/35 bg-slate-500/10 text-slate-200",
  UNKNOWN: "border-slate-500/35 bg-slate-500/10 text-slate-200",
};

const defaultRiskForm = {
  mortality_rate: "0.024",
  egg_production: "850",
  amount_of_feeding: "4300",
};

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function MetricCard({ title, value, unit, status, icon: Icon }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{value ?? "--"}</span>
            <span className="pb-1 text-sm text-slate-400">{unit}</span>
          </div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-lg border ${statusStyles[status] || statusStyles.UNKNOWN}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function FarmerDashboard() {
  const farmId = sessionStorage.getItem("farmer_id") || sessionStorage.getItem("user_id") || "1";
  const [environment, setEnvironment] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskForm, setRiskForm] = useState(defaultRiskForm);
  const [risk, setRisk] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [mlResult, setMlResult] = useState(null);
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

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getCurrentEnvironment(farmId);
      setEnvironment(current);

      const [historyResponse, alertsResponse] = await Promise.all([
        getEnvironmentHistory(farmId, 50),
        getEnvironmentAlerts(farmId, 20),
      ]);
      setHistory(historyResponse.history || []);
      setAlerts(alertsResponse.alerts || current.alerts || []);
    } catch (err) {
      setError("Data temporarily unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [farmId]);

  const runRiskPrediction = async () => {
    if (environment?.temperature == null || environment?.humidity == null) {
      setError("Data temporarily unavailable");
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
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            score: response.risk_score,
          },
        ].slice(-20)
      );
    } catch (err) {
      setError(err?.response?.data?.message || "AI risk prediction unavailable");
    } finally {
      setLoading(false);
    }
  };

  const runMlPrediction = async () => {
    if (!imageFile) {
      setError("Choose a poultry image first");
      return;
    }
    if (environment?.temperature == null || environment?.humidity == null) {
      setError("Current environmental data is unavailable");
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
      setError(err?.response?.data?.error || "ML prediction unavailable");
    } finally {
      setLoading(false);
    }
  };

  const status = environment?.environment_status || "UNAVAILABLE";
  const elevated =
    risk?.elevated_biosecurity_risk ||
    (risk?.risk_level !== "Low" && ["WARNING", "CRITICAL"].includes(status));

  return (
    <main className="min-h-screen bg-[#0b1313] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">Poultry Guard AI</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Farm biosecurity dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Live environment monitoring and AI risk estimation are shown separately.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Temperature"
            value={environment?.temperature}
            unit="C"
            status={status}
            icon={Thermometer}
          />
          <MetricCard
            title="Humidity"
            value={environment?.humidity}
            unit="%"
            status={status}
            icon={Droplets}
          />
          <MetricCard title="Environment" value={status} unit="" status={status} icon={AlertTriangle} />
          <MetricCard
            title="AI Risk"
            value={risk?.risk_level || "--"}
            unit={risk ? `${Math.round(risk.risk_score * 100)}%` : ""}
            status={risk?.risk_level === "High" ? "CRITICAL" : risk?.risk_level === "Medium" ? "WARNING" : "NORMAL"}
            icon={ShieldAlert}
          />
        </div>

        {environment?.stale ? (
          <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-4 py-3 text-sm text-slate-200">
            Data temporarily unavailable. Showing last valid reading from {formatTime(environment.timestamp)}.
          </div>
        ) : null}

        {elevated ? (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-5 py-4 text-amber-50">
            <div className="flex items-center gap-3">
              <Activity size={20} />
              <span className="font-semibold">Elevated Biosecurity Risk</span>
            </div>
            <p className="mt-2 text-sm text-amber-100">
              Risk assessment only; not a veterinary diagnosis.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Temperature and humidity history</h2>
              <span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
                {status}
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="humidity" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
            <h2 className="text-lg font-semibold text-white">AI biosecurity risk</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["mortality_rate", "Mortality rate"],
                ["egg_production", "Egg production"],
                ["amount_of_feeding", "Feed kg/day"],
              ].map(([name, label]) => (
                <label key={name} className="grid gap-1 text-sm text-slate-300">
                  <span>{label}</span>
                  <input
                    value={riskForm[name]}
                    onChange={(event) =>
                      setRiskForm((current) => ({ ...current, [name]: event.target.value }))
                    }
                    className="h-11 rounded-lg border border-white/10 bg-slate-900 px-3 text-white outline-none focus:border-emerald-400"
                    type="number"
                    step="0.001"
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={loading}
                onClick={runRiskPrediction}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldAlert size={17} />
                Run risk estimate
              </button>
            </div>
            {risk ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Risk Score</span>
                  <span className="text-xl font-bold text-white">{risk.risk_score}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{risk.message}</p>
              </div>
            ) : null}
          </section>
        </div>

        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
          <h2 className="text-lg font-semibold text-white">Recent alerts</h2>
          <div className="mt-4 grid gap-3">
            {alerts.length ? (
              alerts.slice(0, 6).map((alert, index) => (
                <div
                  key={`${alert.timestamp || index}-${alert.parameter}`}
                  className={`rounded-lg border p-4 ${statusStyles[alert.severity] || statusStyles.WARNING}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{alert.severity}</span>
                    <span className="text-xs opacity-80">{formatTime(alert.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm">{alert.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No active environmental alerts.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
          <h2 className="text-lg font-semibold text-white">Image disease and biosecurity early warning</h2>
          <p className="mt-1 text-sm text-slate-400">
            Image classification and environmental/biosecurity risk are separate signals.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100"
            />
            <button
              type="button"
              disabled={loading}
              onClick={runMlPrediction}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Analyze image
            </button>
          </div>
          {mlResult ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Possible disease detected from image</p>
                <p className="mt-1 font-semibold text-white">{mlResult.image_model.predicted_disease}</p>
                <p className="text-sm text-slate-300">Confidence: {(mlResult.image_model.confidence * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Environmental/biosecurity risk</p>
                <p className="mt-1 font-semibold text-white">{mlResult.environmental_model.risk_level}</p>
                <p className="text-sm text-slate-300">Score: {(mlResult.environmental_model.risk_score * 100).toFixed(1)}% · {mlResult.environmental_model.environmental_status}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Final alert</p>
                <p className="mt-1 font-semibold text-white">{mlResult.ensemble.alert_level}</p>
                <p className="text-sm text-slate-300">{mlResult.ensemble.message}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
          <h2 className="text-lg font-semibold text-white">Risk history</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>
    </main>
  );
}

export default FarmerDashboard;
