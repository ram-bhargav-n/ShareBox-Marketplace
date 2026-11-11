
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL as API_BASE_URL, readApiResponse } from "../lib/api";

import {
  Package,
  Users,
  Repeat2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const API_URL = `${API_BASE_URL}/auth`;

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength
  const password = formData.password;

  const passwordStrength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const strengthLabel =
    passwordStrength <= 2
      ? "Weak"
      : passwordStrength <= 4
      ? "Medium"
      : "Strong";

  const strengthColor =
    passwordStrength <= 2
      ? "bg-red-500"
      : passwordStrength <= 4
      ? "bg-yellow-500"
      : "bg-green-500";

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  // Email/password registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email, password, confirmPassword } = formData;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Password must contain 8 to 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  // Google registration
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
        throw new Error(data.message || "Google registration failed.");
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to register with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">

        {/* LOGO */}
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Package size={25} />
          </span>

          <span className="text-2xl font-bold tracking-tight text-slate-900">
            ShareBox
          </span>
        </Link>

        {/* HEADING */}
        <p className="mb-3 text-sm font-bold tracking-widest text-indigo-600">
          JOIN THE COMMUNITY
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Make sharing meaningful.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Create your ShareBox account to give items a second life
          and discover things your community can share.
        </p>

        {/* REGISTRATION FORM */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">

          {/* FULL NAME */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Full name
            </label>

            <div className="relative">
              <User
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

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
              Create password
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
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {/* PASSWORD STRENGTH */}
            {password.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">
                    Password strength
                  </span>

                  <span className="font-semibold text-slate-700">
                    {strengthLabel}
                  </span>
                </div>

                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordStrength >= level
                          ? strengthColor
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Use at least 8 characters, including uppercase,
              lowercase, numbers and symbols.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Confirm password
            </label>

            <div className="relative">
              <Lock
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            {formData.confirmPassword && (
              <p className={`mt-2 flex items-center gap-1 text-xs ${
                password === formData.confirmPassword
                  ? "text-green-600"
                  : "text-red-500"
              }`}>
                {password === formData.confirmPassword ? (
                  <>
                    <CheckCircle2 size={14} />
                    Passwords match
                  </>
                ) : (
                  "Passwords do not match"
                )}
              </p>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          {/* CREATE ACCOUNT */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        {/* DIVIDER */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Or sign up with
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* GOOGLE SIGNUP */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in was unsuccessful.")}
            text="signup_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="320"
          />
        </div>

        {/* COMMUNITY BENEFITS */}
        <div className="mt-8 space-y-4 rounded-xl bg-slate-50 p-4">

          <div className="flex items-center gap-3">
            <Users size={20} className="text-indigo-600" />

            <p className="text-sm text-slate-600">
              Connect with your local community.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Repeat2 size={20} className="text-indigo-600" />

            <p className="text-sm text-slate-600">
              Give away or exchange useful items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-indigo-600" />

            <p className="text-sm text-slate-600">
              Secure account authentication.
            </p>
          </div>

        </div>

        {/* LOGIN LINK */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
        </p>

        {/* HOME */}
        <Link
          to="/"
          className="mt-5 block text-center text-sm text-slate-400 hover:text-slate-600"
        >
          Back to home
        </Link>

      </div>
    </main>
  );
}

export default Signup;
