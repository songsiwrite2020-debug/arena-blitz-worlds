import { useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/lobby";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to={nextUrl} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (username.length < 3) throw new Error("Username must be at least 3 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username } },
        });
        if (error) throw error;
        toast.success("Welcome, soldier. Entering the arena...");
        navigate(nextUrl);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(nextUrl);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const playAsGuest = async () => {
    const name = guestName.trim();
    if (name.length < 2) { toast.error("Enter at least 2 characters"); return; }
    setGuestBusy(true);
    try {
      // Append short random suffix to avoid username collisions
      const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
      const guestUsername = `${name}_${suffix}`;
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { username: guestUsername } },
      });
      if (error) throw error;
      navigate(nextUrl);
    } catch (err: any) {
      if ((err.message ?? "").toLowerCase().includes("anonymous")) {
        toast.error("Guest login not enabled — ask the host to enable Anonymous sign-ins in their Supabase dashboard (Authentication → Providers).");
      } else {
        toast.error(err.message ?? "Guest login failed");
      }
    } finally {
      setGuestBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-grid flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-primary/30 animate-pulse-glow">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Crosshair className="w-10 h-10 text-primary text-glow" />
          <h1 className="text-3xl font-black tracking-widest text-glow">NEON ARENA</h1>
        </div>

        {/* Guest play — shown first for invited friends */}
        <div className="mb-6 p-4 rounded-lg border border-accent/30 bg-accent/5">
          <p className="text-xs uppercase tracking-wider text-accent font-bold mb-3">Play as Guest — no account needed</p>
          <div className="flex gap-2">
            <Input
              placeholder="Choose a callsign"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={16}
              onKeyDown={(e) => { if (e.key === "Enter") playAsGuest(); }}
              className="flex-1"
            />
            <Button onClick={playAsGuest} disabled={guestBusy} variant="secondary" className="font-bold uppercase tracking-wider shrink-0">
              {guestBusy ? <Loader2 className="animate-spin w-4 h-4" /> : "Jump in"}
            </Button>
          </div>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-widest">or sign in / create account</span></div>
        </div>

        <p className="text-center text-muted-foreground mb-4 text-sm uppercase tracking-wider">
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
