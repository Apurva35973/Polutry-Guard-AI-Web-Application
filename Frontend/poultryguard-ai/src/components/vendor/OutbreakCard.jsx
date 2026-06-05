import React from "react";
import { CalendarClock, Radar, ShieldAlert } from "lucide-react";

export default function OutbreakCard({ outbreak }) {
  const active = outbreak.status === "Active";

  return (
    <article className="rounded-lg border border-red-500/25 bg-red-500/10 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-red-400/25 bg-black/20 p-3 text-red-300">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {outbreak.disease_name || "Disease Alert"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Source Farm #{outbreak.source_farm_id || "N/A"}
            </p>
          </div>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${
          active
            ? "border-red-400/40 bg-red-400/15 text-red-200"
            : "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
        }`}>
          {outbreak.status || "Unknown"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-red-500/20 bg-black/20 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Radar size={14} />
            Radius
          </p>
          <p className="mt-2 text-lg font-black text-red-200">
            {outbreak.radius_km || 0} KM
          </p>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-black/20 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <CalendarClock size={14} />
            Alert Time
          </p>
          <p className="mt-2 text-sm font-bold text-white">
            {outbreak.created_at || outbreak.alert_time
              ? new Date(outbreak.created_at || outbreak.alert_time).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </div>
    </article>
  );
}
