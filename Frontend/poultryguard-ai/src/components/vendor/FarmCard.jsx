import React from "react";
import { Bird, MapPin, Navigation, UserRound, Warehouse, ExternalLink } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function FarmCard({ farm }) {
  const distance = Number.isFinite(farm.distance)
    ? farm.distance.toFixed(1)
    : null;

  const directionsUrl =
    farm.latitude && farm.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`
      : null;

  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#166534] flex items-center justify-center font-extrabold flex-shrink-0">
              <Warehouse size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {farm.farm_name || "Unnamed Farm"}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <UserRound size={13} className="text-gray-400" />
                {farm.full_name || farm.owner_name || "Registered Farmer"}
              </p>
            </div>
          </div>

          <StatusBadge
            status="INFO"
            label={farm.farm_type || "Farm"}
            showDot={false}
            size="sm"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase">
              <Bird size={14} className="text-[#166534]" />
              Bird Count
            </p>
            <p className="mt-1 text-lg font-extrabold text-gray-900">
              {Number(farm.total_birds || 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase">
              <Navigation size={14} className="text-[#166534]" />
              Distance
            </p>
            <p className="mt-1 text-lg font-extrabold text-[#166534]">
              {distance ? `${distance} km away` : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-1">
            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{farm.address || "Address on file"}</span>
          </p>
        </div>
      </div>

      {directionsUrl && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs w-full justify-center"
          >
            <ExternalLink size={14} />
            <span>Navigate / Directions</span>
          </a>
        </div>
      )}
    </article>
  );
}
