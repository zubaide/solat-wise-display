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
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuatkan...</div>;
  }
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-gold">Akses ditolak</h1>
        <p className="max-w-md text-muted-foreground">
          Akaun anda ({user.email}) belum mempunyai peranan admin. Sila minta admin sedia ada untuk menetapkan peranan anda dalam jadual <code className="rounded bg-surface-2 px-1">user_roles</code>.
        </p>
        <Button variant="outline" onClick={() => signOut()}>Log keluar</Button>
      </div>
    );
  }

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
            <span className="text-muted-foreground">{user.email}</span>
            <Button size="sm" variant="ghost" onClick={() => signOut()}>
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