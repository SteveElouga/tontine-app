# 006 — Entrée en cascade de la liste au tout premier chargement (Saisie)

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — groupe d'éléments qui apparaît d'un bloc)
- **Estimated scope**: 3 fichiers (`saisie.ts`, `saisie.html`, `saisie.scss`), ~20 lignes

## Problem

Au tout premier chargement de l'écran Saisie, toutes les lignes de membres de
`frontend/src/app/features/saisie/saisie.html:73` apparaissent en même temps :

```html
@for (ligne of lignes(); track ligne.memberId + '_' + ligne.moisIndex) {
  <div class="ligne">
```

C'est le même candidat que sur Historique (`plans/002-historique-stagger-entree.md`,
déjà exécuté), mais avec une contrainte plus stricte : sur Saisie, la liste se
recharge intégralement à **chaque** clic sur les flèches du stepper mois
(`moisPrecedent()`/`moisSuivant()` dans `saisie.ts:104-117`) ou membre
(`membrePrecedent()`/`membreSuivant()`/`choisirMembre()` dans `saisie.ts:123-143`),
via `chargerMois()`/`chargerMembre()` qui font `chargement.set(true)` puis
recréent tout le tableau `lignes()`. C'est une interaction répétée « tens/day »
(une trésorière feuillette les 12+ mois ou parcourt la liste des membres en
série rapide) : rejouer une cascade à chaque changement ralentirait la
navigation et irait à l'encontre du gate de fréquence. La cascade n'est donc
légitime qu'à l'entrée initiale de l'écran (une fois par visite), exactement
comme l'a déjà posé le plan 002 pour Historique face à un problème similaire
(liste sans id stable, filtrée souvent).

## Target

Ajouter un signal `entreeInitiale` fermé (mis à `false`) 600 ms après le tout
premier chargement réussi — que ce premier chargement vienne de la vue
« Par mois » ou « Par membre » — puis ne jamais le rouvrir. Tant qu'il est
`true`, chaque `<div class="ligne">` reçoit un délai d'entrée croissant et
plafonné, avec le même keyframe global `monte-doux`
(`frontend/src/styles.scss:147-154`) déjà utilisé par le tableau de bord et par
Historique.

```ts
// frontend/src/app/features/saisie/saisie.ts — cible (nouveau signal + méthode)
protected readonly entreeInitiale = signal(true);

/** Décalage d'entrée en cascade, plafonné pour ne pas s'étirer sur une longue liste. */
protected retardEntree(i: number): number {
  return Math.min(i * 30, 240);
}
```

```html
<!-- frontend/src/app/features/saisie/saisie.html — cible -->
<div class="grille-membres" [class.grille-membres--entree]="entreeInitiale()">
  @for (ligne of lignes(); track ligne.memberId + '_' + ligne.moisIndex; let i = $index) {
    <div class="ligne" [style.animation-delay.ms]="entreeInitiale() ? retardEntree(i) : null">
      ...
    </div>
  }
</div>
```

```scss
/* frontend/src/app/features/saisie/saisie.scss — cible, à ajouter */
.grille-membres--entree .ligne {
  animation: monte-doux 0.28s var(--ease-out) both;
}
```

## Repo conventions to follow

- Réutiliser `monte-doux` (`frontend/src/styles.scss:147-154`) et `--ease-out`
  (`cubic-bezier(0.23, 1, 0.32, 1)`, `frontend/src/styles.scss:19`). Ne rien
  inventer — même durée (0.28s) et même fonction de plafonnement
  (`min(i * 30, 240)`) que le plan 002.
- Exemplaire à imiter à l'identique :
  `frontend/src/app/features/historique/historique.ts` (signal
  `entreeInitiale`, méthode `retardEntree`),
  `frontend/src/app/features/historique/historique.html` (classe
  conditionnelle `[class.journal--entree]`, `[style.animation-delay.ms]` sur
  chaque `<li>`) et `frontend/src/app/features/historique/historique.scss`
  (règle `.journal--entree .op { animation: monte-doux ... }`).
- Différence assumée par rapport à 002 : sur Historique, `entreeInitiale` se
  ferme dans le seul `ngOnInit` (un seul chargement possible). Ici, il doit se
  fermer depuis **les deux** points d'entrée possibles (`chargerMois()` et
  `chargerMembre()`), car la vue par défaut est « Par mois » mais l'utilisateur
  peut basculer vers « Par membre » avant la fin du délai de fermeture — voir
  Steps.

## Steps

