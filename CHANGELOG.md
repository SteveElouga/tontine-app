# Journal des versions

Le format suit [SemVer](https://semver.org/lang/fr/). Les versions sont taguées `vX.Y.Z` sur `main`.

## v1.0.0 — 2026-07-24

Première version de **Tontine**, l'application de gestion de caisse mutuelle (PWA) pour les tontines camerounaises.

### Fonctionnalités

- **Cycle complet** : saisie des dépôts (par mois / par membre), gestion des membres, prêts, récapitulatif, fiche membre détaillée, historique, simulation, aide dynamique, paramètres.
- **Épargne** : intérêt dégressif de 5 %/mois figé au mois du dépôt (septembre 45 % → mai 5 %), jusqu'à la clôture de juin.
- **Prêts en intérêts composés** (modèle v2, cf. `docs/03-modele-prets-composes.md`) : 5 %/mois composé sur le solde dégressif, remboursements partiels au fil des réunions, dépôts d'un emprunteur comptés comme remboursements, arrêt à la clôture de juin, montants exacts (arrondi final à 1 décimale).
- **Clôture** : 4 modes de répartition des intérêts au choix de la trésorière (complets, réduction de N mois, équitable au prorata, équitable en parts égales).
- **Authentification** : compte trésorière unique (JWT), connexion requise, changement de mot de passe, écran Profil.
- **Confort** : bilingue français / anglais, thème clair / sombre, barre latérale rétractable, écrans responsives, animations douces, visite guidée, tooltips, icône PWA (« cercle de membres »).

### Technique

- **Frontend** : Angular 22 (PWA, zoneless, signals, standalone), PrimeNG 21, Apollo GraphQL, ngx-translate.
- **Backend** : Django 5.2 + DRF + Strawberry GraphQL + PostgreSQL (monolithe modulaire).
- **Tests** : moteur de domaine (23), backend `pytest` (résolveurs GraphQL, auth, modèles), frontend Vitest (logique + composants) avec seuil de couverture sur `core/**`, CI GitHub Actions.
