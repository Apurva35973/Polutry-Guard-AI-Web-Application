import React, { useEffect, useState } from "react";
import { AlertTriangle, Bell, RefreshCw } from "lucide-react";
import UnifiedAlertCard from "../../components/common/UnifiedAlertCard";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
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
      setError(err.message || "Unable to load vendor alerts feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  if (loading) return <LoadingSpinner message="Retrieving regional alert signals..." />;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Biosecurity Network
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Regional Biosecurity Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time threshold crossings and disease notifications broadcast from member farms.
          </p>
        </div>

        <button
          className="btn-secondary self-start sm:self-auto"
          onClick={loadAlerts}
          type="button"
        >
          <RefreshCw size={16} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {alerts.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {alerts.map((alert) => (
            <UnifiedAlertCard
              alert={alert}
              key={alert.alert_id || alert.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No Active Alerts Found"
          description="Your vendor region is currently free of active or critical environmental alerts."
        />
      )}
    </div>
  );
}