1. Dans `frontend/src/app/features/saisie/saisie.ts`, ajouter juste après la
   déclaration du signal `chargement` (ligne 59 actuelle) :
   ```ts
   protected readonly entreeInitiale = signal(true);
   ```
2. Toujours dans `saisie.ts`, ajouter une méthode protégée (par exemple juste
   après `jourCourt`, en fin de classe) :
   ```ts
   protected retardEntree(i: number): number {
     return Math.min(i * 30, 240);
   }
   ```
3. Dans `saisie.ts`, méthode privée `chargerMois()` (lignes 244-270
   actuelles) : dans le callback `next: (rows) => { ... this.chargement.set(false); }`,
   juste après `this.chargement.set(false);`, ajouter :
   ```ts
   if (this.entreeInitiale()) {
     setTimeout(() => this.entreeInitiale.set(false), 600);
   }
   ```
4. Dans `saisie.ts`, méthode privée `chargerMembre()` (lignes 272-300
   actuelles) : appliquer exactement le même ajout dans son callback
   `next: (rows) => { ... this.chargement.set(false); }`, juste après
   `this.chargement.set(false);`.
5. Dans `frontend/src/app/features/saisie/saisie.html`, sur la
   `<div class="grille-membres">` (ligne 72 actuelle), ajouter
   `[class.grille-membres--entree]="entreeInitiale()"`. Sur le `@for` (ligne
   73 actuelle), ajouter `; let i = $index` à l'expression de boucle. Sur
   `<div class="ligne">` (ligne 74 actuelle), ajouter
   `[style.animation-delay.ms]="entreeInitiale() ? retardEntree(i) : null"`.
6. Dans `frontend/src/app/features/saisie/saisie.scss`, ajouter, n'importe où
   après la règle `.ligne { ... }` (après la ligne 243 actuelle) :
   ```scss
   .grille-membres--entree .ligne {
     animation: monte-doux 0.28s var(--ease-out) both;
   }
   ```

## Boundaries

- Ne pas toucher au bloc `@if (chargement())`, ni au `.bascule`, ni aux
  steppers.
- Ne pas modifier `.etat`/`etat-ok-apparait` (l'animation de la coche existe
  déjà et reste indépendante de ce plan).
- Ne pas ajouter de nouveau `@keyframes` : réutiliser `monte-doux`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale neutralise déjà toutes les durées d'animation du site
  (`frontend/src/styles.scss:159-168`).
- Point le plus important : `entreeInitiale` ne doit se fermer **qu'une seule
  fois**, au tout premier chargement réussi (mois ou membre selon celui qui
  arrive en premier). Ne pas rouvrir ce signal à chaque changement de mois ou
  de membre — la cascade ne doit jamais rejouer sur ces re-chargements
  fréquents, seulement à l'entrée initiale de l'écran. Si le comportement
  observé après implémentation rejoue la cascade à chaque clic sur les
  flèches, c'est un bug d'implémentation à corriger avant de considérer ce
  plan terminé, pas un comportement acceptable.
- Si la structure actuelle de `chargerMois()`/`chargerMembre()` ou du template
  a changé depuis le commit `8875b7b`, arrêter et signaler plutôt que
  d'improviser un autre point d'ancrage.

## Verification

- **Mechanical**:
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/saisie/saisie.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check**:
  - Première visite de l'écran (vue « Par mois » par défaut) : les lignes de
    membres entrent en cascade douce (décalage croissant, plafonné à 240ms).
  - Cliquer rapidement plusieurs fois sur les flèches du stepper mois
    juste après ce premier chargement : la liste se met à jour **sans**
    rejouer la cascade (apparition instantanée du nouveau contenu, hors fondu
    du plan 005).
  - Recharger la page puis basculer immédiatement vers « Par membre » avant la
    fin du fondu du mois : la cascade ne doit jouer qu'une seule fois au total
    (sur le premier des deux blocs à charger), pas deux fois.
  - Naviguer ensuite entre membres (flèches) : pas de cascade rejouée.
  - Activer `prefers-reduced-motion` : aucune cascade visible, contenu
    instantané.
  - Dans DevTools, régler la vitesse de lecture à 10 % (panneau Animations) et
    confirmer que le décalage entre lignes consécutives est bien croissant
    puis plafonné, sans à-coup.
- **Done when**: les deux vérifications mécaniques passent, la cascade ne
  joue qu'une fois par visite d'écran (jamais sur les re-chargements de
  mois/membre) et les six points du feel check sont confirmés visuellement.
