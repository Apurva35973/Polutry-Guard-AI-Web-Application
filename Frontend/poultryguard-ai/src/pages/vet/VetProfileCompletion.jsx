import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeVeterinarianProfile } from "../../services/authService";

export default function VetProfileCompletion() {
  const [form, setForm] = useState({
    specialization: "",
    license_number: "",
    experience_years: "",
    hospital_clinic: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await completeVeterinarianProfile(form);
      if (result.status !== "success") throw new Error(result.error);
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const updated = { ...user, ...form, profile_completed: true };
      sessionStorage.setItem("user", JSON.stringify(updated));
      localStorage.setItem("user", JSON.stringify(updated));
      navigate("/vet/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Unable to save veterinarian profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand-mark">PG</div>
          <div>
            <p className="auth-kicker">Veterinarian Onboarding</p>
            <h1>Complete Your Professional Profile</h1>
            <p className="auth-brand-copy">
              Provide clinical credentials and clinic information to enable seamless farm consultation assignments.
            </p>
          </div>
          <div className="text-xs text-emerald-200/80 font-medium">
            PoultryGuard AI · Veterinary Network
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-kicker">One-Time Setup</p>
            <h2>Clinical Credentials</h2>
            <p>You can access your clinical dashboard immediately after saving this profile.</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {[
              ["Specialization", "specialization", "e.g. Avian Pathology & Poultry Health", "text"],
              ["License Number", "license_number", "e.g. VET-MH-2024-8849", "text"],
              ["Experience (Years)", "experience_years", "e.g. 8", "number"],
              ["Hospital / Clinic Name", "hospital_clinic", "e.g. Avian Health Research & Care", "text"],
            ].map(([label, name, placeholder, type]) => (
              <div className="auth-field" key={name}>
                <label>{label}</label>
                <input
                  required
                  type={type}
                  min={type === "number" ? "0" : undefined}
                  value={form[name]}
                  placeholder={placeholder}
                  onChange={(e) =>
                    setForm({ ...form, [name]: e.target.value })
                  }
                />
              </div>
            ))}

            {error && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {error}
              </p>
            )}

            <button className="auth-primary-btn mt-2" disabled={saving}>
              {saving ? "Saving Profile..." : "Save and Continue to Dashboard"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
