import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Megaphone, Images } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Jam Solat" },
      { name: "description", content: "Urus tetapan masjid, pengumuman, dan slaid paparan." },
    ],
  }),
  component: AdminLayout,
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
  notFoundComponent: () => <p className="p-8 text-center">Halaman tidak ditemui.</p>,
});

function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/login" });
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuatkan...</div>;
  }
  if (!isAdmin) return null;

  const navItems = [
    { to: "/admin", label: "Tetapan", icon: Settings, exact: true },
    { to: "/admin/announcements", label: "Pengumuman", icon: Megaphone },
    { to: "/admin/slideshow", label: "Slaid", icon: Images },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gold/30 bg-surface-1/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-gold">Admin Masjid</span>
            <Link to="/" className="ml-4 text-sm text-muted-foreground hover:text-gold">
              Lihat Paparan →
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <Button size="sm" variant="ghost" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <nav className="w-56 shrink-0 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-gradient-gold text-primary-foreground" : "text-foreground hover:bg-surface-2",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 rounded-2xl border border-gold/20 bg-surface-1/80 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}