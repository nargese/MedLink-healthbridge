CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT public.has_role(auth.uid(),'super_admin') AND public.is_aal2() $$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cliniques TO authenticated;
CREATE POLICY "cliniques super admin insert" ON public.cliniques FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "cliniques super admin update" ON public.cliniques FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "cliniques super admin delete" ON public.cliniques FOR DELETE TO authenticated USING (public.is_super_admin());
CREATE POLICY "roles super admin read" ON public.user_roles FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE OR REPLACE FUNCTION public.clinique_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ BEGIN INSERT INTO public.audit_logs(actor_id,action,cible) VALUES(auth.uid(),'clinique_'||lower(TG_OP),coalesce(NEW.id,OLD.id)::text); RETURN coalesce(NEW,OLD); END $$;
CREATE TRIGGER clinique_audit AFTER INSERT OR UPDATE OR DELETE ON public.cliniques FOR EACH ROW EXECUTE FUNCTION public.clinique_audit();