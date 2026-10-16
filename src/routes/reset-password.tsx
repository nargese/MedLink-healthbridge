import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { passwordIssues } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — MedLink" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte MedLink." },
      { property: "og:title", content: "Nouveau mot de passe — MedLink" },
      { property: "og:description", content: "Réinitialisation du mot de passe MedLink." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issues = passwordIssues(pw);
    if (issues.length) return toast.error("Mot de passe : " + issues.join(", "));
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/espace" });
  };
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl">Nouveau mot de passe</h1>
        <div className="space-y-2"><Label htmlFor="np">Mot de passe</Label><Input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button className="w-full">Enregistrer</Button>
      </form>
    </div>
  );
}
