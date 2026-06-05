import React from "react";
import { useLocation } from "react-router-dom";
import { Menu, UserRound } from "lucide-react";

const titles = {
  "/vendor/dashboard": "Dashboard",
  "/vendor/nearby-farms": "Nearby Farms",
  "/vendor/map-view": "Map View",
  "/vendor/alerts": "Alerts",
  "/vendor/outbreak-alerts": "Outbreak Alerts",
  "/vendor/profile": "Profile",
};

export default function VendorNavbar({ onMenuClick }) {
  const location = useLocation();
  const title = titles[location.pathname] || "Vendor Console";
  const email = localStorage.getItem("email") || "vendor@poultryguard.ai";

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-emerald-900/30 bg-[#07130f]/85 px-4 text-white backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg border border-emerald-800/50 p-2 text-emerald-200 md:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-xs text-slate-400">Vendor operations and farm intelligence</p>
        </div>
      </div>

      <div className="hidden items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 sm:flex">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <UserRound size={18} />
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-white">Vendor</p>
          <p className="max-w-48 truncate text-xs text-slate-400">{email}</p>
        </div>
      </div>
    </header>
  );
}
