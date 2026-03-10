import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bus, Mail, Lock, Eye, EyeOff, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      // Create operator record
      if (data.user) {
        const { error: opError } = await supabase.from("operators").insert({
          id: data.user.id,
          name: operatorName,
          phone: phone,
          status: "pending",
        });
        if (opError) {
          console.error("Operator insert error:", opError);
        }
      }

      toast.success("Account created! Check your email to confirm.");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-foreground">
        <Bus className="h-7 w-7 text-primary" />
        BusLink
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-card-foreground">
          {isSignUp ? "Create Operator Account" : "Operator Login"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {isSignUp
            ? "Register your bus company on BusLink"
            : "Sign in to manage your fleet and routes"}
        </p>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          {isSignUp && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Company / Operator Name"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="Phone (e.g. +265888123456)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Sign in" : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
