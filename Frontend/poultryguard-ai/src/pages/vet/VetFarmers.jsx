import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  Building,
  MapPin,
  HeartPulse,
  Bell,
  Activity,
  Eye,
  X,
  Phone,
  RefreshCcw,
  Thermometer,
  Droplets,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import {
  getVetFarmers,
  getVetFarmerDetails,
} from "../../services/vetService";

function formatTimestamp(value) {
  if (!value) return "No telemetry yet";
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

export default function VetFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [farmType, setFarmType] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      const res = await getVetFarmers({
        search,
        farm_type: farmType,
        risk: riskFilter,
      });
      if (res.status === "success") {
        setFarmers(res.data || []);
      } else {
        toast.error(res.error || "Failed to load farmers list");
      }
    } catch {
      toast.error("Unable to load farmers directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFarmers();
  }, [farmType, riskFilter]);

  const handleOpenDetails = async (farmerId) => {
    setDrawerOpen(true);
    setDetailsLoading(true);
    try {
      const res = await getVetFarmerDetails(farmerId);
      if (res.status === "success") {
        setSelectedFarmer(res.data);
      } else {
        toast.error(res.error || "Unable to load farm health details");
      }
    } catch {
      toast.error("Failed to fetch detailed farm history.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    const q = search.toLowerCase();
    return (
      !search ||
      (f.full_name || "").toLowerCase().includes(q) ||
      (f.farm_name || "").toLowerCase().includes(q) ||
      (f.address || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <Users size={13} />
              Farm Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Registered Poultry Farms
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Clinical health overview, flock sizes, and environmental risk levels for all client poultry farms.
          </p>
        </div>

        <button
          onClick={loadFarmers}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCcw size={16} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs grid gap-4 md:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by farmer, farm name, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>

        {/* Farm Type */}
        <div>
          <select
            value={farmType}
            onChange={(e) => setFarmType(e.target.value)}
            className="input text-xs"
          >
            <option value="All">All Farm Types</option>
            <option value="Broiler">Broiler</option>
            <option value="Layer">Layer</option>
            <option value="Breeder">Breeder</option>
          </select>
        </div>

        {/* Risk Level */}
        <div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="input text-xs"
          >
            <option value="All">All Risk Levels</option>
            <option value="Low">Low Risk Only</option>
            <option value="Medium">Medium Risk Only</option>
            <option value="High">High Risk Only</option>
          </select>
        </div>
      </div>

      {/* ── Farmers Grid ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Building className="text-[#166534]" size={20} />
            Farm Profiles
          </h2>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filteredFarmers.length} Registered Farms
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
            Loading farm directory...
          </div>
        ) : filteredFarmers.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredFarmers.map((f) => {
              const risk = (f.current_risk || "Low").toUpperCase();

              return (
                <div
                  key={f.farmer_id}
                  className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                          {f.farm_type || "Poultry"} Farm
                        </span>
                        <h3 className="font-extrabold text-gray-900 text-base leading-tight mt-0.5">
                          {f.farm_name || "Unnamed Farm"}
                        </h3>
                        <p className="text-xs font-semibold text-gray-600 mt-0.5">
                          {f.full_name}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          risk === "HIGH"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : risk === "MEDIUM"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {risk} Risk
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-white p-3 rounded-xl border border-gray-200">
                      <p className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{f.address || "Address on file"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <HeartPulse size={13} className="text-gray-400 flex-shrink-0" />
                        <span>Flock: <b>{Number(f.total_birds || 0).toLocaleString()} birds</b></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Activity size={13} className="text-gray-400 flex-shrink-0" />
                        <span>Telemetry: <b>{formatTimestamp(f.last_telemetry_update)}</b></span>
                      </p>
                      {f.active_alerts > 0 && (
                        <p className="flex items-center gap-1.5 text-red-600 font-bold">
                          <Bell size={13} />
                          <span>{f.active_alerts} Active Biosecurity Alerts</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetails(f.farmer_id)}
                    className="btn-secondary text-xs w-full justify-center"
                  >
                    <Eye size={14} />
                    <span>View Health Dossier</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Building}
            title="No farms matching filter"
            description="Try changing the farm type or risk level filter."
          />
        )}
      </div>

      {/* ── Farm Health Dossier Drawer / Modal ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full p-6 sm:p-8 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            {detailsLoading ? (
              <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
                Loading farm health dossier...
              </div>
            ) : selectedFarmer ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Clinical Farm Dossier
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 mt-2">
                    {selectedFarmer.farmer?.farm_name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Farmer: <b>{selectedFarmer.farmer?.full_name}</b> · {selectedFarmer.farmer?.address}
                  </p>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Farm Type</span>
                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">{selectedFarmer.farmer?.farm_type}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Flock Capacity</span>
                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">{Number(selectedFarmer.farmer?.total_birds || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">AI Screenings</span>
                    <p className="font-extrabold text-[#166534] text-sm mt-0.5">{selectedFarmer.predictions?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Alert Events</span>
                    <p className="font-extrabold text-red-600 text-sm mt-0.5">{selectedFarmer.alerts?.length || 0}</p>
                  </div>
                </div>

                {/* AI Disease History */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2.5">
                    Recent AI Disease Screening History
                  </h3>
                  {selectedFarmer.predictions?.length ? (
                    <div className="space-y-2">
                      {selectedFarmer.predictions.slice(0, 5).map((p) => (
                        <div
                          key={p.prediction_id}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                        >
                          <div>
                            <span className="font-bold text-gray-900">{p.disease_name}</span>
                            <p className="text-gray-400 text-[11px]">{formatTimestamp(p.prediction_time)}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#166534]">
                              {p.confidence_score ? `${Number(p.confidence_score).toFixed(1)}%` : "—"}
                            </span>
                            <p className="text-gray-500 font-semibold">{p.risk_level} Risk</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      No AI disease screenings recorded for this farm.
                    </p>
                  )}
                </div>

                {/* Recent Mortality Records */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2.5">
                    Flock Mortality Records
                  </h3>
                  {selectedFarmer.mortality?.length ? (
                    <div className="space-y-2">
                      {selectedFarmer.mortality.slice(0, 5).map((m) => (
                        <div
                          key={m.mortality_id}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                        >
                          <div>
                            <span className="font-bold text-red-600">{m.death_count} Deaths Recorded</span>
                            <p className="text-gray-500 text-[11px]">{m.suspected_cause || "Unspecified cause"}</p>
                          </div>
                          <span className="text-gray-400 font-medium">{formatTimestamp(m.recorded_at)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      No mortality observations recorded.
                    </p>
                  )}
                </div>

                {/* Recent Telemetry Readings */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2.5">
                    Environmental Telemetry History
                  </h3>
                  {selectedFarmer.telemetry?.length ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {selectedFarmer.telemetry.slice(0, 4).map((t, idx) => (
                        <div key={idx} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-center text-xs">
                          <p className="font-extrabold text-gray-900">{t.temperature}°C / {t.humidity}%</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatTimestamp(t.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      No telemetry data recorded.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
