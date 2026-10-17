import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string; claims: any }) {
  if (ctx.claims?.aal !== "aal2") throw new Error("MFA requise");
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Accès refusé");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, full_name"),
    ]);
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: profiles?.find((p) => p.id === u.id)?.full_name ?? "",
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  });

const staffSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(["patient", "praticien", "admin"]),
  praticien_id: z.string().uuid().optional(),
  specialite: z.string().trim().max(60).optional(),
  cliniques: z.array(z.string().uuid()).max(3).optional(),
});

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => staffSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    if (data.role === "praticien") {
      if (data.praticien_id) {
        await supabaseAdmin.from("praticiens").update({ user_id: uid }).eq("id", data.praticien_id);
      } else {
        const { data: p } = await supabaseAdmin
          .from("praticiens")
          .insert({ user_id: uid, nom: data.full_name, specialite: data.specialite || "Médecine générale" })
          .select()
          .single();
        if (p && data.cliniques?.length)
          await supabaseAdmin.from("praticien_cliniques").insert(data.cliniques.map((c) => ({ praticien_id: p.id, clinique_id: c })));
      }
    }
    await supabaseAdmin.from("audit_logs").insert({ actor_id: context.userId, action: "compte_cree_admin", cible: uid, details: { role: data.role } });
    return { id: uid };
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), role: z.enum(["patient", "praticien", "admin"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    await supabaseAdmin.from("audit_logs").insert({ actor_id: context.userId, action: "role_modifie", cible: data.user_id, details: { role: data.role } });
    return { ok: true };
  });
