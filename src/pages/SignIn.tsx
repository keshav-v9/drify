
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        navigate('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          navigate('/dashboard');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (error) throw error;
        
        // Show verification email toast with button to go to login
        toast({
          title: "Check your email!",
          description: "We've sent you a verification link. Please check your email to activate your account.",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsSignUp(false);
                setEmail("");
                setPassword("");
              }}
            >
              Go to Login
            </Button>
          ),
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6">
          <span className="h-3 w-3 rounded-[2px] bg-primary" />
          <button onClick={() => navigate('/')} className="text-[15px] font-semibold tracking-[-0.02em]">Drify</button>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl px-6 py-16 md:py-24">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">
            {isSignUp ? "Create your account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Set up a space to track care costs and share them with family."
              : "Pick up where you left off."}
          </p>
          <form onSubmit={handleAuth} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : (isSignUp ? "Create account" : "Sign in")}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            disabled={loading}
            onClick={async () => {
              setError(null);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/dashboard` },
              });
              if (error) setError(error.message);
            }}
          >
            Continue with Google
          </Button>

          <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "New to Drify?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="font-medium text-primary underline underline-offset-4"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
