import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { LocateFixed, Save, UserRound } from "lucide-react";
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
        toast.success("Location added to profile form.");
      },
      () => toast.error("Unable to read current location.")
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
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading vendor profile..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section>
        <p className="text-sm font-bold uppercase text-emerald-300">Settings</p>
        <h2 className="mt-2 text-3xl font-black text-white">Vendor Profile</h2>
        <p className="mt-2 text-sm text-slate-400">
          Keep your business details and GPS coordinates current for nearby-farm calculations.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <form
        className="rounded-lg border border-emerald-900/30 bg-white/[0.04] p-5 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="mb-6 flex items-center gap-4 border-b border-emerald-900/30 pb-5">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <UserRound size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {profile.business_name || "Vendor Business"}
            </h3>
            <p className="text-sm text-slate-400">{profile.email || "Registered email"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Full Name</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="full_name"
              onChange={updateField}
              value={profile.full_name}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Business Name</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="business_name"
              onChange={updateField}
              value={profile.business_name}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Phone Number</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="phone_number"
              onChange={updateField}
              value={profile.phone_number}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Vendor Type</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-slate-400 outline-none"
              disabled
              value={profile.vendor_type || ""}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-slate-300">Address</span>
            <textarea
              className="min-h-24 w-full resize-none rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="address"
              onChange={updateField}
              value={profile.address}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Latitude</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="latitude"
              onChange={updateField}
              type="number"
              step="any"
              value={profile.latitude}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">Longitude</span>
            <input
              className="w-full rounded-lg border border-emerald-900/40 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-400"
              name="longitude"
              onChange={updateField}
              type="number"
              step="any"
              value={profile.longitude}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200"
            onClick={useBrowserLocation}
            type="button"
          >
            <LocateFixed size={17} />
            Use Current Location
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-emerald-950 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
