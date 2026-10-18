import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/rendez-vous")({
  validateSearch: (s: Record<string, unknown>): { reporter?: string | undefined } => ({ reporter: typeof s["reporter"] === "string" ? (s["reporter"] as string) : undefined }),
  head: () => ({ meta: [{ title: "Prendre rendez-vous — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell require="patient">
      <Booking />
    </AppShell>
  ),
});

// Créneaux : lun–sam, 08:30–17:00, toutes les 30 min, heure de Tunis (UTC+1)
const SLOTS = Array.from({ length: 17 }, (_, i) => {
  const m = 8 * 60 + 30 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

function nextDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) out.push(d.toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" }));
  }
  return out;
}

function Booking() {
  const { data: me } = useMe();
  const { reporter } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [specialite, setSpecialite] = useState<string>("");
  const [clinique, setClinique] = useState<string>("");
  const [praticien, setPraticien] = useState<string>("");
  const [jour, setJour] = useState<string>(nextDays(1)[0]!);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const days = useMemo(() => nextDays(14), []);

  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from("cliniques").select("*").order("ville"),
        supabase.from("praticiens").select("*, praticien_cliniques(clinique_id)").order("nom"),
      ]);
      return { cliniques: c.data ?? [], praticiens: p.data ?? [] };
    },
  });

  const specialites = [...new Set((catalog.data?.praticiens ?? []).map((p) => p.specialite))];
  const filtered = (catalog.data?.praticiens ?? []).filter(
    (p) => (!specialite || p.specialite === specialite) && (!clinique || p.praticien_cliniques.some((pc) => pc.clinique_id === clinique)),
  );

  const pris = useQuery({
    queryKey: ["pris", praticien, jour],
    enabled: !!praticien,
    queryFn: async () => {
      const { data } = await supabase.rpc("creneaux_pris", { _praticien: praticien, _jour: jour! });
      return new Set((data ?? []).map((t: string) => new Date(t).getTime()));
    },
  });

  const book = async (slot: string) => {
    if (!praticien || !clinique) return toast.error("Choisissez une clinique et un praticien.");
    setBusy(true);
    const debut = new Date(`${jour}T${slot}:00+01:00`).toISOString();
    const { error } = await supabase.from("rendez_vous").insert({
      patient_id: me!.user.id, praticien_id: praticien, clinique_id: clinique, debut, motif: motif.slice(0, 300) || null,
    });
    if (error) {
      setBusy(false);
      return toast.error(error.code === "23505" ? "Ce créneau vient d'être pris." : "Réservation impossible.");
    }
    if (reporter) await supabase.from("rendez_vous").update({ statut: "annule" }).eq("id", reporter);
    setBusy(false);
    toast.success(reporter ? "Rendez-vous reporté." : "Rendez-vous confirmé.");
    qc.invalidateQueries();
    navigate({ to: "/patient" });
  };

  return (
    <>
      <PageTitle title={reporter ? "Reporter le rendez-vous" : "Prendre rendez-vous"} sub="Choisissez une spécialité, une clinique et un créneau disponible." />
      <div className="grid gap-4 rounded-2xl border bg-card p-6 shadow-soft md:grid-cols-3">
        <div className="space-y-2">
          <Label>Spécialité</Label>
          <Select value={specialite} onValueChange={(v) => { setSpecialite(v); setPraticien(""); }}>
            <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
            <SelectContent>{specialites.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Clinique</Label>
          <Select value={clinique} onValueChange={(v) => { setClinique(v); setPraticien(""); }}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{(catalog.data?.cliniques ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Praticien</Label>
          <Select value={praticien} onValueChange={setPraticien} disabled={!clinique}>
            <SelectTrigger><SelectValue placeholder={clinique ? "Choisir" : "Choisissez une clinique"} /></SelectTrigger>
            <SelectContent>{filtered.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom} — {p.specialite}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="motif">Motif (facultatif)</Label>
          <Input id="motif" maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. contrôle annuel" />
        </div>
      </div>

      {praticien && (
        <div className="mt-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const dt = new Date(d + "T12:00:00");
              return (
                <button key={d} onClick={() => setJour(d)} className={`min-w-20 rounded-xl border px-3 py-2 text-center text-sm ${d === jour ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  <div className="capitalize">{dt.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                  <div className="text-lg font-semibold">{dt.getDate()}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SLOTS.map((s) => {
              const taken = pris.data?.has(new Date(`${jour}T${s}:00+01:00`).getTime());
              return (
                <Button key={s} variant="outline" disabled={busy || taken || pris.isLoading} onClick={() => book(s)} className={taken ? "line-through" : ""}>
                  {s}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
