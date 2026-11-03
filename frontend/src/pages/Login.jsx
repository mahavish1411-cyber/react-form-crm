import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import WakingBanner from "../components/WakingBanner";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f4f6fb",
    fontFamily: "system-ui, sans-serif",
  },
  center: { flex: 1, display: "grid", placeItems: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#fff",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    margin: "6px 0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 15,
  },
  demo: {
    width: "100%",
    padding: "12px",
    border: 0,
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondary: {
    width: "100%",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
};

function Login() {
  const { user, login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      // A sleeping free-tier server answers 503/network errors while it wakes
      // up and its database connects; retry for up to ~75s instead of failing.
      const MAX_ATTEMPTS = 15;
      for (let attempt = 1; ; attempt += 1) {
        try {
          await action();
          break;
        } catch (err) {
          const status = err.response?.status;
          const retryable = !err.response || [502, 503, 504].includes(status);
          if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Cannot reach the server. If it was idle it may still be waking up — try again in a moment."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <WakingBanner />
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={{ margin: "0 0 4px" }}>Employee CRM</h1>
          <p style={{ margin: "0 0 20px", color: "#64748b" }}>
            Employees, attendance and payroll in one workspace.
          </p>

          <button style={styles.demo} disabled={busy} onClick={() => run(demoLogin)}>
            {busy ? "Please wait…" : "Try the demo"}
          </button>
          <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 18px" }}>
            No sign-up needed. Demo data is fake and resets daily.
          </p>

          <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "0 0 18px" }} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => login(email, password));
            }}
          >
            <label>
              Email
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p role="alert" style={{ color: "#b91c1c", fontSize: 14 }}>
                {error}
              </p>
            )}
            <button style={styles.secondary} type="submit" disabled={busy}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
