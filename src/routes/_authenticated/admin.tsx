import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CallTracking } from '@/components/CallTracking';
import { pageMeta } from '@/lib/page-meta';
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { fmtDate } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageMeta('Back-office — MedLink', 'Supervision de l’activité, des appels, des comptes et des accès MedLink.'),
  component: () => (
    <AppShell require="admin">
      <Admin />
    </AppShell>
  ),
});

function Admin() {
  return (
    <>
      <PageTitle title="Back-office" sub="Supervision des cliniques, des appels et du journal d'audit." />
      <Tabs defaultValue="activite">
        <TabsList>
          <TabsTrigger value="activite">Activité</TabsTrigger>
          <TabsTrigger value="audit">Journal d'audit</TabsTrigger>
          <TabsTrigger value="appels">Appels</TabsTrigger>
        </TabsList>
        <TabsContent value="activite" className="mt-6"><Activite /></TabsContent>
        <TabsContent value="audit" className="mt-6"><Audit /></TabsContent>
        <TabsContent value="appels" className="mt-6"><CallTracking /></TabsContent>
      </Tabs>
    </>
  );
}

function Activite() {
  const { data = [] } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stats_anonymes");
      if (error) throw error;
      return data;
    },
  });
  const byClinic = data.reduce<Record<string, { total: number; annule: number }>>((acc, r) => {
    const k = (acc[r.clinique] ||= { total: 0, annule: 0 });
    k.total += Number(r.total);
    if (r.statut === "annule") k.annule += Number(r.total);
    return acc;
  }, {});
  const exportCsv = async () => {
    const { error } = await supabase.rpc('log_access', { _action: 'export_stats', _cible: 'stats_anonymes' });
    if (error) return toast.error('Export refusé.');
    const rows = [["mois", "clinique", "specialite", "statut", "total"], ...data.map((r) => [r.mois, r.clinique, r.specialite, r.statut, String(r.total)])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/^[=+@-]/, "'").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `medlink-stats-anonymes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {["MedLink Sousse", "MedLink Sfax", "MedLink Tunis"].map((c) => (
          <div key={c} className="rounded-2xl border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">{c}</p>
            <p className="mt-2 font-display text-5xl">{byClinic[c]?.total ?? 0}</p>
            <p className="text-sm text-muted-foreground">rendez-vous · {byClinic[c]?.annule ?? 0} annulé(s)</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <h2 className="text-2xl">Statistiques anonymisées</h2>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Exporter CSV</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Mois</TableHead><TableHead>Clinique</TableHead><TableHead>Spécialité</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((r, i) => (
            <TableRow key={i}><TableCell>{r.mois}</TableCell><TableCell>{r.clinique}</TableCell><TableCell>{r.specialite}</TableCell><TableCell>{r.statut}</TableCell><TableCell className="text-right">{r.total}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


const LABELS: Record<string, string> = {
  compte_cree: "Compte créé", compte_cree_admin: "Compte créé (admin)", rdv_cree: "RDV créé", rdv_annule: "RDV annulé",
  document_cree: "Document ajouté", dossier_consulte: "Dossier consulté", connexion_echouee: "Connexion échouée",
  mfa_valide: "MFA validée", clinique_insert: "Clinique ajoutée", clinique_update: "Clinique modifiée", clinique_delete: "Clinique supprimée", role_modifie: "Rôle modifié", export_stats: "Export statistiques",
};

function Audit() {
  const { data = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Quand</TableHead><TableHead>Qui</TableHead><TableHead>Quoi</TableHead><TableHead>Cible</TableHead></TableRow></TableHeader>
      <TableBody>
        {data.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="whitespace-nowrap text-sm capitalize">{fmtDate(l.created_at)}</TableCell>
            <TableCell className="font-mono text-xs">{l.actor_id?.slice(0, 8) ?? "anonyme"}</TableCell>
            <TableCell>{LABELS[l.action] ?? l.action}</TableCell>
            <TableCell className="font-mono text-xs">{l.cible?.slice(0, 40)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
