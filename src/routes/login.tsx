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
      { title: "Admin Login — Jam Solat" },
      { name: "description", content: "Admin login for the Prayer Time Display System." },
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
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/20 bg-surface-1/80 p-8 shadow-elegant">
        <h1 className="mb-2 font-display text-3xl font-bold text-gold">Mosque Admin</h1>
        <p className="mb-6 text-sm text-muted-foreground">Log in to manage the display.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Admin Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : "Log In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Default password (fresh install): <code>admin1234</code>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-gold">← Back to display</Link>
        </p>
      </div>
    </div>
  );
}
