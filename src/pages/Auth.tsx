import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

export default function Auth() {
  const { user, signUp, signIn } = useAuth();
  const [tab,          setTab]          = useState<"signup" | "login">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [forgotSent,   setForgotSent]   = useState(false);
  const [showForgot,   setShowForgot]   = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState("");

  const [signupForm, setSignupForm] = useState({ fullName: "", email: "", password: "" });
  const [loginForm,  setLoginForm]  = useState({ email: "", password: "" });

  if (!supabase) {
  console.error("Supabase not initialized");
  return <div>Loading...</div>;
}

  if (user) return <Navigate to="/clients" replace />;

  // ── Validation ────────────────────────────────────────────────────────────────

  // Strict email regex:
  // - local part (before @): allows letters, digits, dots, +, _, -, but NOT consecutive dots, NOT start/end with dot
  // - domain: valid hostname with at least 2-char TLD
  const EMAIL_REGEX = /^(?![.])[a-zA-Z0-9._%+\-]{1,64}(?<![.])@[a-zA-Z0-9\-]{1,63}(\.[a-zA-Z0-9\-]{1,63})*\.[a-zA-Z]{2,}$/;
  const CONSECUTIVE_DOTS = /\.\./;

  // Common disposable/fake email domains
  const DISPOSABLE_DOMAINS = [
    "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
    "yopmail.com","sharklasers.com","grr.la","guerrillamail.info",
    "guerrillamail.biz","guerrillamail.de","guerrillamail.net","guerrillamail.org",
    "spam4.me","trashmail.com","trashmail.me","trashmail.net","dispostable.com",
    "mailnull.com","maildrop.cc","fakeinbox.com","tempinbox.com","discard.email",
    "getairmail.com","throwam.com","getnada.com","33mail.com",
  ];

  const validate = (form: any, isSignup: boolean) => {
    const e: Record<string, string> = {};

    if (isSignup && !form.fullName?.trim()) e.fullName = "Name is required";

    const email = (form.email ?? "").trim().toLowerCase();
    const localPart = email.split("@")[0] ?? "";
    const domain    = email.split("@")[1] ?? "";

    if (!email) {
      e.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email) || CONSECUTIVE_DOTS.test(localPart)) {
      e.email = "Your email ID is not valid (e.g. name@gmail.com)";
    } else if (localPart.length < 2) {
      e.email = "Your email ID is not valid — address before @ is too short";
    } else if (DISPOSABLE_DOMAINS.includes(domain)) {
      e.email = "Please use a real email — temporary emails are not allowed";
    }

    if ((form.password?.length ?? 0) < 8)
      e.password = "Use at least 8 characters (add numbers or symbols for better security)";

    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = tab === "signup" ? signupForm : loginForm;
    const errs = validate(form, tab === "signup");
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Show first error as toast too
      const firstError = Object.values(errs)[0];
      toast.error(firstError);
      return;
    }
    setErrors({});
    setLoading(true);

    if (tab === "signup") {
      const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm, then log in to continue.");
    } else {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) toast.error(error.message);
    }
    setLoading(false);
  };

  // ── Google OAuth ──────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) { toast.error(error.message); setGoogleLoading(false); }
  };

  // ── Forgot Password ───────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    if (!forgotEmail.includes("@")) { toast.error("Enter your email first"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setForgotSent(true); toast.success("Password reset email sent!"); }
  };

  // ── Field updater ─────────────────────────────────────────────────────────────

  const update = (setter: any) => (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter((prev: any) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Input class ───────────────────────────────────────────────────────────────

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 bg-surface border rounded-lg text-foreground text-sm font-body outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/15 ${
      err ? "border-destructive ring-2 ring-destructive/10" : "border-border"
    }`;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-surface border-r border-border relative overflow-hidden">
        <div className="absolute -top-[200px] -left-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(var(--accent-glow))_0%,transparent_70%)] pointer-events-none" />

        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">⚡</div>
          <span className="font-display text-[22px] text-foreground">Onboardly</span>
        </Link>

        <div className="relative z-10">
          <h1 className="font-display text-[42px] leading-[1.15] text-foreground mb-5 font-normal">
            Client onboarding that <em className="italic text-primary">just works.</em>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-[380px]">
            Send one link. Collect everything you need. Start projects faster. Built for freelance web designers.
          </p>

          <div className="bg-surface-2 border border-border rounded-2xl p-6 max-w-[420px]">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
              "I used to spend <strong className="text-foreground not-italic">days</strong> chasing clients for assets. Now they complete everything in under an hour."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-xs font-bold text-primary-foreground">MR</div>
              <div>
                <span className="text-[13px] font-medium text-foreground block">Marcus Reid</span>
                <small className="text-xs text-muted-foreground">Freelance Designer</small>
              </div>
            </div>
          </div>

          {/* Steps hint */}
          <div className="mt-8 space-y-2">
            {[
              "Create your free account",
              "Add your first client",
              "Send the onboarding link",
              "Get everything you need, organised",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <span className="text-[13px] text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-6 relative z-10">
          {[["Free", "to start"], ["5 min", "setup time"], ["No credit", "card needed"]].map(([num, label], i) => (
            <div key={label} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-10 bg-border" />}
              <div>
                <span className="font-display text-[22px] text-foreground">{num}</span>
                <span className="text-xs text-muted-foreground block mt-0.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(var(--accent-glow))_0%,transparent_65%)] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px] relative z-10">

          {/* Badge */}
          {tab === "signup" && (
            <div className="inline-flex items-center gap-1.5 bg-[hsl(var(--accent-dim))] border border-primary/20 rounded-full px-3 py-1 text-xs text-primary font-medium mb-5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Free to start · No credit card
            </div>
          )}

          {/* Heading */}
          <div className="mb-7">
            <h2 className="font-display text-[30px] font-normal text-foreground mb-2">
              {tab === "signup" ? "Start onboarding clients in 5 minutes" : "Continue your client onboarding"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "signup"
                ? "Create your free account and send your first onboarding link today."
                : "Sign in to your Onboardly account."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-surface border border-border rounded-lg p-1 mb-6">
            {(["signup", "login"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setErrors({}); setShowForgot(false); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all font-body ${
                  tab === t ? "bg-surface-2 text-foreground border border-border" : "text-muted-foreground"
                }`}>
                {t === "signup" ? "Sign Up" : "Log In"}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-surface border border-border rounded-lg text-sm font-medium text-foreground hover:bg-surface-2 hover:border-muted-foreground/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {googleLoading ? (
              <span className="text-muted-foreground text-sm">Connecting...</span>
            ) : (
              <>
                {/* Google "G" icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Forgot password modal */}
          {showForgot ? (
            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Your email</label>
                <input
                  className={inputCls()}
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              {forgotSent ? (
                <p className="text-sm text-success text-center py-2">✓ Reset link sent — check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="w-full py-3 bg-primary rounded-lg text-primary-foreground text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotSent(false); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Full name (signup only) */}
              {tab === "signup" && (
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                  <input
                    className={inputCls(errors.fullName)}
                    placeholder="Your full name"
                    value={signupForm.fullName}
                    onChange={update(setSignupForm)("fullName")}
                    autoFocus
                  />
                  {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Email</label>
                <input
                  className={inputCls(errors.email)}
                  type="email"
                  placeholder="you@example.com"
                  value={tab === "signup" ? signupForm.email : loginForm.email}
                  onChange={update(tab === "signup" ? setSignupForm : setLoginForm)("email")}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">Password</label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginForm.email);
                        setShowForgot(true);
                        setForgotSent(false);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    className={inputCls(errors.password)}
                    type={showPassword ? "text" : "password"}
                    placeholder={tab === "signup" ? "Min. 8 characters" : "Enter your password"}
                    value={tab === "signup" ? signupForm.password : loginForm.password}
                    onChange={update(tab === "signup" ? setSignupForm : setLoginForm)("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-body"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 bg-primary rounded-lg text-primary-foreground text-[15px] font-semibold font-body transition-all hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(var(--accent-glow))] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 relative overflow-hidden mt-1"
              >
                <span className="absolute inset-0 bg-gradient-to-br from-transparent to-white/10" />
                <span className="relative">
                  {loading
                    ? (tab === "signup" ? "Creating account..." : "Signing in...")
                    : (tab === "signup" ? "Create Free Account →" : "Sign In →")
                  }
                </span>
              </button>

              {/* Trust line */}
              <p className="text-[11px] text-muted-foreground text-center">
                {tab === "signup"
                  ? "No credit card required · Setup in 2 minutes"
                  : <>Don't have an account?{" "}<button type="button" onClick={() => setTab("signup")} className="text-primary hover:underline">Sign up free</button></>
                }
              </p>

              {/* Onboarding hint — signup only */}
              {tab === "signup" && (
                <div className="bg-surface border border-border rounded-xl px-4 py-3 mt-1">
                  <p className="text-[11px] text-muted-foreground font-medium mb-1.5">What happens next:</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sign up → confirm email → log in → create your first client → send onboarding link
                  </p>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
