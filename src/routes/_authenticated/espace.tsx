import { pageMeta } from '@/lib/page-meta';
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { homeFor, useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/espace")({
  head: () => pageMeta('Mon espace — MedLink', 'Accès à votre espace personnel MedLink.'),
  component: Espace,
});

function Espace() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) return <div className="grid min-h-screen place-items-center text-muted-foreground">Chargement…</div>;
  if (me.isStaff && me.aal !== "aal2") return <Navigate to="/mfa" replace />;
  return <Navigate to={homeFor(me.roles)} replace />;
}
