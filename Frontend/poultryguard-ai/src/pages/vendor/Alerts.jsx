import React, { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import AlertCard from "../../components/vendor/AlertCard";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import { getAlerts } from "../../services/vendorService";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  if (loading) return <LoadingSpinner message="Loading alerts..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-300">Biosecurity</p>
          <h2 className="mt-2 flex items-center gap-2 text-3xl font-black text-white">
            <Bell size={28} />
            Alerts
          </h2>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200"
          onClick={loadAlerts}
          type="button"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {alerts.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {alerts.map((alert) => (
            <AlertCard alert={alert} key={alert.alert_id} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-12 text-center">
          <p className="font-bold text-white">No alerts found</p>
          <p className="mt-2 text-sm text-slate-400">Your alert feed is clear.</p>
        </div>
      )}
    </div>
  );
}
