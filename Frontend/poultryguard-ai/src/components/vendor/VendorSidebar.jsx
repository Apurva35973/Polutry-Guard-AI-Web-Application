import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/vendor/dashboard", icon: LayoutDashboard },
  { label: "Nearby Farms", path: "/vendor/nearby-farms", icon: MapPin },
  { label: "Map View", path: "/vendor/map-view", icon: Map },
  { label: "Alerts", path: "/vendor/alerts", icon: Bell },
  { label: "Outbreaks", path: "/vendor/outbreak-alerts", icon: ShieldAlert },
  { label: "Profile", path: "/vendor/profile", icon: User },
];

export default function VendorSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation backdrop"
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={onClose}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-emerald-900/30 bg-[#07130f]/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-emerald-900/30 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-emerald-950">
              PG
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">PoultryGuard AI</p>
              <p className="text-xs text-emerald-300/80">Vendor Console</p>
            </div>
          </div>

          <button
            className="rounded-lg border border-emerald-800/40 p-2 text-emerald-200 md:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-950/30"
                      : "text-slate-300 hover:bg-emerald-950/60 hover:text-white"
                  }`
                }
                key={item.path}
                onClick={onClose}
                to={item.path}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-emerald-900/30 p-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-950/40 hover:text-red-100"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
