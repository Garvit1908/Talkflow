import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GoogleLogin } from "@react-oauth/google";
import { apiClient } from "../config/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/api/auth/login", {
        email,
        password,
      });
      login(res.data.user, res.data.token);
      navigate("/chat");
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setError("Server is waking up (free tier). Please wait a moment and try again.");
      } else if (!err.response) {
        setError("Cannot reach server. It may be starting up — please try again in 30 seconds.");
      } else {
        setError(err.response?.data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });
      login(res.data.user, res.data.token);
      navigate("/chat");
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setError("Server is waking up (free tier). Please wait a moment and try again.");
      } else if (!err.response) {
        setError("Cannot reach server. It may be starting up — please try again in 30 seconds.");
      } else {
        setError(err.response?.data?.message || "Google login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-workspace flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-lime selection:text-evergreen">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-evergreen/3 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-lime/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-evergreen flex items-center justify-center text-lime font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
              T
            </div>
            <span className="text-3xl font-extrabold tracking-tight font-display text-ink">
              TalkFlow<span className="text-lime">.</span>
            </span>
          </Link>
          <p className="text-supporting text-sm mt-2 font-medium">Connect. Chat. Call.</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-border-subtle rounded-3xl p-8 shadow-[0_8px_30px_rgba(23,33,31,0.06)]">
          <h2 className="text-2xl font-bold text-ink font-display mb-2">
            Welcome back
          </h2>
          <p className="text-supporting text-xs font-normal mb-6">
            Enter your credentials to access your conversations.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-5 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5 font-display">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-workspace border border-border-subtle rounded-2xl text-ink placeholder-supporting/60 focus:outline-none focus:bg-white focus:border-evergreen focus:ring-2 focus:ring-evergreen/10 transition-all text-sm font-medium"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5 font-display">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-workspace border border-border-subtle rounded-2xl text-ink placeholder-supporting/60 focus:outline-none focus:bg-white focus:border-evergreen focus:ring-2 focus:ring-evergreen/10 transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-evergreen hover:bg-evergreen/90 text-lime font-bold text-sm rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-lime" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-supporting text-xs font-semibold uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Google Sign-In */}
          <div className="flex justify-center [&>div]:w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed. Please try again.")}
              theme="outline"
              shape="pill"
              size="large"
              text="continue_with"
              width="400"
              locale="en"
            />
          </div>

          <p className="text-supporting text-xs text-center mt-6">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-evergreen hover:text-evergreen/80 font-bold transition-colors underline decoration-lime decoration-2 underline-offset-4"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
