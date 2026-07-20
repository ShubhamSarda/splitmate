import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/useAuth";
import Logo from "../components/Logo";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ready) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) navigate("/dashboard");
    else setError(result.error);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <title>Sign In | Splitmate</title>
      <div className="page flex flex-col items-center pt-16 pb-10">
        <Link to="/">
          <Logo />
        </Link>
        <div className="mt-8 w-full max-w-[400px] card">
          <h1 className="text-xl font-bold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">Welcome back.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoFocus
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            {error && (
              <div className="rounded-lg bg-neg-bg px-3 py-2 text-sm text-neg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full gap-2"
            >
              <LogIn size={16} />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Don't have an account?{" "}
          <Link to="/register" className="btn-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, autoFocus }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="field"
      />
    </label>
  );
}
