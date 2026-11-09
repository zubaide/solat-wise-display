import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Megaphone, Images, Calendar, Monitor, BookOpen, User } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Jam Solat" },
      { name: "description", content: "Manage mosque settings, announcements, and display slides." },
    ],
  }),
  component: AdminLayout,
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
  notFoundComponent: () => <p className="p-8 text-center">Page not found.</p>,
});

function AdminLayout() {
  const { isAdmin, role, username, loading, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const refreshed = useRef(false);
  const onSettingsPage = pathname === "/admin" || pathname === "/admin/";

  useEffect(() => {
    if (!refreshed.current) {
      refreshed.current = true;
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (!loading && !isAdmin && refreshed.current) {
      navigate({ to: "/login" });
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!loading && role === "editor" && onSettingsPage) {
      navigate({ to: "/admin/announcements" });
    }
  }, [loading, role, onSettingsPage, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Verifying session...
      </div>
    );
  }

  if (!isAdmin) return null;
  if (role === "editor" && onSettingsPage) return null;

  const navItems = [
    { to: "/admin", label: "Settings", icon: Settings, exact: true, adminOnly: true },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/slideshow", label: "Slides", icon: Images },
    { to: "/admin/kuliah", label: "Kuliah", icon: BookOpen },
    { to: "/admin/takwim", label: "Islamic Calendar", icon: Calendar },
    { to: "/admin/account", label: "My account", icon: User },
  ].filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gold/30 bg-surface-1/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-gold sm:text-xl">Mosque Admin</span>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-elegant sm:ml-4 sm:px-4 sm:py-2"
            >
              <Monitor className="h-4 w-4" />
              TV Display
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {username ?? "Admin"}
              {role ? ` (${role})` : ""}
            </span>
            <Button size="sm" variant="ghost" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 sm:p-6 md:flex-row md:gap-6">
        <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-56 md:shrink-0 md:flex-col md:overflow-visible">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-gradient-gold text-primary-foreground" : "text-foreground hover:bg-surface-2",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 rounded-2xl border border-gold/20 bg-surface-1/80 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
