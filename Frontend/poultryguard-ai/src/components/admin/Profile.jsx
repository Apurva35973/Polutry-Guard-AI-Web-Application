import React, { useEffect, useState } from "react";
import { Save, User, Mail, Phone, Shield, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";
import { getAdminProfile, updateAdminProfile } from "../../services/adminService";

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "Admin",
  });

  // Load from API first, fall back to sessionStorage
  useEffect(() => {
    const loadProfile = async () => {
      setFetching(true);
      try {
        const res = await getAdminProfile();
        if (res.status === "success" && res.data) {
          const d = res.data;
          setFormData({
            full_name: d.full_name || "",
            email: d.email || "",
            phone_number: d.phone_number || "",
            role: d.role || "Admin",
          });
          // Keep sessionStorage in sync
          const existing = JSON.parse(sessionStorage.getItem("user") || "{}");
          sessionStorage.setItem("user", JSON.stringify({ ...existing, ...d }));
        }
      } catch {
        // Fall back to sessionStorage if API is unavailable
        try {
          const user = JSON.parse(sessionStorage.getItem("user")) || {};
          setFormData({
            full_name: user.full_name || "System Admin",
            email: user.email || "admin@poultryguard.com",
            phone_number: user.phone_number || "",
            role: sessionStorage.getItem("role") || "Admin",
          });
        } catch (e) {
          console.error(e);
        }
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await updateAdminProfile({
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        email: formData.email,
      });

      if (res.status === "success") {
        // Persist to sessionStorage
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        sessionStorage.setItem("user", JSON.stringify({ ...user, ...formData }));
        toast.success("Profile updated successfully");
      } else {
        toast.error(res.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCcw size={18} className="animate-spin" />
          <span className="text-sm font-medium">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Profile</h1>
          <p className="text-gray-500 mt-2">Manage your account information</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-green-700 to-green-500 h-32"></div>

          {/* Avatar */}
          <div className="px-8">
            <div className="-mt-12 w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white">
              <User size={40} className="text-green-700" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-8 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Role</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={formData.role}
                  readOnly
                  className="w-full border rounded-xl pl-10 pr-4 py-3 bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold transition"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}