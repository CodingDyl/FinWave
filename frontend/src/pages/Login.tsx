// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Chrome, Loader2 } from "lucide-react";

export default function Login() {
  const { loginWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(next, { replace: true });
    }
  }, [user, loading, navigate, next]);

  function handleGoogleLogin() {
    setIsLoggingIn(true);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Finwave</h1>
          <p className="text-muted-foreground">
            Sign in with your Google account to get started
          </p>
        </div>

        {/* Auth Card */}
        <div className="card p-8 shadow-lg">
          {/* Google Sign In Button */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full h-12 bg-background border border-border rounded-lg flex items-center justify-center gap-3 hover:bg-accent hover:text-accent-foreground transition-colors font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground"
          >
            {isLoggingIn ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Chrome className="size-5" />
            )}
            {isLoggingIn ? "Signing in..." : "Continue with Google"}
          </button>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button 
                onClick={() => navigate('/register')}
                className="text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
              >
                Create one here
              </button>
            </p>
          </div>

          {/* Info Section */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Why Google Sign-In?</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Secure authentication with Google</li>
              <li>• No need to remember another password</li>
              <li>• Quick and easy access to your account</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
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
