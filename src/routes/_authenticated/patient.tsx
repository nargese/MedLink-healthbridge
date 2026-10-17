import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { fmtDate, useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/patient")({
  head: () => ({ meta: [{ title: "Mon espace patient — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell require="patient">
      <Patient />
    </AppShell>
  ),
});

function Patient() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const uid = me!.user.id;

  const rdv = useQuery({
    queryKey: ["rdv-patient", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rendez_vous")
        .select("*, praticiens(nom, specialite), cliniques(nom, ville)")
        .eq("patient_id", uid)
        .order("debut", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const docs = useQuery({
    queryKey: ["docs-patient", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*, praticiens(nom)").eq("patient_id", uid).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancel = async (id: string) => {
    const { error } = await supabase.from("rendez_vous").update({ statut: "annule" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rendez-vous annulé.");
    qc.invalidateQueries({ queryKey: ["rdv-patient", uid] });
  };

  const now = Date.now();
  const upcoming = (rdv.data ?? []).filter((r) => r.statut === "confirme" && new Date(r.debut).getTime() > now);
  const past = (rdv.data ?? []).filter((r) => !(r.statut === "confirme" && new Date(r.debut).getTime() > now)).reverse();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title={`Bonjour ${me?.profile?.full_name?.split(" ")[0] ?? ""}`} sub="Vos rendez-vous et documents médicaux." />
        <Button asChild size="lg" className="mb-8"><Link to="/rendez-vous"><CalendarPlus className="mr-2 h-4 w-4" />Prendre rendez-vous</Link></Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 text-2xl">Rendez-vous à venir</h2>
          {upcoming.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Aucun rendez-vous prévu.</p>}
          <div className="space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-soft">
                <div>
                  <p className="font-semibold capitalize">{fmtDate(r.debut)}</p>
                  <p className="text-sm text-muted-foreground">{r.praticiens?.nom} · {r.praticiens?.specialite} · {r.cliniques?.nom}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/rendez-vous" search={{ reporter: r.id }}>Reporter</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>Annuler</Button>
                </div>
              </div>
            ))}
          </div>
          {past.length > 0 && (
            <>
              <h3 className="mb-3 mt-8 text-xl">Historique</h3>
              <div className="divide-y rounded-xl border bg-card">
                {past.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="capitalize">{fmtDate(r.debut)} — {r.praticiens?.nom}</span>
                    <Badge variant={r.statut === "annule" ? "destructive" : "secondary"}>{r.statut === "annule" ? "Annulé" : r.statut === "termine" ? "Terminé" : "Passé"}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-4 text-2xl">Résultats & documents</h2>
          {(docs.data ?? []).length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Aucun document pour le moment.</p>}
          <div className="space-y-2">
            {(docs.data ?? []).map((d) => (
              <Dialog key={d.id}>
                <DialogTrigger asChild>
                  <button className="flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary">
                    <FileText className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{d.titre}</p>
                      <p className="text-xs text-muted-foreground">{d.praticiens?.nom} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display text-2xl font-normal">{d.titre}</DialogTitle></DialogHeader>
                  <p className="whitespace-pre-wrap text-sm">{d.contenu}</p>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
