import React, { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  Filter,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import {
  getNearbyFarms,
  getOutbreakAlerts,
} from "../../services/vendorService";
import { calculateDistance } from "../../utils/haversine";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom Vendor Icon (Blue/Emerald Hub)
const vendorIcon = L.divIcon({
  className: "vendor-hub-marker",
  html: `<div style="background-color:#166534;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">🚚</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

// Custom Farm Icon
const farmerIcon = L.divIcon({
  className: "nearby-farmer-marker",
  html: `<div style="background-color:#0284c7;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);font-size:14px;">🏡</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Outbreak Farm Icon
const outbreakFarmIcon = L.divIcon({
  className: "outbreak-farmer-marker",
  html: `<div style="background-color:#ef4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:2.5px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.5);font-size:14px;animation:pulse 2s infinite;">⚠️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

export default function MapView() {
  const [vendorLocation, setVendorLocation] = useState(null);
  const [farms, setFarms] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [search, setSearch] = useState("");
  const [farmType, setFarmType] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("All");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [farmData, outbreakData] = await Promise.all([
        getNearbyFarms(),
        getOutbreakAlerts(),
      ]);

      const location = farmData?.vendor_location || null;
      const farmRows = Array.isArray(farmData?.farms) ? farmData.farms : [];

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

      setOutbreaks(Array.isArray(outbreakData) ? outbreakData : []);
    } catch (err) {
      setError(err.message || "Unable to load geospatial map data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
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
        const newLoc = { latitude: lat, longitude: lng };
        setVendorLocation(newLoc);
        setFarms((prev) =>
          prev.map((f) => ({
            ...f,
            distance: calculateDistance(lat, lng, f.latitude, f.longitude),
          }))
        );
        setDetecting(false);
        toast.success("Vendor GPS position updated.");
      },
      () => {
        setDetecting(false);
        toast.error("Unable to detect current location. Please verify browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const center = useMemo(() => {
    if (isValidCoordinate(vendorLocation?.latitude, vendorLocation?.longitude)) {
      return [Number(vendorLocation.latitude), Number(vendorLocation.longitude)];
    }

    const firstFarm = farms.find((farm) =>
      isValidCoordinate(farm.latitude, farm.longitude)
    );

    if (firstFarm) {
      return [Number(firstFarm.latitude), Number(firstFarm.longitude)];
    }

    return [18.5204, 73.8567];
  }, [farms, vendorLocation]);

  const sourceFarmById = useMemo(() => {
    const map = new Map();
    farms.forEach((farm) => {
      map.set(Number(farm.farmer_id), farm);
    });
    return map;
  }, [farms]);

  const outbreakFarmIds = useMemo(() => {
    const s = new Set();
    outbreaks.forEach((o) => {
      if (o.status === "Active") {
        s.add(Number(o.source_farm_id));
        s.add(Number(o.target_farm_id));
      }
    });
    return s;
  }, [outbreaks]);

  const visibleFarms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return farms.filter((farm) => {
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
    });
  }, [farmType, farms, radiusFilter, search]);

  if (loading) {
    return <LoadingSpinner message="Rendering GIS map overlay..." />;
  }

  const hasVendorLocation = isValidCoordinate(
    vendorLocation?.latitude,
    vendorLocation?.longitude
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              GIS Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            Geospatial Farm & Containment Map
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visual inspection of your vendor hub, nearby client poultry sheds, and active containment quarantine zones.
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
            className="btn-secondary text-xs"
            to="/vendor/nearby-farms"
          >
            <Warehouse size={15} />
            <span>View Farms List</span>
          </Link>
        </div>
      </div>

      {/* ── Filter Controls ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search map by farm or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>

        <div>
          <select
            value={radiusFilter}
            onChange={(e) => setRadiusFilter(e.target.value)}
            className="input text-xs"
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
      </div>

      {/* ── Map Surface ── */}
      <section className="h-[640px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm relative">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Vendor Marker */}
          {hasVendorLocation && (
            <Marker position={center} icon={vendorIcon}>
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold uppercase text-[#166534]">
                    🚚 Your Vendor Hub
                  </p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    Current Dispatch Location
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    {Number(vendorLocation.latitude).toFixed(5)},{" "}
                    {Number(vendorLocation.longitude).toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Farm Markers */}
          {visibleFarms.map((farm) => {
            if (!isValidCoordinate(farm.latitude, farm.longitude)) {
              return null;
            }

            const isOutbreak = outbreakFarmIds.has(Number(farm.farmer_id));
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`;

            return (
              <Marker
                key={farm.farmer_id}
                icon={isOutbreak ? outbreakFarmIcon : farmerIcon}
                position={[Number(farm.latitude), Number(farm.longitude)]}
              >
                <Popup>
                  <div className="p-1.5 min-w-[200px] text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold uppercase text-gray-400 text-[10px]">
                        {farm.farm_type || "Poultry Farm"}
                      </span>
                      {isOutbreak && (
                        <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                          Outbreak Zone
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-black text-gray-900">
                      {farm.farm_name || "Unnamed Farm"}
                    </p>
                    <p className="text-gray-600 mt-0.5">
                      Farmer: <b>{farm.full_name || "Registered Farmer"}</b>
                    </p>
                    <p className="text-gray-600">
                      Flock: <b>{Number(farm.total_birds || 0).toLocaleString()} birds</b>
                    </p>

                    <p className="text-[#166534] font-extrabold mt-1.5 text-xs bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                      Distance: {Number.isFinite(farm.distance) ? `${farm.distance.toFixed(1)} km away` : "N/A"}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-gray-200">
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-xs text-[#166534] hover:underline"
                      >
                        <ExternalLink size={12} />
                        <span>Navigate / Directions</span>
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Outbreak Containment Circles */}
          {outbreaks.map((outbreak) => {
            const sourceFarm = sourceFarmById.get(Number(outbreak.source_farm_id));

            if (!sourceFarm || !isValidCoordinate(sourceFarm.latitude, sourceFarm.longitude)) {
              return null;
            }

            return (
              <Circle
                key={outbreak.outbreak_id}
                center={[Number(sourceFarm.latitude), Number(sourceFarm.longitude)]}
                radius={Number(outbreak.radius_km || 0) * 1000}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  fillOpacity: 0.2,
                  weight: 2.5,
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="text-xs font-bold uppercase text-red-600">
                      ⚠️ Outbreak Quarantine Zone
                    </p>
                    <p className="text-sm font-black text-red-950 mt-0.5">
                      {outbreak.disease_name || "Pathogen Outbreak"}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Containment Radius: <b>{outbreak.radius_km || 0} KM</b>
                    </p>
                    <p className="text-xs text-gray-700">
                      Status: <b>{outbreak.status || "Active"}</b>
                    </p>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </section>
    </div>
  );
}