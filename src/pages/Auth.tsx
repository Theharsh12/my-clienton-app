import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Auth() {
  const { user, signUp, signIn } = useAuth();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [signupForm, setSignupForm] = useState({ fullName: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  if (user) return <Navigate to="/clients" replace />;

  const validate = (form: any, isSignup: boolean) => {
    const e: Record<string, string> = {};
    if (isSignup && !form.fullName?.trim()) e.fullName = "Name is required";
    if (!form.email?.includes("@")) e.email = "Enter a valid email";
    if (form.password?.length < 8) e.password = "Min. 8 characters";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = tab === "signup" ? signupForm : loginForm;
    const errs = validate(form, tab === "signup");
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    if (tab === "signup") {
      const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
      if (error) toast.error(error.message);
      else toast.success("Account created! Check your email to confirm.");
    } else {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) toast.error(error.message);
    }
    setLoading(false);
  };

  const update = (setter: any) => (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter((prev: any) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT PANEL */}
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
        </div>

        <div className="flex gap-6 relative z-10">
          {[["2,400+", "Designers"], ["5 min", "Setup"], ["4.9 ★", "Rating"]].map(([num, label], i) => (
            <div key={label} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-10 bg-border" />}
              <div>
                <span className="font-display text-[28px] text-foreground">{num}</span>
                <span className="text-xs text-muted-foreground block mt-0.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-background relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(var(--accent-glow))_0%,transparent_65%)] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px] relative z-10">
          {tab === "signup" && (
            <div className="inline-flex items-center gap-1.5 bg-[hsl(var(--accent-dim))] border border-primary/20 rounded-full px-3 py-1 text-xs text-primary font-medium mb-5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Free to start · No credit card
            </div>
          )}

          <div className="mb-9">
            <h2 className="font-display text-[32px] font-normal text-foreground mb-2">
              {tab === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "signup" ? "Start onboarding clients in under 5 minutes." : "Sign in to your Onboardly account."}
            </p>
          </div>

          <div className="flex bg-surface border border-border rounded-lg p-1 mb-8">
            {(["signup", "login"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setErrors({}); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all font-body ${
                  tab === t ? "bg-surface-2 text-foreground border border-border" : "text-muted-foreground"
                }`}
              >
                {t === "signup" ? "Sign Up" : "Log In"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                <input
                  className={`w-full px-4 py-3 bg-surface border rounded-lg text-foreground text-sm font-body outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/15 ${errors.fullName ? "border-destructive ring-2 ring-destructive/10" : "border-border"}`}
                  placeholder="Your full name"
                  value={signupForm.fullName}
                  onChange={update(setSignupForm)("fullName")}
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>
            )}

            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Email</label>
              <input
                className={`w-full px-4 py-3 bg-surface border rounded-lg text-foreground text-sm font-body outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/15 ${errors.email ? "border-destructive ring-2 ring-destructive/10" : "border-border"}`}
                type="email"
                placeholder="you@example.com"
                value={tab === "signup" ? signupForm.email : loginForm.email}
                onChange={update(tab === "signup" ? setSignupForm : setLoginForm)("email")}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  className={`w-full px-4 py-3 bg-surface border rounded-lg text-foreground text-sm font-body outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/15 ${errors.password ? "border-destructive ring-2 ring-destructive/10" : "border-border"}`}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary rounded-lg text-primary-foreground text-[15px] font-semibold font-body transition-all hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(var(--accent-glow))] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 relative overflow-hidden mt-1"
            >
              <span className="absolute inset-0 bg-gradient-to-br from-transparent to-white/10" />
              <span className="relative">
                {loading
                  ? (tab === "signup" ? "Creating account..." : "Signing in...")
                  : (tab === "signup" ? "Get Started →" : "Sign In →")
                }
              </span>
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            {tab === "signup"
              ? <>By signing up you agree to our Terms of Service</>
              : <>Don't have an account?{" "}<button onClick={() => setTab("signup")} className="text-primary hover:underline">Sign up free</button></>
            }
          </p>
        </motion.div>
      </div>
    </div>
  );
}
