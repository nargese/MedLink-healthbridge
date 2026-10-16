
CREATE TYPE public.app_role AS ENUM ('patient','praticien','admin');
CREATE TYPE public.rdv_statut AS ENUM ('confirme','annule','termine');
CREATE TYPE public.doc_type AS ENUM ('resultat','compte_rendu','ordonnance');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  date_naissance date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
CREATE TABLE public.cliniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL, ville text NOT NULL, adresse text
);
CREATE TABLE public.praticiens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  nom text NOT NULL,
  specialite text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.praticien_cliniques (
  praticien_id uuid NOT NULL REFERENCES public.praticiens(id) ON DELETE CASCADE,
  clinique_id uuid NOT NULL REFERENCES public.cliniques(id) ON DELETE CASCADE,
  PRIMARY KEY (praticien_id, clinique_id)
);
CREATE TABLE public.rendez_vous (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  praticien_id uuid NOT NULL REFERENCES public.praticiens(id) ON DELETE CASCADE,
  clinique_id uuid NOT NULL REFERENCES public.cliniques(id),
  debut timestamptz NOT NULL,
  motif text,
  statut public.rdv_statut NOT NULL DEFAULT 'confirme',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rdv_slot_unique ON public.rendez_vous(praticien_id, debut) WHERE statut = 'confirme';
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  praticien_id uuid REFERENCES public.praticiens(id) ON DELETE SET NULL,
  rendez_vous_id uuid REFERENCES public.rendez_vous(id) ON DELETE SET NULL,
  type public.doc_type NOT NULL DEFAULT 'compte_rendu',
  titre text NOT NULL,
  contenu text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  lu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  cible text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_idx ON public.login_attempts(lower(email), created_at);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.cliniques TO authenticated, anon;
GRANT SELECT ON public.praticiens TO authenticated, anon;
GRANT SELECT ON public.praticien_cliniques TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.rendez_vous TO authenticated;
GRANT SELECT, INSERT ON public.documents TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.profiles, public.user_roles, public.cliniques, public.praticiens, public.praticien_cliniques, public.rendez_vous, public.documents, public.notifications, public.audit_logs, public.login_attempts TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praticiens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praticien_cliniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendez_vous ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_aal2()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt()->>'aal','') = 'aal2'
$$;
CREATE OR REPLACE FUNCTION public.my_praticien_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.praticiens WHERE user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') AND public.is_aal2()
$$;
CREATE OR REPLACE FUNCTION public.is_my_patient(_patient uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_aal2() AND EXISTS (
    SELECT 1 FROM public.rendez_vous r
    WHERE r.patient_id = _patient AND r.praticien_id = public.my_praticien_id()
  )
$$;

-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_my_patient(id) OR public.is_staff_admin());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- roles
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff_admin());
-- public catalogs
CREATE POLICY "cliniques public" ON public.cliniques FOR SELECT USING (true);
CREATE POLICY "praticiens public" ON public.praticiens FOR SELECT USING (true);
CREATE POLICY "pc public" ON public.praticien_cliniques FOR SELECT USING (true);
-- rendez_vous
CREATE POLICY "rdv read" ON public.rendez_vous FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR (public.is_aal2() AND praticien_id = public.my_praticien_id())
  OR public.is_staff_admin());
CREATE POLICY "rdv insert patient" ON public.rendez_vous FOR INSERT TO authenticated WITH CHECK (
  patient_id = auth.uid() AND statut = 'confirme' AND debut > now()
  AND EXISTS (SELECT 1 FROM public.praticien_cliniques pc WHERE pc.praticien_id = rendez_vous.praticien_id AND pc.clinique_id = rendez_vous.clinique_id));
CREATE POLICY "rdv update" ON public.rendez_vous FOR UPDATE TO authenticated USING (
  patient_id = auth.uid() OR (public.is_aal2() AND praticien_id = public.my_praticien_id()) OR public.is_staff_admin())
  WITH CHECK (patient_id = auth.uid() OR (public.is_aal2() AND praticien_id = public.my_praticien_id()) OR public.is_staff_admin());
-- documents
CREATE POLICY "docs read" ON public.documents FOR SELECT TO authenticated USING (
  patient_id = auth.uid() OR (public.is_aal2() AND praticien_id = public.my_praticien_id()) OR public.is_my_patient(patient_id));
CREATE POLICY "docs insert praticien" ON public.documents FOR INSERT TO authenticated WITH CHECK (
  public.is_aal2() AND praticien_id = public.my_praticien_id() AND public.is_my_patient(patient_id));
-- notifications
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- audit
CREATE POLICY "audit admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff_admin());

-- new user: profile + patient role (first user ever becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name) VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'patient');
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, cible) VALUES (NEW.id, 'compte_cree', NEW.id::text);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- audit + notifications on rdv changes
CREATE OR REPLACE FUNCTION public.rdv_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pr_user uuid;
BEGIN
  SELECT user_id INTO pr_user FROM public.praticiens WHERE id = NEW.praticien_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(actor_id, action, cible, details) VALUES (auth.uid(), 'rdv_cree', NEW.id::text, jsonb_build_object('debut', NEW.debut));
    INSERT INTO public.notifications(user_id, message) VALUES (NEW.patient_id, 'Rappel : rendez-vous le ' || to_char(NEW.debut AT TIME ZONE 'Africa/Tunis', 'DD/MM/YYYY à HH24:MI'));
    IF pr_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, message) VALUES (pr_user, 'Nouveau rendez-vous le ' || to_char(NEW.debut AT TIME ZONE 'Africa/Tunis', 'DD/MM/YYYY à HH24:MI'));
    END IF;
  ELSIF NEW.statut = 'annule' AND OLD.statut <> 'annule' THEN
    INSERT INTO public.audit_logs(actor_id, action, cible) VALUES (auth.uid(), 'rdv_annule', NEW.id::text);
    IF pr_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, message) VALUES (pr_user, 'Annulation : rendez-vous du ' || to_char(NEW.debut AT TIME ZONE 'Africa/Tunis', 'DD/MM/YYYY à HH24:MI') || ' annulé');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rdv_audit_trg AFTER INSERT OR UPDATE ON public.rendez_vous FOR EACH ROW EXECUTE FUNCTION public.rdv_audit();

