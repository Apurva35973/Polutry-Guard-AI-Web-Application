import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import VendorNavbar from "../components/vendor/VendorNavbar";
import VendorSidebar from "../components/vendor/VendorSidebar";

export default function VendorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07130f] text-slate-100">
      <VendorSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen md:pl-72">
        <VendorNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
