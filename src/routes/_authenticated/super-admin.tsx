import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { pageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Comptes } from "@/components/Accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => pageMeta("Super administration — MedLink", "Gestion des utilisateurs, des rôles et des cliniques MedLink."),
  component: () => (
    <AppShell require="super_admin">
      <PageTitle title="Super administration" sub="Utilisateurs, rôles et cliniques du réseau MedLink." />
      <Tabs defaultValue="utilisateurs">
        <TabsList>
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="cliniques">Cliniques</TabsTrigger>
        </TabsList>
        <TabsContent value="utilisateurs" className="mt-6"><Comptes /></TabsContent>
        <TabsContent value="cliniques" className="mt-6"><Cliniques /></TabsContent>
      </Tabs>
    </AppShell>
  ),
});

function Cliniques() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["cliniques-sa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cliniques").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ nom: "", ville: "", adresse: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["cliniques-sa"] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("cliniques").insert({ nom: f.nom.trim(), ville: f.ville.trim(), adresse: f.adresse.trim() || null });
    if (error) return toast.error("Ajout refusé : " + error.message);
    toast.success("Clinique ajoutée.");
    setF({ nom: "", ville: "", adresse: "" });
    refresh();
  };
  const update = async (id: string, patch: { nom?: string; ville?: string; adresse?: string }) => {
    const { error } = await supabase.from("cliniques").update(patch).eq("id", id);
    if (error) return toast.error("Modification refusée.");
    toast.success("Clinique mise à jour.");
    refresh();
  };
  const remove = async (id: string, nom: string) => {
    if (!confirm(`Supprimer la clinique « ${nom} » ?`)) return;
    const { error } = await supabase.from("cliniques").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible : des rendez-vous ou praticiens y sont rattachés.");
    toast.success("Clinique supprimée.");
    refresh();
  };
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <form onSubmit={add} className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
        <h2 className="text-2xl">Ajouter une clinique</h2>
        <div className="space-y-2"><Label>Nom</Label><Input required maxLength={100} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></div>
        <div className="space-y-2"><Label>Ville</Label><Input required maxLength={60} value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} /></div>
        <div className="space-y-2"><Label>Adresse</Label><Input maxLength={200} value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} /></div>
        <Button className="w-full">Ajouter</Button>
      </form>
      <div className="lg:col-span-3">
        <h2 className="mb-4 text-2xl">Cliniques</h2>
        <Table>
          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Ville</TableHead><TableHead>Adresse</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Input defaultValue={c.nom} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nom && update(c.id, { nom: e.target.value.trim() })} /></TableCell>
                <TableCell><Input defaultValue={c.ville} onBlur={(e) => e.target.value.trim() && e.target.value !== c.ville && update(c.id, { ville: e.target.value.trim() })} /></TableCell>
                <TableCell><Input defaultValue={c.adresse ?? ""} onBlur={(e) => e.target.value !== (c.adresse ?? "") && update(c.id, { adresse: e.target.value.trim() })} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove(c.id, c.nom)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
