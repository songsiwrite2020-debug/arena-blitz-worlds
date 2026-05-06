import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Crosshair, Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (username.length < 3) throw new Error("Username must be at least 3 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username },
          },
        });
        if (error) throw error;
        toast.success("Welcome, soldier. Entering the arena...");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-grid flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-primary/30 animate-pulse-glow">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Crosshair className="w-10 h-10 text-primary text-glow" />
          <h1 className="text-3xl font-black tracking-widest text-glow">NEON ARENA</h1>
        </div>
        <p className="text-center text-muted-foreground mb-6 text-sm uppercase tracking-wider">
          {mode === "login" ? "Sign in to deploy" : "Create your operative"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Input placeholder="Callsign / Username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={20} />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          <Button type="submit" disabled={busy} className="w-full font-bold tracking-wider uppercase" size="lg">
            {busy ? <Loader2 className="animate-spin" /> : mode === "login" ? "Engage" : "Enlist"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {mode === "login" ? "No account? Enlist now →" : "Already enlisted? Sign in →"}
        </button>
      </Card>
    </main>
  );
}
