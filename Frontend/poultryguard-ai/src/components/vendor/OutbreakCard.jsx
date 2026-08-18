import React from "react";
import { CalendarClock, Radar, ShieldAlert, Zap } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function OutbreakCard({ outbreak }) {
  const active = outbreak.status === "Active" || outbreak.status === "ACTIVE";

  return (
    <article className="rounded-2xl border border-red-200 bg-red-50/90 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center flex-shrink-0 font-extrabold shadow-xs">
            <ShieldAlert size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-lg font-black text-red-950 leading-tight">
              {outbreak.disease_name || "Disease Containment Alert"}
            </h3>
            <p className="mt-1 text-xs text-red-800 font-semibold">
              Origin: Source Farm #{outbreak.source_farm_id || "N/A"}
            </p>
          </div>
        </div>

        <StatusBadge
          status={active ? "CRITICAL" : "RESOLVED"}
          label={outbreak.status || "Active"}
          size="sm"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-200/80 bg-white/80 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-900">
            <Radar size={14} className="text-red-600" />
            Containment Radius
          </p>
          <p className="mt-1 text-lg font-black text-red-950">
            {outbreak.radius_km || 0} KM
          </p>
        </div>

        <div className="rounded-xl border border-red-200/80 bg-white/80 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-900">
            <CalendarClock size={14} className="text-red-600" />
            Alert Broadcast Time
          </p>
          <p className="mt-1 text-xs font-bold text-red-950">
            {outbreak.created_at || outbreak.alert_time
              ? new Date(outbreak.created_at || outbreak.alert_time).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "Active"}
          </p>
        </div>
      </div>
    </article>
  );
}
