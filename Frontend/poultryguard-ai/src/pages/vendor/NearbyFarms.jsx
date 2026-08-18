import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Map, MapPin, Navigation, RefreshCcw, Search, Warehouse } from "lucide-react";
import { toast } from "react-toastify";
import FarmCard from "../../components/vendor/FarmCard";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { getNearbyFarms } from "../../services/vendorService";
import { calculateDistance } from "../../utils/haversine";

export default function NearbyFarms() {
  const [farms, setFarms] = useState([]);
  const [vendorLocation, setVendorLocation] = useState(null);
  const [search, setSearch] = useState("");
  const [farmType, setFarmType] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("distance");
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    void load();
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const newLocation = { latitude: lat, longitude: lng };
        setVendorLocation(newLocation);
        setFarms((prev) =>
          prev.map((f) => ({
            ...f,
            distance: calculateDistance(lat, lng, f.latitude, f.longitude),
          }))
        );
        setDetecting(false);
        toast.success("Vendor location detected successfully.");
      },
      () => {
        setDetecting(false);
        toast.error("Unable to detect current location. Please check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const visibleFarms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return farms
      .filter((farm) => {
        const matchesSearch =
          !query ||
          farm.farm_name?.toLowerCase().includes(query) ||
          farm.full_name?.toLowerCase().includes(query) ||
          farm.address?.toLowerCase().includes(query);

        const matchesType = farmType === "All" || farm.farm_type === farmType;

        let matchesRadius = true;
        if (radiusFilter !== "All" && Number.isFinite(farm.distance)) {
          const maxRadius = parseFloat(radiusFilter);
          matchesRadius = farm.distance <= maxRadius;
        }

        return matchesSearch && matchesType && matchesRadius;
      })
      .sort((a, b) => {
        if (sortBy === "birds")
          return Number(b.total_birds || 0) - Number(a.total_birds || 0);
        if (sortBy === "name")
          return (a.farm_name || "").localeCompare(b.farm_name || "");
        return (
          (a.distance ?? Number.POSITIVE_INFINITY) -
          (b.distance ?? Number.POSITIVE_INFINITY)
        );
      });
  }, [farmType, farms, radiusFilter, search, sortBy]);

  if (loading)
    return <LoadingSpinner message="Calculating geodesic distances to nearby farms..." />;

  const hasLocation =
    vendorLocation?.latitude != null && vendorLocation?.longitude != null;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Farm Network
            </span>
            {hasLocation && (
              <span className="text-xs text-gray-500 font-semibold">
                Hub: {Number(vendorLocation.latitude).toFixed(4)}, {Number(vendorLocation.longitude).toFixed(4)}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Nearby Poultry Farms
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Distance is calculated in kilometers from your registered vendor hub using the Haversine formula.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleUseCurrentLocation}
            disabled={detecting}
            className="btn-secondary text-xs"
          >
            <Navigation size={15} />
            <span>{detecting ? "Detecting GPS..." : "Use My Current Location"}</span>
          </button>

          <Link
            className="btn text-xs"
            to="/vendor/map-view"
          >
            <Map size={15} />
            <span>Open Interactive Map</span>
          </Link>
        </div>
      </div>

      {!hasLocation && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <span>
            Vendor GPS coordinates are missing. Click <b>"Use My Current Location"</b> above or update coordinates in{" "}
            <Link className="font-bold underline text-[#166534]" to="/vendor/profile">
              Vendor Profile
            </Link>{" "}
            to enable live distance calculations.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              className="input pl-10 text-xs"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by farm, owner, or city..."
              value={search}
            />
          </div>

          {/* Radius Filter */}
          <div>
            <select
              className="input text-xs"
              onChange={(event) => setRadiusFilter(event.target.value)}
              value={radiusFilter}
            >
              <option value="All">All Distances</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>

          <div>
            <select
              className="input text-xs"
              onChange={(event) => setFarmType(event.target.value)}
              value={farmType}
            >
              <option value="All">All Farm Types</option>
              <option value="Broiler">Broiler Farms</option>
              <option value="Layer">Layer Farms</option>
              <option value="Breeder">Breeder Farms</option>
            </select>
          </div>

          <div>
            <select
              className="input text-xs"
              onChange={(event) => setSortBy(event.target.value)}
              value={sortBy}
            >
              <option value="distance">Sort by Closest Distance</option>
              <option value="birds">Sort by Total Birds (High to Low)</option>
              <option value="name">Sort by Farm Name (A–Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Farms Grid ── */}
      {visibleFarms.length ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleFarms.map((farm) => (
            <FarmCard farm={farm} key={farm.farmer_id || farm.id} />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={Warehouse}
          title="No Matching Farms Found"
          description="Try selecting a wider radius filter or choosing 'All Farm Types'."
        />
      )}
    </div>
  );
}
