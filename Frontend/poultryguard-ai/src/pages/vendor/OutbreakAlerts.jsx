import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import OutbreakCard from "../../components/vendor/OutbreakCard";
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

  if (loading) return <LoadingSpinner message="Loading outbreak alerts..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase text-red-300">Containment</p>
          <h2 className="mt-2 flex items-center gap-2 text-3xl font-black text-white">
            <ShieldAlert size={28} />
            Outbreak Alerts
          </h2>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200"
          onClick={loadOutbreaks}
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

      {outbreaks.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {outbreaks.map((outbreak) => (
            <OutbreakCard outbreak={outbreak} key={outbreak.outbreak_id} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-12 text-center">
          <p className="font-bold text-white">No active outbreaks</p>
          <p className="mt-2 text-sm text-slate-400">There are no current containment zones.</p>
        </div>
      )}
    </div>
  );
}
