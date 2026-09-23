import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  BadgeCheck,
  Cpu,
  Wifi,
  Bell,
  Activity,
  BarChart3,
  UserCircle,
  LogOut,
  ChevronRight,
  X,
  Shield,
  ClipboardList,
  PackageCheck,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "People & Farmers",
    path: "/admin/people",
    icon: Users,
  },
  {
    label: "Veterinarians",
    path: "/admin/veterinarians",
    icon: Stethoscope,
  },
  {
    label: "Vet Verification",
    path: "/admin/vet-verification",
    icon: BadgeCheck,
  },
  {
    label: "Hardware Kits",
    path: "/admin/hardware",
    icon: Cpu,
  },
  {
    label: "Hardware Requests",
    path: "/admin/hardware-requests",
    icon: PackageCheck,
  },
  {
    label: "ThingSpeak / Devices",
    path: "/admin/devices",
    icon: Wifi,
  },
  {
    label: "Disease Alerts",
    path: "/admin/alerts",
    icon: Bell,
  },
  {
    label: "Support Center",
    path: "/admin/support",
    icon: ClipboardList,
  },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Profile",
    path: "/admin/profile",
    icon: UserCircle,
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-6 py-7 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Shield size={20} className="text-[#84cc16]" />
        </div>
        <div>
          <p className="font-extrabold text-white text-sm leading-none">PoultryGuard</p>
          <p className="text-[#84cc16] text-xs font-semibold mt-0.5">Admin Console</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-400 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? "bg-white/15 text-white shadow-lg"
                  : "text-gray-300 hover:bg-white/8 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#84cc16]" />
                )}
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors duration-200 ${
                    isActive ? "text-[#84cc16]" : "text-gray-400 group-hover:text-gray-200"
                  }`}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight size={14} className="text-[#84cc16] opacity-70" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className="px-4 pb-6 border-t border-white/10 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-gradient-to-b from-[#0f2419] via-[#142e1e] to-[#0f2419] border-r border-white/8 z-40">
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 flex flex-col bg-gradient-to-b from-[#0f2419] via-[#142e1e] to-[#0f2419] border-r border-white/8 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
