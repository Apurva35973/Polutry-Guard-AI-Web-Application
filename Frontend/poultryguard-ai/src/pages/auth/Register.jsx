import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  registerFarmer,
  registerVendor,
  registerVet,
} from "../../services/authService";

const roles = ["Farmer", "Veterinarian", "Vendor"];

export default function Register() {
  const [role, setRole] = useState("Farmer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vetFields, setVetFields] = useState({
    license_number: "",
    specialization: "Avian Medicine & Poultry Health",
    hospital_clinic: "",
    experience_years: "3",
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      return toast.warning("Required fields missing");
    }

    if (role === "Veterinarian") {
      if (!vetFields.license_number.trim()) {
        return toast.warning("Veterinary license number is required");
      }
      if (!certificateFile) {
        return toast.warning("Veterinary license or certificate document is required for verification");
      }
    }

    setLoading(true);

    try {
      let result;
      if (role === "Veterinarian") {
        const formData = new FormData();
        formData.append("full_name", name);
        formData.append("email", email);
        formData.append("phone_number", phone);
        formData.append("password", password);
        formData.append("license_number", vetFields.license_number.trim());
        formData.append("specialization", vetFields.specialization);
        formData.append("hospital_clinic", vetFields.hospital_clinic);
        formData.append("experience_years", vetFields.experience_years);
        formData.append("certificate", certificateFile);
        result = await registerVet(formData);
      } else if (role === "Vendor") {
        result = await registerVendor({
          full_name: name,
          email,
          phone_number: phone,
          password,
        });
      } else {
        result = await registerFarmer({
          full_name: name,
          email,
          phone_number: phone,
          password,
        });
      }

      if (result.status === "success") {
        if (role === "Veterinarian") {
          toast.success("Veterinarian registration submitted! Your account is awaiting admin approval.");
        } else {
          toast.success("Registered successfully");
        }
        navigate("/login");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell-reverse">
        <aside className="auth-brand-panel">
          <div className="auth-brand-mark">AI</div>
          <p className="auth-kicker">Create your workspace</p>
          <h1>Start with the right dashboard for your poultry work.</h1>
          <p className="auth-brand-copy">
            Farmers, veterinarians, and vendors can register with one simple
            form and access role-based tools after login.
          </p>

          <div className="auth-feature-list">
            <span>Role-based access</span>
            <span>Health and outbreak visibility</span>
            <span>Connected vendor network</span>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-kicker">Join PoultryGuard AI</p>
            <h2>Create your account</h2>
            <p>Select your role and enter your details to get started.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-field">
              <label>Register as</label>
              <div className="auth-role-group" aria-label="Register as">
                {roles.map((item) => (
                  <button
                    className={role === item ? "auth-role active" : "auth-role"}
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-phone">Phone number</label>
              <input
                id="register-phone"
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {role === "Veterinarian" && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <span className="font-bold">⚠️ Notice:</span>
                  <span>Veterinarian accounts require administrative verification. Please provide your professional credentials and license document for review.</span>
                </div>

                <div className="auth-field">
                  <label htmlFor="vet-license">License / Registration Number *</label>
                  <input
                    id="vet-license"
                    placeholder="e.g. VET-MH-2024-8842"
                    value={vetFields.license_number}
                    onChange={(e) => setVetFields({ ...vetFields, license_number: e.target.value })}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="vet-spec">Specialization</label>
                  <input
                    id="vet-spec"
                    placeholder="e.g. Avian Pathology / Poultry Specialist"
                    value={vetFields.specialization}
                    onChange={(e) => setVetFields({ ...vetFields, specialization: e.target.value })}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="vet-clinic">Hospital / Clinic Affiliation</label>
                  <input
                    id="vet-clinic"
                    placeholder="e.g. National Avian Health Clinic"
                    value={vetFields.hospital_clinic}
                    onChange={(e) => setVetFields({ ...vetFields, hospital_clinic: e.target.value })}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="vet-exp">Years of Experience</label>
                  <input
                    id="vet-exp"
                    type="number"
                    min="0"
                    max="60"
                    placeholder="e.g. 5"
                    value={vetFields.experience_years}
                    onChange={(e) => setVetFields({ ...vetFields, experience_years: e.target.value })}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="vet-cert">Medical Certificate / License Document (PDF or Image) *</label>
                  <input
                    id="vet-cert"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    required
                    className="file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#166534] file:text-white hover:file:bg-[#14532d] cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Accepted formats: PDF, JPG, PNG (Max 10MB)</p>
                </div>
              </div>
            )}

            <button className="auth-primary-btn" type="submit" disabled={loading}>
              {loading ? (role === "Veterinarian" ? "Submitting application..." : "Creating account...") : (role === "Veterinarian" ? "Submit Application" : "Create account")}
            </button>
          </form>

          <p className="auth-switch-text">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
