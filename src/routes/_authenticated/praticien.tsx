import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { fmtDate, useMe } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/praticien")({
  head: () => ({ meta: [{ title: "Agenda praticien — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell require="praticien">
      <Agenda />
    </AppShell>
  ),
});

function Agenda() {
  const { data: me } = useMe();
  const [clinique, setClinique] = useState("all");
  const pid = me?.praticien?.id;

  const rdv = useQuery({
    queryKey: ["agenda", pid],
    enabled: !!pid,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data, error } = await supabase
        .from("rendez_vous")
        .select("*, cliniques(nom, ville)")
        .eq("praticien_id", pid!)
        .gte("debut", since)
        .order("debut");
      if (error) throw error;
      const ids = [...new Set(data.map((r) => r.patient_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
      const names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return data.map((r) => ({ ...r, patient: names.get(r.patient_id) || "Patient" }));
    },
  });

  if (!pid) return <p className="text-muted-foreground">Votre compte n'est pas encore rattaché à une fiche praticien. Contactez l'administration.</p>;

  const list = (rdv.data ?? []).filter((r) => clinique === "all" || r.clinique_id === clinique);
  const cliniques = [...new Map((rdv.data ?? []).map((r) => [r.clinique_id, r.cliniques?.nom])).entries()];
  const groups = list.reduce<Record<string, typeof list>>((acc, r) => {
    const k = new Date(r.debut).toLocaleDateString("fr-FR", { timeZone: "Africa/Tunis", weekday: "long", day: "numeric", month: "long" });
    (acc[k] ||= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title={me?.praticien?.nom ?? "Agenda"} sub={`${me?.praticien?.specialite} · Agenda unifié multi-sites`} />
        <div className="mb-8 w-56">
          <Select value={clinique} onValueChange={setClinique}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cliniques</SelectItem>
              {cliniques.map(([id, nom]) => <SelectItem key={id} value={id}>{nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {list.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Aucun rendez-vous.</p>}
      <div className="space-y-8">
        {Object.entries(groups).map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-3 text-2xl capitalize">{day}</h2>
            <div className="divide-y rounded-xl border bg-card shadow-soft">
              {items.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4">
                    <span className="w-14 font-semibold">{new Date(r.debut).toLocaleTimeString("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit" })}</span>
                    <div>
                      <p className="font-medium">{r.patient}</p>
                      <p className="text-sm text-muted-foreground">{r.cliniques?.nom}{r.motif ? ` · ${r.motif}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.statut === "annule" && <Badge variant="destructive">Annulé</Badge>}
                    {r.statut === "termine" && <Badge variant="secondary">Terminé</Badge>}
                    <Link to="/dossier/$patientId" params={{ patientId: r.patient_id }} search={{ rdv: r.id }} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Dernière mise à jour : {fmtDate(new Date().toISOString())}</p>
    </>
  );
}
