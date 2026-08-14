import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, LogOut, ChevronDown, Shield, Calendar } from "lucide-react";

export default function AdminNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasNotif, setHasNotif] = useState(true);
  const dropRef = useRef(null);

  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();

  const adminName = user.full_name || user.name || "Admin User";
  const adminRole = sessionStorage.getItem("role") || "Admin";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
        {/* ── Left: Menu + Date ── */}
        <div className="flex items-center gap-4">
          <button
            id="admin-menu-toggle"
            onClick={onMenuClick}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#166534] hover:text-white transition-all duration-200 md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-gray-500">
            <Calendar size={14} className="text-[#166534]" />
            <span className="text-sm font-medium">{today}</span>
          </div>
        </div>

        {/* ── Right: Bell + Profile ── */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            id="admin-notifications-btn"
            onClick={() => setHasNotif(false)}
            className="relative p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            title="Notifications"
          >
            <Bell size={18} />
            {hasNotif && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              id="admin-profile-dropdown"
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#166534] to-[#22c55e] flex items-center justify-center text-white text-xs font-extrabold">
                {adminName[0]?.toUpperCase() || "A"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-800 leading-none">{adminName}</p>
                <p className="text-xs text-[#166534] font-semibold flex items-center gap-1 mt-0.5">
                  <Shield size={10} /> {adminRole}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">{adminName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {user.email || "admin@poultryguard.ai"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors duration-150"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
