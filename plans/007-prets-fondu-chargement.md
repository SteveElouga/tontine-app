# 007 — Fondu chargement → contenu sur l'écran Prêts

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — changement d'état qui « téléporte »)
- **Estimated scope**: 2 fichiers (`prets.html`, `prets.scss`), ~6 lignes

## Problem

Même constat que sur Historique (`plans/001`), Cahier de séance (`plans/003`)
et Saisie (`plans/005`), tous déjà exécutés : sur l'écran Prêts, le passage de
l'état « chargement » au contenu (filtre + grille de cartes + totaux + astuce)
est instantané. Le bloc « ajout » (formulaire nouveau prêt) reste affiché
pendant le chargement — seul le bloc sous le filtre téléporte.

`frontend/src/app/features/prets/prets.html:46-65` (état actuel, extrait) :

```html
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else if (!prets().length) {
  <p class="vide">{{ 'prets.vide' | translate }}</p>
} @else {
  <div class="filtre-membre">
```

Fréquence : occasionnelle (le premier chargement de l'écran ; `chargement` ne
repasse jamais à `true` ensuite — voir `prets.ts`, aucune méthode ne rappelle
`this.chargement.set(true)` après `ngOnInit`, contrairement à Saisie où les
flèches du stepper rechargent). Purpose : éviter un changement brutal
(preventing jarring change). Candidat identique en nature à ceux déjà traités.

## Target

Envelopper tout le contenu du bloc `@else` (le `<div class="filtre-membre">`,
la `<div class="cartes">`, la `<div class="totaux">` et la `<div class="astuce">`)
dans un `<div class="contenu">`, avec le même fondu que sur les autres
écrans — réutilisation du keyframe global `page-fade`
(`frontend/src/styles.scss:138-145`), aucune nouvelle valeur. Le cas
`@else if (!prets().length)` (liste vide) reste hors périmètre : c'est un
message court, sans grille sous-jacente, moins sujet à la téléportation.

```html
<!-- frontend/src/app/features/prets/prets.html — cible -->
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else if (!prets().length) {
  <p class="vide">{{ 'prets.vide' | translate }}</p>
} @else {
  <div class="contenu">
    <div class="filtre-membre">
      ...
    </div>

    <div class="cartes">
      ...
    </div>

    <div class="totaux">
      ...
    </div>

    <div class="astuce">
      ...
    </div>
  </div>
}
```

```scss
/* frontend/src/app/features/prets/prets.scss — cible, à ajouter */
.contenu {
  animation: page-fade var(--dur-base) var(--ease-out) both;
}
```

## Repo conventions to follow

- Réutiliser `page-fade` (`frontend/src/styles.scss:138-145`) et les tokens
  `--dur-base` (180ms) / `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`)
  définis dans `frontend/src/styles.scss:19-20`. Ne rien inventer.
- Exemplaires identiques déjà exécutés : `historique.scss`/`historique.html`
  (plan 001), `notes.scss`/`notes.html` (plan 003),
  `saisie.scss`/`saisie.html` (plan 005). Même nom de classe `.contenu`, pour
  la cohérence entre écrans.

## Steps

1. Dans `frontend/src/app/features/prets/prets.html`, ouvrir
   `<div class="contenu">` juste après `} @else {` (ligne 50 actuelle) et le
   fermer juste avant le `}` qui clôt le bloc `@else` (ligne 235 actuelle,
   après la `<div class="astuce">`). Ne rien changer d'autre à l'intérieur
   (`<div class="filtre-membre">`, `<div class="cartes">`,
   `<div class="totaux">` et `<div class="astuce">` restent identiques,
   seulement réindentés d'un niveau).
2. Dans `frontend/src/app/features/prets/prets.scss`, ajouter la règle
   `.contenu { animation: page-fade var(--dur-base) var(--ease-out) both; }`
   n'importe où après le bloc `.entete` (par exemple juste avant `.ajout {`).
3. Ne pas toucher `prets.ts`.

## Boundaries

- Ne pas toucher au bloc `@if (chargement())`, ni au cas
  `@else if (!prets().length)`, ni à `.ajout` (formulaire nouveau prêt, reste
  affiché pendant le chargement, hors périmètre).
- Ne pas modifier `.filtre-membre`, `.cartes`, `.carte`, `.totaux`, `.astuce`
  ou tout autre style existant de `prets.scss` en dehors de l'ajout précisé à
  l'étape 2.
- Ne pas ajouter de nouveau `@keyframes` : réutiliser `page-fade`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale `frontend/src/styles.scss:159-168` neutralise déjà toutes les
  durées d'animation du site.
- Si la structure actuelle du bloc `@else` a changé depuis le commit
  `8875b7b`, arrêter et signaler plutôt que d'improviser un autre point
  d'ancrage.
- Si ce plan est exécuté avec `plans/008-prets-carte-apparition.md`
  (qui ajoute une animation sur `.carte`), l'ordre d'exécution n'a pas
  d'importance : les deux touchent des zones distinctes (`.contenu` ici,
  `.carte` dans 008), aucune dépendance entre eux.

## Verification

- **Mechanical**:
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/prets/prets.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check**:
  - Recharger l'écran Prêts (avec au moins un prêt existant) : le formulaire
    « ajout » apparaît immédiatement, le filtre + la grille + les totaux +
    l'astuce apparaissent avec un fondu bref (~180ms) juste après.
  - Recharger l'écran sans aucun prêt existant : le message « vide » apparaît
    sans fondu (hors périmètre, comportement inchangé).
  - Activer `prefers-reduced-motion` et recharger : le contenu apparaît
    instantanément.
  - Dans DevTools, régler la vitesse de lecture à 10 % (panneau Animations)
    et confirmer que le fondu est un simple `opacity: 0 → 1`, sans saut ni
    décalage de mise en page.
- **Done when**: les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement.