-- patients may only change statut to annule (no field tampering)
CREATE OR REPLACE FUNCTION public.rdv_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.patient_id AND NOT public.has_role(auth.uid(),'admin') THEN
    IF NEW.patient_id <> OLD.patient_id OR NEW.praticien_id <> OLD.praticien_id OR NEW.debut <> OLD.debut OR NEW.clinique_id <> OLD.clinique_id OR NEW.statut <> 'annule' THEN
      RAISE EXCEPTION 'Modification non autorisée';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rdv_guard_trg BEFORE UPDATE ON public.rendez_vous FOR EACH ROW EXECUTE FUNCTION public.rdv_guard();

CREATE OR REPLACE FUNCTION public.doc_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, action, cible, details) VALUES (auth.uid(), 'document_cree', NEW.patient_id::text, jsonb_build_object('document', NEW.id, 'type', NEW.type));
  INSERT INTO public.notifications(user_id, message) VALUES (NEW.patient_id, 'Nouveau document disponible : ' || NEW.titre);
  RETURN NEW;
END $$;
CREATE TRIGGER doc_audit_trg AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.doc_audit();

-- explicit access logging (dossier consulté)
CREATE OR REPLACE FUNCTION public.log_access(_action text, _cible text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non authentifié'; END IF;
  INSERT INTO public.audit_logs(actor_id, action, cible) VALUES (auth.uid(), left(_action, 60), left(_cible, 120));
END $$;
GRANT EXECUTE ON FUNCTION public.log_access(text, text) TO authenticated;

-- booked slots without exposing who booked
CREATE OR REPLACE FUNCTION public.creneaux_pris(_praticien uuid, _jour date)
RETURNS SETOF timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT debut FROM public.rendez_vous
  WHERE praticien_id = _praticien AND statut = 'confirme'
    AND (debut AT TIME ZONE 'Africa/Tunis')::date = _jour
$$;
GRANT EXECUTE ON FUNCTION public.creneaux_pris(uuid, date) TO authenticated;

-- anti brute force
CREATE OR REPLACE FUNCTION public.login_locked(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) >= 5 FROM public.login_attempts
  WHERE lower(email) = lower(_email) AND NOT success AND created_at > now() - interval '15 minutes'
    AND created_at > coalesce((SELECT max(created_at) FROM public.login_attempts WHERE lower(email)=lower(_email) AND success), '-infinity')
$$;
CREATE OR REPLACE FUNCTION public.record_login(_email text, _success boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.login_attempts(email, success) VALUES (left(lower(_email), 200), _success);
  IF NOT _success THEN
    INSERT INTO public.audit_logs(action, cible) VALUES ('connexion_echouee', left(lower(_email),200));
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.login_locked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login(text, boolean) TO anon, authenticated;

-- anonymized stats (admin only)
CREATE OR REPLACE FUNCTION public.stats_anonymes()
RETURNS TABLE(mois text, clinique text, specialite text, statut text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'accès refusé'; END IF;
  RETURN QUERY
  SELECT to_char(r.debut, 'YYYY-MM'), c.nom, p.specialite, r.statut::text, count(*)
  FROM public.rendez_vous r JOIN public.cliniques c ON c.id = r.clinique_id JOIN public.praticiens p ON p.id = r.praticien_id
  GROUP BY 1,2,3,4 ORDER BY 1 DESC, 2;
END $$;
GRANT EXECUTE ON FUNCTION public.stats_anonymes() TO authenticated;

-- seed
INSERT INTO public.cliniques(id, nom, ville, adresse) VALUES
 ('11111111-1111-1111-1111-111111111111','MedLink Sousse','Sousse','Avenue Habib Bourguiba, Sousse'),
 ('22222222-2222-2222-2222-222222222222','MedLink Sfax','Sfax','Route de Tunis km 2, Sfax'),
 ('33333333-3333-3333-3333-333333333333','MedLink Tunis','Tunis','Rue du Lac Léman, Les Berges du Lac');
INSERT INTO public.praticiens(id, nom, specialite) VALUES
 ('a0000000-0000-0000-0000-000000000001','Dr Amira Ben Salah','Médecine générale'),
 ('a0000000-0000-0000-0000-000000000002','Dr Karim Trabelsi','Cardiologie'),
 ('a0000000-0000-0000-0000-000000000003','Dr Leïla Gharbi','Pédiatrie'),
 ('a0000000-0000-0000-0000-000000000004','Dr Mehdi Jlassi','Médecine générale'),
 ('a0000000-0000-0000-0000-000000000005','Dr Sonia Hammami','Cardiologie'),
 ('a0000000-0000-0000-0000-000000000006','Dr Youssef Masmoudi','Pédiatrie');
INSERT INTO public.praticien_cliniques VALUES
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'),
 ('a0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333'),
 ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111'),
 ('a0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222'),
 ('a0000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222'),
 ('a0000000-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222'),
 ('a0000000-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333'),
 ('a0000000-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333'),
 ('a0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111');
