import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Vendor");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return toast.warning("Email and password required");
    }

    setLoading(true);

    try {
      const result = await loginUser({ email, password, role });

      if (result.status === "success") {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("role", result.data.role);
        localStorage.setItem("email", email);
        localStorage.setItem("user", JSON.stringify(result.data));

        sessionStorage.setItem("token", result.data.token);
        sessionStorage.setItem("role", result.data.role);
        sessionStorage.setItem("user", JSON.stringify(result.data));
        sessionStorage.setItem("email", email);
        if (result.data.role === "Farmer") {
          sessionStorage.setItem("farmer_id", result.data.id);
        }

        toast.success("Login successful");

        if (result.data.role === "Farmer") {
          navigate("/farmer/dashboard");
        }
        else if (result.data.role === "Veterinarian") navigate(result.data.profile_completed ? "/vet/dashboard" : "/vet/complete-profile");
        else if (result.data.role === "Vendor") navigate("/vendor/dashboard");
        else navigate("/admin/dashboard");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch {
      toast.error("Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand-mark">PG</div>
          <p className="auth-kicker">PoultryGuard AI</p>
          <h1>Smart poultry health monitoring for every role.</h1>
          <p className="auth-brand-copy">
            Track flock health, manage alerts, and keep farms connected through
            one clean dashboard experience.
          </p>

          <div className="auth-feature-grid">
            <div>
              <strong>24/7</strong>
              <span>Farm monitoring</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>Disease insights</span>
            </div>
            <div>
              <strong>IoT</strong>
              <span>Device alerts</span>
            </div>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-kicker">Welcome back</p>
            <h2>Sign in to your account</h2>
            <p>Use your registered email and password to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label>Login as</label>
              <div className="auth-role-group" aria-label="Login as">
                {["Vendor", "Farmer", "Veterinarian", "Admin"].map((item) => (
                  <button
                    className={role === item ? "auth-role active" : "auth-role"}
                    key={item}
                    onClick={() => setRole(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button className="auth-primary-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-switch-text">
            New to PoultryGuard AI? <Link to="/register">Create account</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
