import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { fmtDate, useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dossier/$patientId")({
  validateSearch: (s: Record<string, unknown>): { rdv?: string | undefined } => ({ rdv: typeof s["rdv"] === "string" ? (s["rdv"] as string) : undefined }),
  head: () => ({ meta: [{ title: "Dossier patient — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell require="praticien">
      <Dossier />
    </AppShell>
  ),
});

function Dossier() {
  const { patientId } = Route.useParams();
  const { rdv } = Route.useSearch();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [titre, setTitre] = useState("Compte-rendu de consultation");
  const [type, setType] = useState<"compte_rendu" | "resultat" | "ordonnance">("compte_rendu");
  const [contenu, setContenu] = useState("");

  useEffect(() => {
    supabase.rpc("log_access", { _action: "dossier_consulte", _cible: patientId });
  }, [patientId]);

  const q = useQuery({
    queryKey: ["dossier", patientId],
    queryFn: async () => {
      const [p, d, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("documents").select("*, praticiens(nom)").eq("patient_id", patientId).order("created_at", { ascending: false }),
        supabase.from("rendez_vous").select("*, cliniques(nom)").eq("patient_id", patientId).eq("praticien_id", me!.praticien!.id).order("debut", { ascending: false }),
      ]);
      return { profile: p.data, docs: d.data ?? [], rdvs: r.data ?? [] };
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contenu.trim().length < 5) return toast.error("Le contenu est trop court.");
    const { error } = await supabase.from("documents").insert({
      patient_id: patientId, praticien_id: me!.praticien!.id, rendez_vous_id: rdv ?? null, type, titre: titre.slice(0, 150), contenu: contenu.slice(0, 10000),
    });
    if (error) return toast.error("Accès refusé ou erreur d'enregistrement.");
    if (rdv) await supabase.from("rendez_vous").update({ statut: "termine" }).eq("id", rdv);
    toast.success("Document enregistré et partagé avec le patient.");
    setContenu("");
    qc.invalidateQueries();
  };

  if (q.isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (!q.data?.profile) return <p className="text-muted-foreground">Accès refusé : ce patient n'est pas suivi par vous.</p>;

  return (
    <>
      <Link to="/praticien" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Agenda</Link>
      <PageTitle title={q.data.profile.full_name || "Patient"} sub={`${q.data.rdvs.length} consultation(s) avec vous · accès journalisé`} />
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
          <h2 className="text-2xl">Nouveau document</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compte_rendu">Compte-rendu</SelectItem>
                  <SelectItem value="resultat">Résultat d'examen</SelectItem>
                  <SelectItem value="ordonnance">Ordonnance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="t">Titre</Label><Input id="t" maxLength={150} value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="c">Contenu</Label><Textarea id="c" rows={10} maxLength={10000} value={contenu} onChange={(e) => setContenu(e.target.value)} /></div>
          <Button>Enregistrer</Button>
        </form>
        <div>
          <h2 className="mb-4 text-2xl">Historique du dossier</h2>
          <div className="space-y-3">
            {q.data.docs.length === 0 && <p className="text-sm text-muted-foreground">Aucun document.</p>}
            {q.data.docs.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{d.titre}</p>
                <p className="text-xs text-muted-foreground">{d.praticiens?.nom} · {fmtDate(d.created_at)}</p>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm">{d.contenu}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
