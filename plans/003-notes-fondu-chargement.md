# 003 — Fondu chargement → contenu sur l'écran Cahier de séance

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — changement d'état qui « téléporte »)
- **Estimated scope**: 2 fichiers (`notes.html`, `notes.scss`), ~6 lignes

## Problem

Même constat que sur Historique (voir `plans/001-historique-fondu-chargement.md`,
déjà exécuté) : sur l'écran Cahier de séance, le passage de l'état
« chargement » à la zone de texte + le message d'état est instantané. Le
stepper (mois de séance) reste affiché pendant le chargement — seul le bloc
sous le stepper téléporte.

`frontend/src/app/features/notes/notes.html:19-21` (état actuel) :

```html
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  <textarea
```

Fréquence : occasionnelle (une fois par visite de l'écran). Purpose : éviter
un changement brutal (préventing jarring change). Le candidat est identique
en nature à celui déjà traité sur Historique.

## Target

Envelopper le contenu du bloc `@else` (la `<textarea>` et le `<p class="etat">`
qui suit) dans un `<div class="contenu">`, avec le même fondu que sur
Historique — réutilisation du keyframe global `page-fade`
(`frontend/src/styles.scss:138-145`), aucune nouvelle valeur.

```html
<!-- frontend/src/app/features/notes/notes.html — cible -->
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  <div class="contenu">
    <textarea
      class="zone"
      rows="12"
      [ngModel]="texte()"
      (ngModelChange)="texte.set($event)"
      (blur)="enregistrer()"
      [placeholder]="'notes.placeholder' | translate"
    ></textarea>
    <p class="etat">
      ...
    </p>
  </div>
}
```

```scss
/* frontend/src/app/features/notes/notes.scss — cible, à ajouter */
.contenu {
  animation: page-fade var(--dur-base) var(--ease-out) both;
}
```

## Repo conventions to follow

- Réutiliser `page-fade` (`frontend/src/styles.scss:138-145`) et les tokens
  `--dur-base` (180ms) / `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`)
  définis dans `frontend/src/styles.scss:19-20`. Ne rien inventer.
- Exemplaire identique déjà exécuté sur Historique :
  `frontend/src/app/features/historique/historique.scss` (règle `.contenu`
  ajoutée par `plans/001-historique-fondu-chargement.md`) et
  `frontend/src/app/features/historique/historique.html` (wrapper
  `<div class="contenu">` autour du bloc `@else`). Reproduire le même motif
  ici, avec le même nom de classe, pour la cohérence entre écrans.

## Steps

1. Dans `frontend/src/app/features/notes/notes.html`, ouvrir
   `<div class="contenu">` juste après `} @else {` (ligne 21) et le fermer
   juste avant le `}` qui clôt le bloc `@else` (ligne 39 actuelle). Ne rien
   changer d'autre à l'intérieur (la `<textarea>` et le `<p class="etat">`
   restent identiques, seulement réindentés d'un niveau).
2. Dans `frontend/src/app/features/notes/notes.scss`, ajouter la règle
   `.contenu { animation: page-fade var(--dur-base) var(--ease-out) both; }`
   n'importe où après le bloc `.entete` (par exemple juste avant `.stepper {`).
3. Ne pas toucher `notes.ts`.

## Boundaries

- Ne pas toucher au bloc `@if (chargement())`, ni au `.stepper` (il reste
  affiché pendant le chargement, hors périmètre).
- Ne pas modifier `.zone`, `.etat`, `.muted` ou tout autre style existant de
  `notes.scss` en dehors de l'ajout précisé à l'étape 2.
- Ne pas ajouter de nouveau `@keyframes` : réutiliser `page-fade`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale `frontend/src/styles.scss:159-168` neutralise déjà toutes les
  durées d'animation du site.
- Si la structure actuelle du bloc `@else` a changé depuis le commit
  `8875b7b`, arrêter et signaler plutôt que d'improviser un autre point
  d'ancrage.

## Verification

- **Mécanique** :
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/notes/notes.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check** :
  - Recharger l'écran Cahier de séance : le stepper apparaît immédiatement,
    la zone de texte et le message d'état apparaissent avec un fondu bref
    (~180ms) juste après.
  - Changer de séance (flèches du stepper) après le chargement initial : le
    contenu se met à jour **sans** rejouer ce fondu.
  - Activer `prefers-reduced-motion` et recharger : le contenu apparaît
    instantanément.
- **Terminé quand** : les deux vérifications mécaniques passent et les trois
  points du feel check sont confirmés visuellement.
