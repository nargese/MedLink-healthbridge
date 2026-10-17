import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { fmtDate, passwordIssues } from "@/lib/auth";
import { createAccount, listUsers, setRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Back-office — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell require="admin">
      <Admin />
    </AppShell>
  ),
});

function Admin() {
  return (
    <>
      <PageTitle title="Back-office" sub="Supervision des 3 cliniques, comptes et journal d'audit." />
      <Tabs defaultValue="activite">
        <TabsList>
          <TabsTrigger value="activite">Activité</TabsTrigger>
          <TabsTrigger value="comptes">Comptes</TabsTrigger>
          <TabsTrigger value="audit">Journal d'audit</TabsTrigger>
        </TabsList>
        <TabsContent value="activite" className="mt-6"><Activite /></TabsContent>
        <TabsContent value="comptes" className="mt-6"><Comptes /></TabsContent>
        <TabsContent value="audit" className="mt-6"><Audit /></TabsContent>
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
  const exportCsv = () => {
    const rows = [["mois", "clinique", "specialite", "statut", "total"], ...data.map((r) => [r.mois, r.clinique, r.specialite, r.statut, String(r.total)])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `medlink-stats-anonymes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    supabase.rpc("log_access", { _action: "export_stats", _cible: "stats_anonymes" });
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

function Comptes() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createAccount);
  const changeRole = useServerFn(setRole);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const catalog = useQuery({
    queryKey: ["catalog-admin"],
    queryFn: async () => {
      const [c, p] = await Promise.all([supabase.from("cliniques").select("*"), supabase.from("praticiens").select("*").is("user_id", null)]);
      return { cliniques: c.data ?? [], libres: p.data ?? [] };
    },
  });
  const [f, setF] = useState({ email: "", password: "", full_name: "", role: "praticien" as "patient" | "praticien" | "admin", praticien_id: "new", specialite: "", clinique: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issues = passwordIssues(f.password);
    if (issues.length) return toast.error("Mot de passe : " + issues.join(", "));
    try {
      await create({
        data: {
          email: f.email, password: f.password, full_name: f.full_name, role: f.role,
          praticien_id: f.praticien_id !== "new" ? f.praticien_id : undefined,
          specialite: f.specialite || undefined,
          cliniques: f.clinique ? [f.clinique] : undefined,
        },
      });
      toast.success("Compte créé. L'utilisateur devra configurer la double authentification à sa première connexion.");
      setF({ ...f, email: "", password: "", full_name: "" });
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
        <h2 className="text-2xl">Créer un compte</h2>
        <div className="space-y-2"><Label>Nom complet</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-2"><Label>Mot de passe provisoire</Label><Input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Rôle</Label>
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as typeof f.role })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="praticien">Praticien</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="patient">Patient</SelectItem></SelectContent>
          </Select>
        </div>
        {f.role === "praticien" && (
          <>
            <div className="space-y-2">
              <Label>Fiche praticien</Label>
              <Select value={f.praticien_id} onValueChange={(v) => setF({ ...f, praticien_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nouvelle fiche</SelectItem>
                  {(catalog.data?.libres ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nom} ({p.specialite})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {f.praticien_id === "new" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Spécialité</Label>
                  <Select value={f.specialite} onValueChange={(v) => setF({ ...f, specialite: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{["Médecine générale", "Cardiologie", "Pédiatrie"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Clinique</Label>
                  <Select value={f.clinique} onValueChange={(v) => setF({ ...f, clinique: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{(catalog.data?.cliniques ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </>
        )}
        <Button className="w-full">Créer</Button>
      </form>
      <div className="lg:col-span-3">
        <h2 className="mb-4 text-2xl">Utilisateurs</h2>
        <Table>
          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>E-mail</TableHead><TableHead>Rôle</TableHead></TableRow></TableHeader>
          <TableBody>
            {(users.data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name || "—"}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.roles[0] ?? "patient"}
                    onValueChange={async (v) => {
                      try {
                        await changeRole({ data: { user_id: u.id, role: v as "patient" } });
                        toast.success("Rôle mis à jour.");
                        users.refetch();
                      } catch (err) { toast.error((err as Error).message); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="patient">Patient</SelectItem><SelectItem value="praticien">Praticien</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  compte_cree: "Compte créé", compte_cree_admin: "Compte créé (admin)", rdv_cree: "RDV créé", rdv_annule: "RDV annulé",
  document_cree: "Document ajouté", dossier_consulte: "Dossier consulté", connexion_echouee: "Connexion échouée",
  mfa_valide: "MFA validée", role_modifie: "Rôle modifié", export_stats: "Export statistiques",
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
