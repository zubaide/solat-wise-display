import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log Masuk Admin — Jam Solat" },
      { name: "description", content: "Log masuk admin Sistem Paparan Waktu Solat." },
    ],
  }),
  component: LoginPage,
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
  notFoundComponent: () => <p className="p-8 text-center">Not found</p>,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Akaun dicipta — sila semak emel anda untuk pengesahan.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Berjaya log masuk");
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat tidak diketahui");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/admin" });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in gagal");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/20 bg-surface-1/80 p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl font-bold text-gold">Admin Masjid</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "signin" ? "Log masuk untuk uruskan paparan." : "Cipta akaun admin baharu."}
        </p>
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <Label htmlFor="email">Emel</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Kata Laluan</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Log Masuk" : "Daftar"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ATAU <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
          Teruskan dengan Google
        </Button>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-gold"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "Belum ada akaun? Daftar" : "Sudah ada akaun? Log masuk"}
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-gold">← Kembali ke paparan</Link>
        </p>
      </div>
    </div>
  );
}