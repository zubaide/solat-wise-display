import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { changePassword } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/account")({
  component: AccountPage,
});

function AccountPage() {
  const { username, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      toast.error("New password must be at least 10 characters");
      return;
    }
    if (newPassword !== repeatPassword) {
      toast.error("The new passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePassword({ data: { currentPassword, newPassword } });
      toast.success("Password changed. Other devices have been logged out.");
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gold">My account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {username ? `Logged in as ${username}` : "Logged in"}
          {role ? ` (${role})` : ""}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="new-password">New password (at least 10 characters)</Label>
          <Input id="new-password" type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="repeat-password">Repeat new password</Label>
          <Input id="repeat-password" type="password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "..." : "Change password"}
        </Button>
      </form>
    </div>
  );
}
