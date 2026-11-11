
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL as API_BASE_URL, readApiResponse } from "../lib/api";

import {
  Package,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";

const API_URL = `${API_BASE_URL}/auth`;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || "/";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  // Email and password login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      window.dispatchEvent(new Event("sharebox-auth-changed"));
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google login
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in did not return a credential.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Google sign-in failed.");
      }

      window.dispatchEvent(new Event("sharebox-auth-changed"));
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">

        {/* LOGO */}
        <Link to="/" className="mb-9 flex items-center gap-2">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Package size={25} />
          </span>

          <span className="text-2xl font-bold tracking-tight text-slate-900">
            ShareBox
          </span>
        </Link>

        {/* HEADING */}
        <p className="mb-3 text-sm font-bold tracking-widest text-indigo-600">
          WELCOME BACK
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Good things start with sharing.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in to discover items, share what you no longer need,
          and connect with your community.
        </p>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>

            <div className="relative">
              <Mail
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <Lock
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-indigo-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        {/* DIVIDER */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* GOOGLE LOGIN */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in was unsuccessful.")}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="320"
          />
        </div>

        {loading && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Please wait while we securely authenticate you.
          </p>
        )}

        {/* SECURITY MESSAGE */}
        <div className="mt-8 flex items-start gap-3 rounded-xl bg-indigo-50 p-4">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-indigo-600"
            size={21}
          />

          <p className="text-xs leading-5 text-slate-600">
            Your account is protected with secure authentication
            and encrypted password hashing.
          </p>
        </div>

        {/* SIGNUP LINK */}
        <p className="mt-8 text-center text-sm text-slate-500">
          New to ShareBox?{" "}
          <Link
            to="/signup"
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            Create an account
          </Link>
        </p>

        {/* HOME LINK */}
        <Link
          to="/"
          className="mt-5 block text-center text-sm text-slate-400 transition hover:text-slate-600"
        >
          Back to home
        </Link>

      </div>
    </main>
  );
}

export default Login;
