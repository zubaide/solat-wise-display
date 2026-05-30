import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth-context";
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
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ data: { password } });
      await refresh();
      toast.success("Berjaya log masuk");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat tidak diketahui");
    } finally {
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Kata Laluan Admin</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : "Log Masuk"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Kata laluan lalai (jika baru pasang): <code>admin1234</code>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-gold">← Kembali ke paparan</Link>
        </p>
      </div>
    </div>
  );
}