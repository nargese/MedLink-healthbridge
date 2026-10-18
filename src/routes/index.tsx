import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileLock2, ShieldCheck, Stethoscope } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedLink — Rendez-vous et résultats médicaux en ligne" },
      { name: "description", content: "Prenez rendez-vous dans les cliniques MedLink de Sousse, Sfax et Tunis et consultez vos résultats en toute confidentialité." },
      { property: "og:title", content: "MedLink — Portail patient sécurisé" },
      { property: "og:description", content: "Rendez-vous en ligne et résultats médicaux sécurisés dans 3 cliniques en Tunisie." },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: CalendarCheck, t: "Rendez-vous en ligne", d: "Choisissez un créneau, annulez ou reportez sans appeler le standard." },
  { icon: FileLock2, t: "Résultats confidentiels", d: "Vos comptes-rendus et résultats, visibles uniquement par vous et votre praticien." },
  { icon: Stethoscope, t: "40 praticiens", d: "Médecine générale, cardiologie et pédiatrie sur 3 sites." },
  { icon: ShieldCheck, t: "Sécurité renforcée", d: "Double authentification, chiffrement et traçabilité de chaque accès." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Connexion</Link></Button>
          <Button asChild><Link to="/espace">Mon espace</Link></Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Sousse · Sfax · Tunis</p>
          <h1 className="mt-4 text-5xl leading-[1.05] md:text-7xl">Vos soins, <em className="text-primary">sans attente</em> au téléphone.</h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">Réservez votre consultation en quelques clics et retrouvez vos résultats d'examens en ligne, en toute confidentialité.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/auth">Créer mon compte patient</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/espace">J'ai déjà un compte</Link></Button>
          </div>
        </div>
        <img src={hero} alt="Accueil d'une clinique MedLink" width={1280} height={1024} className="aspect-[5/4] w-full rounded-3xl object-cover shadow-soft" />
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-2xl">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © MedLink — Données de santé hébergées et protégées conformément à la loi INPDP. Portail disponible 6h–22h.
      </footer>
    </div>
  );
}
