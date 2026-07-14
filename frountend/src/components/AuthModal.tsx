import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Mail, X } from "lucide-react";
import { supabase, supabaseConfigured } from "../lib/supabase";

type Mode = "signin" | "signup";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!supabaseConfigured) {
      setErr("Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Check your email to confirm your account, then sign in.");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setErr("Supabase is not configured.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/encyclopedia" },
    });
    if (error) setErr(error.message);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 20, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-8 relative"
            style={{ background: "var(--app-bg-2)", color: "var(--app-text)", border: "1px solid var(--app-border)" }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 opacity-60 hover:opacity-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-semibold tracking-tight mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--app-muted)" }}>
              {mode === "signin" ? "Sign in to save favorites and comparisons." : "Sign up to start exploring."}
            </p>

            <button
              onClick={google}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-medium mb-4"
              style={{ background: "var(--app-invert-bg)", color: "var(--app-invert-text)" }}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4 text-xs" style={{ color: "var(--app-faint)" }}>
              <span className="flex-1 h-px" style={{ background: "var(--app-border)" }} />
              or
              <span className="flex-1 h-px" style={{ background: "var(--app-border)" }} />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
              />

              {err && <p className="text-sm text-red-400">{err}</p>}
              {msg && <p className="text-sm text-emerald-400">{msg}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-medium disabled:opacity-60"
                style={{ background: "var(--app-invert-bg)", color: "var(--app-invert-text)" }}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>

            <p className="text-sm text-center mt-6" style={{ color: "var(--app-muted)" }}>
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErr(null);
                  setMsg(null);
                }}
                className="underline font-medium"
                style={{ color: "var(--app-text)" }}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
