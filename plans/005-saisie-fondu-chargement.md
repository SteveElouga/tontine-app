# 005 — Fondu chargement → contenu sur l'écran Saisie des dépôts

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — changement d'état qui « téléporte »)
- **Estimated scope**: 2 fichiers (`saisie.html`, `saisie.scss`), ~6 lignes

## Problem

Même constat que sur Historique (`plans/001-historique-fondu-chargement.md`) et
Cahier de séance (`plans/003-notes-fondu-chargement.md`), déjà exécutés : sur
l'écran Saisie des dépôts, le passage de l'état « chargement » à la grille de
membres + pied de page + astuce est instantané. Le bandeau de bascule
(« Par mois » / « Par membre ») et le stepper (mois ou sélecteur de membre)
restent affichés pendant le chargement — seul le bloc sous le stepper téléporte.

`frontend/src/app/features/saisie/saisie.html:69-71` (état actuel) :

```html
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  <div class="grille-membres">
```

Fréquence : occasionnelle (le premier chargement de l'écran ; les rechargements
déclenchés par les flèches du stepper — `moisPrecedent()`/`moisSuivant()`/
`membrePrecedent()`/`membreSuivant()` dans `saisie.ts`, ~tens/day — sont hors
périmètre, voir Boundaries). Purpose : éviter un changement brutal (preventing
jarring change). Candidat identique en nature à ceux déjà traités sur
Historique et Cahier de séance.

## Target

Envelopper tout le contenu du bloc `@else` (la `<div class="grille-membres">`,
le `<div class="pied">` et le `@if (vue() === 'mois') { <div class="astuce">`
qui suit) dans un `<div class="contenu">`, avec le même fondu que sur
Historique/Notes — réutilisation du keyframe global `page-fade`
(`frontend/src/styles.scss:138-145`), aucune nouvelle valeur.

```html
<!-- frontend/src/app/features/saisie/saisie.html — cible -->
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  <div class="contenu">
    <div class="grille-membres">
      @for (ligne of lignes(); track ligne.memberId + '_' + ligne.moisIndex) {
        <div class="ligne">
          ...
        </div>
      }
    </div>

    <div class="pied">
      ...
    </div>

    @if (vue() === 'mois') {
      <div class="astuce">
        ...
      </div>
    }
  </div>
}
```

```scss
/* frontend/src/app/features/saisie/saisie.scss — cible, à ajouter */
.contenu {
  animation: page-fade var(--dur-base) var(--ease-out) both;
}
```

## Repo conventions to follow

- Réutiliser `page-fade` (`frontend/src/styles.scss:138-145`) et les tokens
  `--dur-base` (180ms) / `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`)
  définis dans `frontend/src/styles.scss:19-20`. Ne rien inventer.
- Exemplaires identiques déjà exécutés :
  `frontend/src/app/features/historique/historique.scss` /
  `historique.html` (plan 001) et
  `frontend/src/app/features/notes/notes.scss` / `notes.html` (plan 003).
  Reproduire le même motif ici, avec le même nom de classe `.contenu`, pour la
  cohérence entre écrans.

## Steps

1. Dans `frontend/src/app/features/saisie/saisie.html`, ouvrir
   `<div class="contenu">` juste après `} @else {` (ligne 71 actuelle) et le
   fermer juste avant le `}` qui clôt le bloc `@else` (ligne 113 actuelle, après
   le `@if (vue() === 'mois') { <div class="astuce">...</div> }`). Ne rien
   changer d'autre à l'intérieur (`<div class="grille-membres">`,
   `<div class="pied">` et `<div class="astuce">` restent identiques,
   seulement réindentés d'un niveau).
2. Dans `frontend/src/app/features/saisie/saisie.scss`, ajouter la règle
   `.contenu { animation: page-fade var(--dur-base) var(--ease-out) both; }`
   n'importe où après le bloc `.entete` (par exemple juste avant
   `/* Bascule — pilule de la maquette */`).
3. Ne pas toucher `saisie.ts`.

## Boundaries

- Ne pas toucher au bloc `@if (chargement())`, ni au `.bascule`, ni au
  `.stepper`/`.stepper-membre` (ils restent affichés pendant le chargement,
  hors périmètre).
- Ne pas modifier `.grille-membres`, `.ligne`, `.pied`, `.astuce`, `.etat` ou
  tout autre style existant de `saisie.scss` en dehors de l'ajout précisé à
  l'étape 2.
- Ne pas ajouter de nouveau `@keyframes` : réutiliser `page-fade`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale `frontend/src/styles.scss:159-168` neutralise déjà toutes les
  durées d'animation du site.
- Ce fondu ne doit jouer qu'à l'entrée du bloc `@else` — c'est déjà son
  comportement naturel avec `animation: ... both` sur un `@if/@else` Angular
  (le `<div>` est détruit et recréé à chaque bascule chargement → contenu),
  donc aucun signal supplémentaire n'est nécessaire ici, contrairement au
  plan 006 qui lui doit gater l'entrée en cascade au tout premier chargement.
- Si la structure actuelle du bloc `@else` a changé depuis le commit
  `8875b7b`, arrêter et signaler plutôt que d'improviser un autre point
  d'ancrage.

## Verification

- **Mechanical**:
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/saisie/saisie.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check**:
  - Recharger l'écran Saisie (vue « Par mois ») : la bascule et le stepper
    apparaissent immédiatement, la grille + le pied + l'astuce apparaissent
    avec un fondu bref (~180ms) juste après.
  - Naviguer d'un mois à l'autre (flèches du stepper) : le contenu se met à
    jour sans rejouer un fondu perceptible qui ralentirait la navigation
    (le fondu ne doit pas gêner des clics rapides et répétés).
  - Basculer vers la vue « Par membre » puis recharger : même comportement.
  - Activer `prefers-reduced-motion` et recharger : le contenu apparaît
    instantanément.
  - Dans DevTools, régler la vitesse de lecture à 10 % (panneau Animations)
    et confirmer que le fondu est un simple `opacity: 0 → 1`, sans saut ni
    décalage de mise en page.
- **Done when**: les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement.
