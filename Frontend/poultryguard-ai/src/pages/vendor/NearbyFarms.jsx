import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Map, Search } from "lucide-react";
import FarmCard from "../../components/vendor/FarmCard";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import { getNearbyFarms } from "../../services/vendorService";
import { calculateDistance } from "../../utils/haversine";

export default function NearbyFarms() {
  const [farms, setFarms] = useState([]);
  const [vendorLocation, setVendorLocation] = useState(null);
  const [search, setSearch] = useState("");
  const [farmType, setFarmType] = useState("All");
  const [sortBy, setSortBy] = useState("distance");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getNearbyFarms();
        const location = data?.vendor_location || null;
        const farmRows = Array.isArray(data?.farms) ? data.farms : [];

        setVendorLocation(location);
        setFarms(
          farmRows.map((farm) => ({
            ...farm,
            distance: calculateDistance(
              location?.latitude,
              location?.longitude,
              farm.latitude,
              farm.longitude
            ),
          }))
        );
      } catch (err) {
        setError(err.message || "Unable to load nearby farms.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const visibleFarms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return farms
      .filter((farm) => {
        const matchesSearch =
          !query ||
          farm.farm_name?.toLowerCase().includes(query) ||
          farm.full_name?.toLowerCase().includes(query);
        const matchesType = farmType === "All" || farm.farm_type === farmType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "birds") return Number(b.total_birds || 0) - Number(a.total_birds || 0);
        if (sortBy === "name") return (a.farm_name || "").localeCompare(b.farm_name || "");
        return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
      });
  }, [farmType, farms, search, sortBy]);

  if (loading) return <LoadingSpinner message="Calculating farm distances..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-300">Network</p>
          <h2 className="mt-2 text-3xl font-black text-white">Nearby Farms</h2>
          <p className="mt-2 text-sm text-slate-400">
            Distance is calculated in kilometers using the Haversine formula.
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-black text-emerald-950"
          to="/vendor/map-view"
        >
          <Map size={17} />
          Open Map
        </Link>
      </div>

      {(!vendorLocation?.latitude || !vendorLocation?.longitude) && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Vendor GPS coordinates are missing. Update latitude and longitude in profile to calculate distances.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid gap-3 rounded-lg border border-emerald-900/30 bg-white/[0.04] p-4 md:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            className="w-full rounded-lg border border-emerald-900/40 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search farm or owner"
            value={search}
          />
        </label>

        <select
          className="rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          onChange={(event) => setFarmType(event.target.value)}
          value={farmType}
        >
          <option>All</option>
          <option>Broiler</option>
          <option>Layer</option>
          <option>Breeder</option>
        </select>

        <select
          className="rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          onChange={(event) => setSortBy(event.target.value)}
          value={sortBy}
        >
          <option value="distance">Sort by Distance</option>
          <option value="birds">Sort by Bird Count</option>
          <option value="name">Sort by Name</option>
        </select>
      </section>

      {visibleFarms.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleFarms.map((farm) => (
            <FarmCard farm={farm} key={farm.farmer_id} />
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-12 text-center">
          <p className="font-bold text-white">No farms found</p>
          <p className="mt-2 text-sm text-slate-400">Try a different search or filter.</p>
        </div>
      )}
    </div>
  );
}
