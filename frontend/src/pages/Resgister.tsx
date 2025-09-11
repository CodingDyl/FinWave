// src/pages/Register.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Chrome, CheckCircle, Loader2 } from "lucide-react";

export default function Register() {
  const { loginWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(next, { replace: true });
    }
  }, [user, loading, navigate, next]);

  function handleGoogleSignUp() {
    setIsSigningUp(true);
    loginWithGoogle();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="flex items-center gap-2">
          <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">💸</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Join Finwave</h1>
          <p className="text-muted-foreground">
            Create your account with Google and start managing payouts
          </p>
        </div>

        {/* Auth Card */}
        <div className="card p-8 shadow-lg">
          {/* Google Sign Up Button */}
          <button 
            onClick={handleGoogleSignUp}
            disabled={isSigningUp}
            className="w-full h-12 bg-background border border-border rounded-lg flex items-center justify-center gap-3 hover:bg-accent hover:text-accent-foreground transition-colors font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground"
          >
            {isSigningUp ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Chrome className="size-5" />
            )}
            {isSigningUp ? "Creating account..." : "Sign up with Google"}
          </button>

          {/* Benefits Section */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">What you get:</h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="size-3 text-success" />
                Secure OAuth authentication
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-3 text-success" />
                No passwords to remember
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-3 text-success" />
                Instant account creation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-3 text-success" />
                Access to payout management
              </li>
            </ul>
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <button className="text-primary hover:text-primary/80 transition-colors cursor-pointer">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="text-primary hover:text-primary/80 transition-colors cursor-pointer">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
