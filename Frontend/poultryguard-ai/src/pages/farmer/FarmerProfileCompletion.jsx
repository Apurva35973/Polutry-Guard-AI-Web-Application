import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { completeFarmerProfile } from "../../services/authService";

const initialForm = {
  farm_name: " ",
  farm_type: "Broiler",
  address: " ",
  latitude: " " ,
  longitude: " ",
};

export default function FarmerProfileCompletion() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => value === "")) {
      toast.warning("Please complete all farm profile fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await completeFarmerProfile(form);
      if (result.status !== "success") {
        toast.error(result.error || "Unable to complete your farm profile.");
        return;
      }

      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const updatedUser = { ...user, ...form, profile_completed: true };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Farm profile completed.");
      navigate("/farmer/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to complete your farm profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand-mark">PG</div>
          <p className="auth-kicker">One-time setup</p>
          <h1>Complete your farm profile.</h1>
          <p className="auth-brand-copy">
            Add your farm details once so PoultryGuard AI can personalize monitoring for your location.
          </p>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-kicker">Farm details</p>
            <h2>Tell us about your farm</h2>
            <p>This is shown only for a new or incomplete farmer profile.</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">Farm name<input name="farm_name" value={form.farm_name} onChange={updateField} /></label>
            <label className="auth-field">Farm type<select name="farm_type" value={form.farm_type} onChange={updateField}><option>Broiler</option><option>Layer</option><option>Breeder</option></select></label>
            <label className="auth-field">Address<textarea name="address" value={form.address} onChange={updateField} /></label>
            <label className="auth-field">Latitude<input name="latitude" type="number" step="any" value={form.latitude} onChange={updateField} /></label>
            <label className="auth-field">Longitude<input name="longitude" type="number" step="any" value={form.longitude} onChange={updateField} /></label>
            <button className="auth-primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Complete profile"}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
