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
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      return toast.warning("Required fields missing");
    }

    const payload = {
      full_name: name,
      email,
      phone_number: phone,
      password,
    };

    setLoading(true);

    try {
      let result;
      if (role === "Veterinarian") {
        result = await registerVet(payload);
      } else if (role === "Vendor") {
        result = await registerVendor(payload);
      } else {
        result = await registerFarmer(payload);
      }

      if (result.status === "success") {
        toast.success("Registered successfully");
        navigate("/login");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("Unable to register. Please try again.");
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

            <button className="auth-primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
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
