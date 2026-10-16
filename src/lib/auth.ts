import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "patient" | "praticien" | "admin";

/** Politique de mots de passe : 12 caractères min, majuscule, minuscule, chiffre, symbole. */
export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 12) issues.push("12 caractères minimum");
  if (!/[A-Z]/.test(pw)) issues.push("une majuscule");
  if (!/[a-z]/.test(pw)) issues.push("une minuscule");
  if (!/[0-9]/.test(pw)) issues.push("un chiffre");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("un caractère spécial");
  return issues;
}

export const STAFF_ROLES: Role[] = ["praticien", "admin"];

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: roles }, { data: profile }, { data: prat }, aal] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("praticiens").select("*").eq("user_id", u.user.id).maybeSingle(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      const r = (roles ?? []).map((x) => x.role as Role);
      return {
        user: u.user,
        roles: r,
        profile,
        praticien: prat,
        aal: aal.data?.currentLevel ?? "aal1",
        isStaff: r.some((x) => STAFF_ROLES.includes(x)),
      };
    },
  });
}

export function homeFor(roles: Role[]): "/admin" | "/praticien" | "/patient" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("praticien")) return "/praticien";
  return "/patient";
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Africa/Tunis",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
