import React from "react";
import { Bird, MapPin, Navigation, UserRound } from "lucide-react";

export default function FarmCard({ farm }) {
  const distance = Number.isFinite(farm.distance) ? farm.distance.toFixed(1) : null;

  const typeStyles = {
    Broiler: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    Layer: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    Breeder: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200",
  };

  return (
    <article className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-5 shadow-xl shadow-black/10 transition hover:border-emerald-500/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">{farm.farm_name || "Unnamed Farm"}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
            <UserRound size={15} />
            {farm.full_name || farm.owner_name || "Unknown owner"}
          </p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeStyles[farm.farm_type] || "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>
          {farm.farm_type || "Farm"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-900/30 bg-black/20 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Bird size={14} />
            Bird Count
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {Number(farm.total_birds || 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-900/30 bg-black/20 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Navigation size={14} />
            Distance
          </p>
          <p className="mt-2 text-lg font-black text-emerald-300">
            {distance ? `${distance} KM` : "N/A"}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={14} />
        {farm.latitude && farm.longitude
          ? `${Number(farm.latitude).toFixed(4)}, ${Number(farm.longitude).toFixed(4)}`
          : "Coordinates unavailable"}
      </p>
    </article>
  );
}
