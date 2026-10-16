import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/mfa")({
  head: () => ({ meta: [{ title: "Double authentification — MedLink" }, { name: "robots", content: "noindex" }] }),
  component: Mfa,
});

function Mfa() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) return setFactorId(verified.id);
      // nettoie les facteurs non vérifiés puis inscrit un nouveau TOTP
      for (const f of data?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: en, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "MedLink " + Date.now() });
      if (error) return toast.error(error.message);
      setFactorId(en.id);
      setQr(en.totp.qr_code);
      setSecret(en.totp.secret);
    })();
  }, []);

  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return toast.error("Code invalide.");
    await supabase.rpc("log_access", { _action: "mfa_valide", _cible: "session" });
    await qc.invalidateQueries();
    navigate({ to: "/espace", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-soft">
        <Logo />
        <div className="mt-6 flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /><span className="text-sm font-semibold">Authentification forte requise</span></div>
        <h1 className="mt-2 text-3xl">{qr ? "Configurer l'application d'authentification" : "Code de vérification"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {qr ? "Scannez ce QR code avec Google Authenticator, Microsoft Authenticator ou similaire, puis saisissez le code à 6 chiffres." : "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."}
        </p>
        {qr && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <img src={qr} alt="QR code MFA" className="h-48 w-48 rounded-lg bg-card p-2" />
            <code className="break-all text-xs text-muted-foreground">{secret}</code>
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify}>
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="mt-6 w-full" onClick={verify} disabled={busy || code.length !== 6}>Vérifier</Button>
      </div>
    </div>
  );
}
