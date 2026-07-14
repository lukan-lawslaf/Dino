import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Moon, Star, Sun, User, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import AuthModal from "./AuthModal";

const LINKS = [
  { to: "/encyclopedia", label: "Encyclopedia" },
  { to: "/compare", label: "Compare" },
  { to: "/news", label: "News" },
];

/** Top navigation bar for the inner app screens (facts.app style). */
export default function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--app-bg) 85%, transparent)", borderBottom: "1px solid var(--app-border)" }}
    >
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2 group">
        <span
          className="grid place-items-center w-9 h-9 rounded-md font-bold text-lg leading-none"
          style={{ background: "var(--app-invert-bg)", color: "var(--app-invert-text)" }}
        >
          #
        </span>
        <span className="leading-[1.05]">
          <span className="block text-[11px] font-mono tracking-widest uppercase" style={{ color: "var(--app-muted)" }}>
            Facts
          </span>
          <span className="block text-sm font-semibold tracking-tight">Dinosaurs</span>
        </span>
      </Link>

      {/* Center links */}
      <nav className="hidden md:flex items-center gap-2">
        {LINKS.map((l) => {
          const active = pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className="px-5 py-2 rounded-full text-sm font-medium transition-colors"
              style={
                active
                  ? { background: "var(--app-invert-bg)", color: "var(--app-invert-text)" }
                  : { color: "var(--app-muted)" }
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Favorites"
          className="grid place-items-center w-9 h-9 rounded-full"
          style={{ background: "var(--app-invert-bg)", color: "var(--app-invert-text)" }}
        >
          <Star size={16} fill="currentColor" />
        </button>

        {/* Auth: Sign in button OR user menu */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors"
              style={{ border: "1px solid var(--app-border)" }}
            >
              <span className="max-w-[140px] truncate">{user.email}</span>
              <User size={15} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden shadow-xl"
                style={{ background: "var(--app-bg-2)", border: "1px solid var(--app-border)" }}
              >
                <button
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:opacity-80"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--app-border)" }}
          >
            <User size={15} /> Sign in
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle light / dark theme"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="grid place-items-center w-9 h-9 rounded-full transition-colors"
          style={{ border: "1px solid var(--app-border)" }}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          aria-label="Close to home"
          onClick={() => navigate("/")}
          className="grid place-items-center w-9 h-9 transition-opacity opacity-70 hover:opacity-100"
        >
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
