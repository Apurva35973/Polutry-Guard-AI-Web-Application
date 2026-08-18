import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, LogOut, ChevronDown, Shield, Calendar, UserRound } from "lucide-react";

export default function UnifiedNavbar({
  roleTitle = "Farmer Portal",
  onMenuClick,
}) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasNotif, setHasNotif] = useState(true);
  const dropRef = useRef(null);

  const user = (() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("user")) ||
        {}
      );
    } catch {
      return {};
    }
  })();

  const rawRole =
    sessionStorage.getItem("role") ||
    localStorage.getItem("role") ||
    "User";

  const userName =
    user.full_name ||
    user.name ||
    user.business_name ||
    user.email?.split("@")[0] ||
    `${rawRole} User`;

  const userEmail =
    user.email ||
    sessionStorage.getItem("email") ||
    localStorage.getItem("email") ||
    "";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 gap-4">
        {/* ── Left: Mobile Menu Toggle + Date ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-[#166534] hover:text-white transition-all duration-200 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-gray-600 font-medium text-sm">
            <Calendar size={15} className="text-[#166534]" />
            <span>{today}</span>
          </div>
        </div>

        {/* ── Right: Bell + Profile Pill ── */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => setHasNotif(false)}
            className="relative p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
            title="Notifications"
          >
            <Bell size={18} />
            {hasNotif && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#166534] to-[#22c55e] flex items-center justify-center text-white text-xs font-extrabold shadow-xs">
                {userName[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-800 leading-none">
                  {userName}
                </p>
                <p className="text-xs text-[#166534] font-semibold flex items-center gap-1 mt-0.5">
                  <Shield size={10} /> {rawRole}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {userEmail}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors duration-150"
                >
                  <LogOut size={16} />
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
