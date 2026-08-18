import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import OutbreakCard from "../../components/vendor/OutbreakCard";
import EmptyState from "../../components/common/EmptyState";
import { getOutbreakAlerts } from "../../services/vendorService";

export default function OutbreakAlerts() {
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOutbreaks = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getOutbreakAlerts();
      setOutbreaks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load outbreak alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutbreaks();
  }, []);

  if (loading) return <LoadingSpinner message="Checking active containment perimeters..." />;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              Quarantine & Containment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Disease Outbreak Containment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Active biohazard radius zones and high-priority pathogen outbreak advisories.
          </p>
        </div>

        <button
          className="btn-secondary self-start sm:self-auto"
          onClick={loadOutbreaks}
          type="button"
        >
          <RefreshCw size={16} />
          <span>Refresh Outbreaks</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {outbreaks.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {outbreaks.map((outbreak) => (
            <OutbreakCard
              outbreak={outbreak}
              key={outbreak.outbreak_id || outbreak.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="No Active Outbreak Zones"
          description="There are currently no pathogen outbreaks or active containment zones in your vendor service area."
        />
      )}
    </div>
  );
}
