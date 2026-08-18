import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Shield, Navigation, MapPin } from "lucide-react";
import { completeFarmerProfile } from "../../services/authService";

const initialForm = {
  farm_name: "",
  farm_type: "Broiler",
  address: "",
  latitude: "",
  longitude: "",
};

export default function FarmerProfileCompletion() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const navigate = useNavigate();

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Unable to detect your location. Please enter the location manually.");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm((current) => ({
          ...current,
          latitude: lat,
          longitude: lng,
        }));
        setDetecting(false);
        toast.success("Location detected successfully.");
      },
      (err) => {
        setDetecting(false);
        toast.error("Unable to detect your location. Please enter the location manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => String(value).trim() === "")) {
      toast.warning("Please complete all farm profile fields.");
      return;
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.warning("Latitude must be between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast.warning("Longitude must be between -180 and 180.");
      return;
    }

    setLoading(true);
    try {
      const result = await completeFarmerProfile({
        ...form,
        latitude: lat,
        longitude: lng,
      });
      if (result.status !== "success") {
        toast.error(result.error || "Unable to complete your farm profile.");
        return;
      }

      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const updatedUser = { ...user, ...form, latitude: lat, longitude: lng, profile_completed: true };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Farm profile completed successfully.");
      navigate("/farmer/dashboard", { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          "Unable to complete your farm profile."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand-mark">PG</div>
          <div>
            <p className="auth-kicker">One-Time Onboarding</p>
            <h1>Complete Your Farm Profile</h1>
            <p className="auth-brand-copy">
              Add your farm location and shed type to personalize biosecurity monitoring and IoT alerts.
            </p>
          </div>
          <div className="text-xs text-emerald-200/80 font-medium">
            PoultryGuard AI · Intelligent Poultry Management
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-kicker">Farm Details</p>
            <h2>Tell Us About Your Farm</h2>
            <p>This is configured once to initialize your farm telemetry dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">
              Farm Name
              <input
                required
                name="farm_name"
                placeholder="e.g. Sunrise Broiler Farm"
                value={form.farm_name}
                onChange={updateField}
              />
            </label>

            <label className="auth-field">
              Farm Type
              <select
                name="farm_type"
                value={form.farm_type}
                onChange={updateField}
              >
                <option>Broiler</option>
                <option>Layer</option>
                <option>Breeder</option>
              </select>
            </label>

            <label className="auth-field">
              Physical Location / Address
              <textarea
                required
                name="address"
                placeholder="Village / City, District..."
                value={form.address}
                onChange={updateField}
              />
            </label>

            {/* Farm Coordinates & Geolocation button */}
            <div className="auth-field">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="m-0">Farm Coordinates</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={detecting}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#166534] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                >
                  <Navigation size={12} />
                  <span>{detecting ? "Detecting..." : "Use My Current Location"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    required
                    name="latitude"
                    type="number"
                    step="any"
                    placeholder="Latitude (-90 to 90)"
                    value={form.latitude}
                    onChange={updateField}
                  />
                </div>

                <div>
                  <input
                    required
                    name="longitude"
                    type="number"
                    step="any"
                    placeholder="Longitude (-180 to 180)"
                    value={form.longitude}
                    onChange={updateField}
                  />
                </div>
              </div>
            </div>

            <button
              className="auth-primary-btn mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving Profile..." : "Complete Setup & Open Dashboard"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
