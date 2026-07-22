# Frontend — Caisse mutuelle (Angular PWA)

Le frontend est une **PWA Angular** qui consomme l'API GraphQL du backend. Toute la logique de
calcul (intérêts, majorations) vit **côté serveur** : le client ne fait qu'afficher et saisir.
On évite ainsi de dupliquer — et de désynchroniser — les règles métier.

> Angular se génère avec sa CLI (`ng new`). Ce dossier fournit **les commandes de mise en place**
> et **les fichiers métier à ajouter** (modèles TypeScript, requêtes GraphQL, service). Génère la
> coquille avec la CLI, puis dépose les fichiers de `src/app/core/` fournis ici.

## 1. Générer le projet

```bash
# depuis tontine-app/
npm install -g @angular/cli
ng new frontend --routing --style=scss --ssr=false
cd frontend

# PWA (service worker, manifest, installation hors ligne)
ng add @angular/pwa

# Client GraphQL
ng add apollo-angular
```

Lors de `ng add apollo-angular`, renseigner l'URL de l'API : `http://localhost:8000/graphql/`.

## 2. Déposer les fichiers métier

Copier les fichiers déjà écrits :

```
src/app/core/domain/caisse.models.ts     # types TypeScript (miroir des types GraphQL)
src/app/core/graphql/caisse.queries.ts   # requêtes & mutations GraphQL
src/app/core/graphql/caisse.service.ts   # service Angular (injectable) sur Apollo
```

## 3. Lancer

```bash
ng serve            # http://localhost:4200
```

Le backend doit tourner en parallèle (voir `../backend/README.md`) et autoriser l'origine
`http://localhost:4200` (déjà configuré via `CORS_ALLOWED_ORIGINS`).

## 4. Structure cible

```
src/app/
├── core/
│   ├── domain/        # types du domaine (data shapes, pas de logique de calcul)
│   └── graphql/       # requêtes GraphQL + service d'accès aux données
├── features/
│   ├── dashboard/     # tableau de bord du cycle
│   ├── members/       # liste & fiche membre
│   ├── deposits/      # saisie des dépôts (grille membres × mois)
│   ├── loans/         # prêts & majoration
│   └── closing/       # récapitulatif de clôture + export
└── shared/            # composants UI réutilisables (boutons, tableaux…)
```

## 5. Principes UX (rappel de la spec)

- **Plus simple que WhatsApp.** Gros boutons, peu d'étapes, libellés en langage courant.
- **Installable & hors ligne** (PWA). Phase 1 : consultation hors ligne. Phase 2 : saisie hors
  ligne mise en file dans IndexedDB puis synchronisée.
- **Léger** : cible Android d'entrée de gamme **et** Safari iOS. Tester sur les deux.
- **Français d'abord**, prévoir l'i18n (`@angular/localize`) pour l'anglais (njangi) plus tard.
