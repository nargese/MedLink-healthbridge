# MedLink — Architecture, SRS et recette

## Périmètre et cas d’usage
Patient : inscription, connexion, réservation, annulation/report, consultation des documents et notifications.
Praticien : connexion avec MFA, agenda multi-sites, consultation des dossiers de ses patients, rédaction de documents.
Administrateur/Direction : connexion avec MFA, comptes et rôles, statistiques agrégées, relevés d’appels et exports, audit.
Hors périmètre : paiement, vidéo, application native, laboratoires externes.

## Architecture réelle
React 19 + TanStack Start, fonctions serveur sur un environnement Worker, PostgreSQL dans Lovable Cloud.
Les données sont filtrées par RLS. Les droits sont stockés dans `user_roles`, jamais dans les métadonnées modifiables par les utilisateurs. Les opérations administratives vérifient rôle et MFA avant utilisation du client privilégié. Les nouveaux inscrits sont patients.
La connexion du portail vérifie le verrouillage puis enregistre le résultat côté serveur. Les RPC de tentatives ne sont pas accessibles au navigateur. Limite importante : un client qui appelle directement l’API d’authentification peut contourner le verrouillage propre au portail ; une protection stricte à cette frontière nécessite un dispositif d’authentification/hébergement adapté. Ne pas présenter cette protection comme une garantie globale contre le brute-force.
Les rappels sont des notifications internes, produits une fois par rendez-vous confirmé dans les 24 prochaines heures, par une tâche horaire. Le délai de détection maximal est une heure. Ils ne constituent ni SMS ni e-mail ni notification push.

## Modèle de données
- profiles → user_roles : identité de profil et rôles protégés.
- praticiens ↔ cliniques via praticien_cliniques : affectations multi-sites.
- rendez_vous : patient, praticien, clinique, début, statut, motif ; unicité du créneau confirmé.
- documents : patient, praticien, rendez-vous facultatif, type, titre, contenu.
- notifications : destinataire, lecture, rendez-vous et catégorie ; rappel unique.
- audit_logs : acteur, action, cible, date, détails ; écrit par déclencheurs ou RPC.
- login_attempts : tentatives serveur, succès et date.
- appels_mensuels : clinique, mois, appels mesurés, référence ; aucune donnée patient.

## Indicateurs Direction
Activité agrégée par mois, clinique, spécialité et statut ; aucun nom de patient exporté.
Baisse des appels = (appels de référence − appels reçus) / appels de référence × 100. Une référence nulle rend le taux non calculable ; un résultat négatif représente une hausse. La référence doit être un relevé réellement mesuré, pas une estimation tirée des rendez-vous.
Les agrégats sans noms ne prouvent pas une anonymisation irréversible, notamment pour les petits effectifs : réserver ces exports à la Direction et éviter leur diffusion publique.

## Recette à valider
| Scénario | Résultat attendu |
|---|---|
| Mot de passe de 11 caractères | Refus |
| 12 caractères avec majuscule, minuscule, chiffre, symbole | Accepté si non compromis |
| 5 échecs de connexion via le portail | Verrouillage temporaire de 15 minutes |
| 15 minutes d’inactivité | Déconnexion de l’interface ; session serveur à évaluer séparément |
| Patient lit le dossier d’un autre | Refus RLS |
| Praticien sans MFA | Aucune lecture des dossiers |
| Praticien avec MFA, patient non suivi | Refus |
| Admin sans MFA | Refus des comptes, audit et relevés |
| Rendez-vous déjà pris | Refus atomique de réservation |
| Création de document avec rendez-vous d’un autre patient | Refus |
| Deux exécutions des rappels | Un seul rappel par rendez-vous |
| Rendez-vous annulé | Aucun nouveau rappel |
| Appels 200 → 150 | Baisse de 25 % |
| Export Direction | Pas de nom ni de donnée médicale |

La validation définitive de recette appartient au groupe projet et à la Direction. Une checklist ou un test automatisé ne remplace pas leur signature.

## Sécurité OWASP et exploitation
- Contrôler RBAC/RLS, MFA, les RPC publics, validation des entrées et erreurs.
- Ne jamais committer de clé privée. Les secrets actuels sont gérés par Lovable Cloud, pas par un HashiCorp Vault déployé pour ce projet.
- HTTPS et chiffrement au repos dépendent de l’hébergement ; leur conformité, les sauvegardes, les clés, la résidence tunisienne et les contrats doivent être vérifiés hors du code.
- La plage 6h–22h est une exigence de disponibilité, pas une interdiction d’accès en dehors de ces heures. Le portail ne ferme donc pas à 22h. Une garantie de disponibilité nécessite surveillance et engagement d’exploitation.
- Ne pas certifier une conformité INPDP ou une résidence tunisienne sur la base de cet aperçu.

## Dépôt et intégration continue
Organisation : `src/routes` pages, `src/components` interface, `src/lib` règles et fonctions serveur, `src/test` tests, `drizzle/migrations` historique PostgreSQL, `docs` recette et architecture.
Le workflow GitHub exécute installation verrouillée, tests et compilation. Configurer les variables publiques VITE_SUPABASE_* dans le dépôt connecté. Aucun secret administratif n’y est nécessaire pour les tests unitaires. L’exécution réelle du workflow dépend du dépôt GitHub et reste à constater.

## OWASP ZAP et performance
Ne lancer un scan actif que sur une cible de recette explicitement autorisée, sans données de santé réelles. L’application n’est pas encore publiée ; aucun résultat ZAP ni garantie de performance n’est revendiqué ici.
Exemple de contrôle passif sur un site de recette autorisé : `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://VOTRE-SITE-DE-RECETTE`.
Pour les parcours authentifiés, configurer un contexte ZAP pour chacun des trois rôles et MFA, puis exclure les actions destructives. Mesurer les durées de chargement, LCP et erreurs avec des données de recette ; consigner date, version et résultats avant validation.

## Soutenance
Présenter le problème des appels, les trois rôles, la réservation, les contrôles d’accès, les rappels, le suivi Direction, puis les preuves de tests et les limites d’hébergement. Les cliniques/praticiens du catalogue initial sont des données de démonstration à remplacer par les données validées.

## Blocages externes
VPS tunisien + runtime Node demandé : l’application actuelle doit conserver TanStack Start et son runtime hébergé ; aucun VPS n’a été provisionné ni migration d’hébergement exécutée.
Vault externe : pas de serveur Vault ni de clé fournie.
Rappels e-mail : pas de domaine d’expédition configuré.
HTTPS/chiffrement/SLA : contrôle opérationnel et contractuel requis.
ZAP actif, recette signée et performance en charge : cible autorisée, jeux de données et validation nécessaires.