
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus,
  ChevronDown,
  ClipboardList,
  Info,
  User,
  Package,
  LogOut,
  LoaderCircle,
  ShieldCheck,
  Menu,
  X,
  Search,
  Mic,
} from "lucide-react";

import ShareBoxLogo from "./ShareboxLogo";
import { API_URL, readApiResponse } from "../lib/api";

function SearchField({ searchValue, onSearchChange, className = "" }) {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const voiceSearchSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const startVoiceSearch = () => {
    if (!voiceSearchSupported) {
      setVoiceError("Voice search isn't supported by this browser.");
      return;
    }

    if (!window.isSecureContext) {
      setVoiceError("Voice search requires HTTPS or localhost.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        setVoiceError("No speech was recognized. Please try again.");
        return;
      }

      onSearchChange(transcript);
      setVoiceError("");
      document.getElementById("marketplace-listings")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;

      const errors = {
        "not-allowed": "Allow microphone access to use voice search.",
        "service-not-allowed": "Allow microphone access to use voice search.",
        "no-speech": "No speech detected. Please try again.",
        "audio-capture": "No microphone was found. Connect a microphone and try again.",
        network: "Voice search needs a network connection. Please try again.",
      };
      setVoiceError(errors[event.error] || "Voice search failed. Please try again.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognitionRef.current = recognition;
      setVoiceError("");
      setListening(true);
      recognition.start();
    } catch (error) {
      console.error("Voice search could not start:", error);
      recognitionRef.current = null;
      setListening(false);
      setVoiceError("Voice search couldn't start. Please try again.");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D8976]"
      />
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search shared items..."
        aria-label="Search items"
        aria-controls="marketplace-listings"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            document.getElementById("marketplace-listings")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }}
        className="w-full rounded-xl border border-[#E8DFD0] bg-[#F7F3EB] py-3 pl-10 pr-12 text-sm text-[#292725] outline-none transition placeholder:text-[#7D8976] focus:border-[#A3B18A] focus:bg-white focus:ring-2 focus:ring-[#A3B18A]/40"
      />
      <button
        type="button"
        onClick={startVoiceSearch}
        disabled={!voiceSearchSupported}
        aria-label={listening ? "Stop voice search" : "Start voice search"}
        aria-pressed={listening}
        title={
          voiceSearchSupported
            ? listening
              ? "Stop voice search"
              : "Search by voice"
            : "Voice search isn't supported by this browser"
        }
        className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition ${
          listening
            ? "bg-[#E8DFD0] text-[#641E32]"
            : "text-[#7D8976] hover:bg-[#E8DFD0] hover:text-[#641E32]"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Mic size={17} />
      </button>
      {(listening || voiceError) && (
        <p
          role={voiceError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-1 text-xs ${
            voiceError ? "text-red-600" : "text-indigo-600"
          }`}
        >
          {voiceError || "Listening…"}
        </p>
      )}
    </div>
  );
}

function ProfileAvatar({ user, imageError, onImageError, size = "h-8 w-8" }) {
  if (user?.picture && !imageError) {
    return (
      <img
        src={user.picture}
        alt="Profile"
        referrerPolicy="no-referrer"
        onError={onImageError}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  return <User size={19} />;
}

function Navbar({ searchValue, onSearchChange }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await readApiResponse(response);
        const loggedInUser = data.user || data;

        setUser(loggedInUser);
        setImageError(false);
      } catch (error) {
        console.error("Session check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    window.addEventListener("sharebox-auth-changed", checkSession);

    return () => {
      window.removeEventListener("sharebox-auth-changed", checkSession);
    };
  }, []);

  const goTo = (path) => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      setUser(null);
      setImageError(false);
      setAccountOpen(false);
      setMobileMenuOpen(false);

      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      alert(error.message);
    }
  };

  return (
    <nav className="relative z-50 w-full border-b border-[#7D8976]/50 bg-[#641E32] text-[#F7F3EB] shadow-sm">
      {/* MAIN NAVBAR */}
      <div className="mx-auto flex min-h-[72px] w-full items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-20 lg:gap-5 lg:px-8">

        {/* LOGO */}
        <div className="flex shrink-0 items-center">
          <ShareBoxLogo />
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex xl:gap-4">

          {/* SEARCH */}
          <SearchField
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            className="min-w-[130px] max-w-sm flex-1"
          />

          {/* REQUESTS */}
          <button
            type="button"
            onClick={() => goTo("/requests")}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium text-[#F7F3EB] transition hover:bg-white/10 hover:text-[#A3B18A]"
          >
            <ClipboardList size={18} />
            Requests
          </button>

          {/* ACCOUNT */}
          {loading ? (
            <div className="px-3 py-3">
              <LoaderCircle size={19} className="animate-spin text-[#A3B18A]" />
            </div>
          ) : user ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                aria-expanded={accountOpen}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold text-[#F7F3EB] transition hover:bg-white/10 hover:text-[#A3B18A]"
              >
                <ProfileAvatar
                  user={user}
                  imageError={imageError}
                  onImageError={() => setImageError(true)}
                />
                <span>My Account</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="truncate font-semibold text-slate-900">
                      {user.name || "ShareBox Member"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email || ""}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => goTo("/my-products")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Package size={19} />
                      My Products
                    </button>

                    {user.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => goTo("/admin")}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        <ShieldCheck size={19} />
                        Admin Dashboard
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={19} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => goTo("/login")}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium text-[#F7F3EB] hover:bg-white/10 hover:text-[#A3B18A]"
            >
              <User size={18} />
              Login
            </button>
          )}

          {/* ABOUT */}
          <button
            type="button"
            onClick={() => goTo("/about")}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium text-[#F7F3EB] hover:bg-white/10 hover:text-[#A3B18A]"
          >
            <Info size={18} />
            About
          </button>

          {/* OFFER ITEM */}
          <button
            type="button"
            onClick={() => goTo("/offer-item")}
            className="flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#A3B18A] px-4 py-3 text-sm font-semibold text-[#292725] transition hover:bg-[#B4C19D]"
          >
            <Plus size={18} className="mr-2" />
            Offer an Item
          </button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => goTo("/offer-item")}
            aria-label="Offer an item"
            className="flex h-10 items-center gap-1.5 rounded-lg bg-[#A3B18A] px-3 text-sm font-semibold text-[#292725] transition hover:bg-[#B4C19D]"
          >
            <Plus size={17} />
            <span className="hidden min-[360px]:inline">Offer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setAccountOpen(false);
            }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#A3B18A] bg-transparent text-[#F7F3EB] transition hover:bg-white/10"
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      <div className="border-t border-[#7D8976]/50 bg-[#641E32] px-4 py-3 sm:px-6 lg:hidden">
        <SearchField
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          className="w-full"
        />
      </div>

      {/* MOBILE NAVIGATION PANEL */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E8DFD0] bg-[#F7F3EB] px-4 pb-5 pt-4 text-[#292725] shadow-lg sm:px-6 lg:hidden">
          {/* MENU LINKS */}
          <div className="space-y-1">

            <button
              type="button"
              onClick={() => goTo("/requests")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              <ClipboardList size={20} />
              Requests
            </button>

            <button
              type="button"
              onClick={() => goTo("/about")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              <Info size={20} />
              About
            </button>

            {loading ? (
              <div className="flex items-center gap-3 px-3 py-3 text-sm text-slate-500">
                <LoaderCircle size={19} className="animate-spin text-indigo-600" />
                Checking account...
              </div>
            ) : user ? (
              <>
                <div className="my-3 border-t border-slate-100" />

                <div className="flex items-center gap-3 px-3 py-3">
                  <ProfileAvatar
                    user={user}
                    imageError={imageError}
                    onImageError={() => setImageError(true)}
                    size="h-10 w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name || "ShareBox Member"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email || ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goTo("/my-products")}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Package size={20} />
                  My Products
                </button>

                {user.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => goTo("/admin")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <ShieldCheck size={20} />
                    Admin Dashboard
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => goTo("/login")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <User size={20} />
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
