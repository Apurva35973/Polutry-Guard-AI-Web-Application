import React from "react";

export default function DashboardCard({ title, value, icon: Icon, tone = "emerald", caption }) {
  const tones = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  };

  return (
    <article className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{title}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-white">{value}</p>
        </div>

        <div className={`rounded-lg border p-3 ${tones[tone] || tones.emerald}`}>
          <Icon size={24} />
        </div>
      </div>

      {caption && <p className="mt-4 text-sm text-slate-400">{caption}</p>}
    </article>
  );
}
