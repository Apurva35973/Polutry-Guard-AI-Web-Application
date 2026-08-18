import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  ClipboardList,
  Bell,
  Calendar,
  FileText,
  Cpu,
  User,
  LogOut,
  ChevronRight,
  Shield,
  X,
} from "lucide-react";
import UnifiedNavbar from "../components/common/UnifiedNavbar";

const navItems = [
  { label: "Dashboard", path: "/farmer/dashboard", icon: LayoutDashboard },
  { label: "Farm Monitoring", path: "/farmer/monitoring", icon: Activity },
  { label: "Disease & Health", path: "/farmer/health", icon: HeartPulse },
  { label: "Flock Mortality", path: "/farmer/mortality", icon: ClipboardList },
  { label: "Alerts", path: "/farmer/alerts", icon: Bell },
  { label: "Reminders", path: "/farmer/reminders", icon: Calendar },
  { label: "Reports", path: "/farmer/reports", icon: FileText },
  { label: "My Devices", path: "/farmer/devices", icon: Cpu },
  { label: "Profile", path: "/farmer/profile", icon: User },
];

export default function FarmerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo Header ── */}
      <div className="flex items-center gap-3 px-6 py-7 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-xs">
          <Shield size={20} className="text-[#84cc16]" />
        </div>
        <div>
          <p className="font-extrabold text-white text-sm leading-none">PoultryGuard</p>
          <p className="text-[#84cc16] text-xs font-semibold mt-0.5">Farmer Portal</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-400 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? "bg-white/15 text-white shadow-md"
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
                  size={19}
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

      {/* ── Logout Button ── */}
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
    <div className="min-h-screen bg-[#f8fafc] text-gray-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-gradient-to-b from-[#0f2419] via-[#142e1e] to-[#0f2419] border-r border-white/8 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 flex flex-col bg-gradient-to-b from-[#0f2419] via-[#142e1e] to-[#0f2419] border-r border-white/8 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="min-h-screen md:pl-64 flex flex-col">
        <UnifiedNavbar
          roleTitle="Farmer Portal"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
