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
import { AlertTriangle } from "lucide-react";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import { getNearbyFarms, getOutbreakAlerts } from "../../services/vendorService";
import { calculateDistance } from "../../utils/haversine";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const vendorIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

export default function MapView() {
  const [vendorLocation, setVendorLocation] = useState(null);
  const [farms, setFarms] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
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
        setError(err.message || "Unable to load map data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const center = useMemo(() => {
    if (isValidCoordinate(vendorLocation?.latitude, vendorLocation?.longitude)) {
      return [Number(vendorLocation.latitude), Number(vendorLocation.longitude)];
    }

    const firstFarm = farms.find((farm) => isValidCoordinate(farm.latitude, farm.longitude));
    if (firstFarm) return [Number(firstFarm.latitude), Number(firstFarm.longitude)];

    return [18.5204, 73.8567];
  }, [farms, vendorLocation]);

  const sourceFarmById = useMemo(() => {
    const map = new Map();
    farms.forEach((farm) => map.set(Number(farm.farmer_id), farm));
    return map;
  }, [farms]);

  if (loading) return <LoadingSpinner message="Preparing map view..." />;

  const hasVendorLocation = isValidCoordinate(
    vendorLocation?.latitude,
    vendorLocation?.longitude
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase text-emerald-300">Geospatial</p>
        <h2 className="mt-2 text-3xl font-black text-white">Map View</h2>
        <p className="mt-2 text-sm text-slate-400">
          View vendor location, nearby farm markers, and active outbreak zones.
        </p>
      </section>

      {!hasVendorLocation && (
        <div className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <AlertTriangle className="shrink-0" size={18} />
          <span>
            Vendor GPS location is missing. Update coordinates in{" "}
            <Link className="font-bold underline" to="/vendor/profile">
              Profile
            </Link>
            .
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="h-[620px] overflow-hidden rounded-lg border border-emerald-900/30 bg-white/[0.04]">
        <MapContainer
          center={center}
          className="h-full w-full"
          scrollWheelZoom
          zoom={12}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {hasVendorLocation && (
            <Marker position={center} icon={vendorIcon}>
              <Popup>
                <strong>Vendor Location</strong>
                <br />
                {Number(vendorLocation.latitude).toFixed(5)},{" "}
                {Number(vendorLocation.longitude).toFixed(5)}
              </Popup>
            </Marker>
          )}

          {farms.map((farm) => {
            if (!isValidCoordinate(farm.latitude, farm.longitude)) return null;

            return (
              <Marker
                key={farm.farmer_id}
                position={[Number(farm.latitude), Number(farm.longitude)]}
              >
                <Popup>
                  <strong>{farm.farm_name || "Farm"}</strong>
                  <br />
                  Farm Type: {farm.farm_type || "N/A"}
                  <br />
                  Bird Count: {Number(farm.total_birds || 0).toLocaleString()}
                  <br />
                  Distance: {Number.isFinite(farm.distance) ? `${farm.distance} KM` : "N/A"}
                </Popup>
              </Marker>
            );
          })}

          {outbreaks.map((outbreak) => {
            const sourceFarm = sourceFarmById.get(Number(outbreak.source_farm_id));
            if (!sourceFarm || !isValidCoordinate(sourceFarm.latitude, sourceFarm.longitude)) {
              return null;
            }

            return (
              <Circle
                center={[Number(sourceFarm.latitude), Number(sourceFarm.longitude)]}
                key={outbreak.outbreak_id}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  fillOpacity: 0.16,
                  weight: 2,
                }}
                radius={Number(outbreak.radius_km || 0) * 1000}
              >
                <Popup>
                  <strong>{outbreak.disease_name || "Outbreak Zone"}</strong>
                  <br />
                  Radius: {outbreak.radius_km || 0} KM
                  <br />
                  Status: {outbreak.status || "Unknown"}
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </section>
    </div>
  );
}
