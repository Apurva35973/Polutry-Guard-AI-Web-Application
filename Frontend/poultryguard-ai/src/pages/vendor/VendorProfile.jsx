import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, LocateFixed, Save, Store, UserRound } from "lucide-react";
import LoadingSpinner from "../../components/vendor/LoadingSpinner";
import { getProfile, updateProfile } from "../../services/vendorService";

const emptyProfile = {
  full_name: "",
  business_name: "",
  phone_number: "",
  address: "",
  latitude: "",
  longitude: "",
  email: "",
  vendor_type: "",
};

export default function VendorProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getProfile();
        const current = Array.isArray(data) ? data[0] || {} : data || {};

        setProfile({
          ...emptyProfile,
          ...current,
          latitude: current.latitude ?? "",
          longitude: current.longitude ?? "",
        });
      } catch (err) {
        setError(err.message || "Unable to load vendor profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        toast.success("Current GPS coordinates populated into form.");
      },
      () => toast.error("Unable to read current device GPS location.")
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      full_name: profile.full_name,
      business_name: profile.business_name,
      phone_number: profile.phone_number,
      address: profile.address,
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
    };

    if (!payload.full_name || !payload.business_name || !payload.phone_number) {
      toast.warning("Full name, business name, and phone number are required.");
      return;
    }

    try {
      setSaving(true);
      await updateProfile(payload);
      toast.success("Vendor profile updated successfully.");
    } catch (err) {
      toast.error(err.message || "Unable to update vendor profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading profile details..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── Header ── */}
      <div className="border-b border-gray-200/80 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Account Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
          Vendor Business Profile
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Maintain accurate business contact information and GPS coordinates for client farm distance calculations.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        {/* Business Header Card */}
        <div className="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#166534] flex items-center justify-center font-black shadow-xs">
            <Store size={30} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {profile.business_name || "Vendor Business Name"}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              {profile.email || "Registered Vendor Account"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Full Contact Name
            <input
              className="input"
              name="full_name"
              onChange={updateField}
              value={profile.full_name}
              placeholder="e.g. John Doe"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Business / Company Name
            <input
              className="input"
              name="business_name"
              onChange={updateField}
              value={profile.business_name}
              placeholder="e.g. AgriTech Supplies Pvt Ltd"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Phone Number
            <input
              className="input"
              name="phone_number"
              onChange={updateField}
              value={profile.phone_number}
              placeholder="e.g. +91 98765 43210"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Vendor Specialization
            <input
              className="input bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
              value={profile.vendor_type || "Hardware & Sensor Kits"}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700 md:col-span-2">
            Facility Physical Address
            <textarea
              className="input min-h-24 resize-none"
              name="address"
              onChange={updateField}
              value={profile.address}
              placeholder="Full warehouse or shop address..."
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Latitude (GPS)
            <input
              className="input font-mono"
              name="latitude"
              onChange={updateField}
              type="number"
              step="any"
              value={profile.latitude}
              placeholder="e.g. 18.5204"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-gray-700">
            Longitude (GPS)
            <input
              className="input font-mono"
              name="longitude"
              onChange={updateField}
              type="number"
              step="any"
              value={profile.longitude}
              placeholder="e.g. 73.8567"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 pt-6">
          <button
            className="btn-secondary"
            onClick={useBrowserLocation}
            type="button"
          >
            <LocateFixed size={16} className="text-[#166534]" />
            <span>Use My Current Location</span>
          </button>

          <button
            className="btn"
            disabled={saving}
            type="submit"
          >
            <Save size={16} />
            <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
