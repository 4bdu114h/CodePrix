import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/auth/login", {
        email: signInData.email,
        password: signInData.password,
      });

      const { token } = res.data;
      login(token, { email: signInData.email });
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err: any) {
      const message = err.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.email || !signUpData.name || !signUpData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Register the user
      await apiClient.post("/auth/register", {
        name: signUpData.name,
        email: signUpData.email,
        password: signUpData.password,
      });

      // Auto-login after successful registration
      const loginRes = await apiClient.post("/auth/login", {
        email: signUpData.email,
        password: signUpData.password,
      });

      const { token } = loginRes.data;
      login(token, { email: signUpData.email, name: signUpData.name });
      toast.success("Account created! Welcome to CodePrix.");
      navigate("/dashboard");
    } catch (err: any) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-5xl font-black text-foreground mb-8">
            Code<span className="text-primary">Prix</span>
          </h1>

          <div className="rounded-2xl bg-card/90 border border-foreground/10 shadow-brutal px-6 py-7 text-left">
            <h2 className="font-display text-xl font-bold text-center text-foreground">
              {mode === "sign-in" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="font-body text-xs text-muted-foreground text-center mb-6">
              {mode === "sign-in"
                ? "Sign in to continue your learning journey"
                : "Create an account to start your learning journey"}
            </p>

            {mode === "sign-in" ? (
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <label className="font-body text-xs font-bold text-foreground" htmlFor="signin-email">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 font-body text-sm focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-body text-xs font-bold text-foreground" htmlFor="signin-password">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 font-body text-sm focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <button type="submit" className="neo-btn-primary w-full px-6 py-3 text-sm" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <label className="font-body text-xs font-bold text-foreground" htmlFor="signup-name">
                    Name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    className="w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 font-body text-sm focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-body text-xs font-bold text-foreground" htmlFor="signup-email">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 font-body text-sm focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-body text-xs font-bold text-foreground" htmlFor="signup-password">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 font-body text-sm focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                <button type="submit" className="neo-btn-primary w-full px-6 py-3 text-sm" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Sign Up"}
                </button>
              </form>
            )}

            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              {mode === "sign-in" ? (
                <button type="button" onClick={() => setMode("sign-up")} className="hover:text-foreground">
                  Don&apos;t have an account? Create one here
                </button>
              ) : (
                <button type="button" onClick={() => setMode("sign-in")} className="hover:text-foreground">
                  Already have an account? Sign in
                </button>
              )}
              {mode === "sign-in" && (
                <button type="button" className="hover:text-foreground">
                  Forgot Password?
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
