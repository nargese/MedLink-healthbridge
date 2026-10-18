import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { passwordIssues } from "@/lib/auth";
import { Logo } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({ redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Connexion — MedLink" },
      { name: "description", content: "Connectez-vous ou créez votre compte patient MedLink." },
      { property: "og:title", content: "Connexion — MedLink" },
      { property: "og:description", content: "Accès sécurisé à votre espace MedLink." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: locked } = await supabase.rpc("login_locked", { _email: email });
      if (locked) {
        toast.error("Compte temporairement verrouillé après 5 tentatives échouées. Réessayez dans 15 minutes.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      await supabase.rpc("record_login", { _email: email, _success: !error });
      if (error) {
        toast.error("Identifiants incorrects.");
        return;
      }
      navigate({ to: "/espace", replace: true });
    } finally {
      setBusy(false);
    }
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    const issues = passwordIssues(password);
    if (issues.length) return toast.error("Mot de passe : " + issues.join(", "));
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/espace", data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes("pwned") || error.message.toLowerCase().includes("weak") ? "Ce mot de passe a fuité publiquement, choisissez-en un autre." : error.message);
    toast.success("Compte créé. Vérifiez votre e-mail pour confirmer votre adresse.");
    setMode("login");
  };

  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    setBusy(false);
    toast.success("Si un compte existe, un lien de réinitialisation a été envoyé.");
    setMode("login");
  };

  const issues = passwordIssues(password);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-12 text-ink-foreground lg:flex">
        <span className="font-display text-3xl">MedLink</span>
        <div>
          <h1 className="text-5xl leading-tight">Vos soins, <em>en toute confidentialité.</em></h1>
          <p className="mt-4 max-w-md opacity-80">Données hébergées en Tunisie, chiffrées et accessibles uniquement à vous et à votre praticien traitant.</p>
        </div>
        <p className="text-sm opacity-60">Sousse · Sfax · Tunis</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {mode === "forgot" ? (
            <form onSubmit={forgot} className="space-y-4">
              <h2 className="text-3xl">Mot de passe oublié</h2>
              <div className="space-y-2"><Label htmlFor="fe">E-mail</Label><Input id="fe" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <Button className="w-full" disabled={busy}>Envoyer le lien</Button>
              <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode("login")}>Retour</button>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Créer un compte</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={login} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="le">E-mail</Label><Input id="le" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="lp">Mot de passe</Label><Input id="lp" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button className="w-full" disabled={busy}>Se connecter</Button>
                  <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signup} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="sn">Nom complet</Label><Input id="sn" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="se">E-mail</Label><Input id="se" type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="sp">Mot de passe</Label>
                    <Input id="sp" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    {password && issues.length > 0 && <p className="text-xs text-destructive">Manque : {issues.join(", ")}</p>}
                    {password && issues.length === 0 && <p className="text-xs text-success">Mot de passe robuste</p>}
                  </div>
                  <Button className="w-full" disabled={busy}>Créer mon compte patient</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
