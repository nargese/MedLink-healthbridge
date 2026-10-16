import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/auth";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-xl">M</span>
      <span className="font-display text-2xl tracking-tight">MedLink</span>
    </Link>
  );
}

function Notifications({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  const unread = data.filter((n) => !n.lu).length;
  const markAll = async () => {
    await supabase.from("notifications").update({ lu: true }).eq("user_id", userId).eq("lu", false);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  };
  return (
    <Popover onOpenChange={(o) => o && unread > 0 && markAll()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-auto">
          {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune notification.</p>}
          {data.map((n) => (
            <div key={n.id} className="border-b px-4 py-3 text-sm last:border-0">
              <p>{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const NAV: Record<Role, { to: "/patient" | "/rendez-vous" | "/praticien" | "/admin"; label: string }[]> = {
  patient: [
    { to: "/patient", label: "Mon espace" },
    { to: "/rendez-vous", label: "Prendre RDV" },
  ],
  praticien: [{ to: "/praticien", label: "Agenda" }],
  admin: [{ to: "/admin", label: "Back-office" }],
};

export function AppShell({ require, children }: { require: Role; children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Chargement…</div>;
  if (!me) return <Navigate to="/auth" />;
  if (!me.roles.includes(require)) return <Navigate to="/espace" />;
  if (me.isStaff && me.aal !== "aal2") return <Navigate to="/mfa" />;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const links = me.roles.flatMap((r) => NAV[r]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Logo />
          <nav className="flex flex-1 gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground font-medium" }}>
                {l.label}
              </Link>
            ))}
          </nav>
          {me.aal === "aal2" && (
            <span className="hidden items-center gap-1 text-xs text-success sm:flex"><ShieldCheck className="h-4 w-4" /> MFA</span>
          )}
          <Notifications userId={me.user.id} />
          <span className="hidden text-sm md:block">{me.profile?.full_name || me.user.email}</span>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter"><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
    </div>
  );
}
