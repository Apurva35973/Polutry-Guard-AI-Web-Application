import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import VendorSidebar from "../components/vendor/VendorSidebar";
import UnifiedNavbar from "../components/common/UnifiedNavbar";

export default function VendorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800">
      {/* Sidebar */}
      <VendorSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="min-h-screen md:pl-64 flex flex-col">
        <UnifiedNavbar
          roleTitle="Vendor Portal"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
