import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/useAuth";

export default function Register() {
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
    const result = await register({ name, email, password });
    setLoading(false);
    if (result.ok) navigate("/dashboard");
    else setError(result.error);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <title>Create Account | Splitmate</title>
      <div className="page flex flex-col items-center pt-16 pb-10">
        <Link to="/">
          <img src="/logo.png" alt="Splitmate" className="h-8 w-auto" />
        </Link>
        <div className="mt-8 w-full max-w-[400px] card">
          <h1 className="text-xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Track shared expenses with friends.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={setName}
              autoFocus
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
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
              <UserPlus size={16} />
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Already have an account?{" "}
          <Link to="/login" className="btn-link">
            Sign in
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
