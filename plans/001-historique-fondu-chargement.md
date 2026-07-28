# 001 — Fondu chargement → contenu sur l'écran Historique

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — changement d'état qui « téléporte »)
- **Estimated scope**: 2 fichiers (`historique.html`, `historique.scss`), ~6 lignes

## Problem

Sur l'écran Historique, le passage de l'état « chargement » au contenu (barre de
recherche/filtre + liste des opérations) est instantané : Angular détruit le
paragraphe « Chargement… » et insère le contenu du bloc `@else` d'un coup, sans
transition. C'est un changement d'état qui « téléporte », visible une fois par
visite (fréquence occasionnelle) — le candidat idéal pour un fondu léger, sans
risque de sur-animer un élément consulté souvent.

`frontend/src/app/features/historique/historique.html:6-9` (état actuel) :

```html
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  @if (operations().length) {
```

Il n'y a aujourd'hui aucun wrapper autour du contenu du bloc `@else` : la barre
de recherche/filtre (`.barre`) et la liste (`<ul class="journal">`) sont deux
enfants directs consécutifs, sans élément commun sur lequel accrocher une
animation d'entrée.

## Target

Envelopper tout le contenu du bloc `@else` dans un seul `<div class="contenu">`
et lui appliquer un fondu qui réutilise le keyframe global `page-fade` déjà
défini dans `frontend/src/styles.scss:138-145` (utilisé pour la transition de
page au changement d'écran) — aucune nouvelle valeur, aucun nouveau keyframe.

```html
<!-- frontend/src/app/features/historique/historique.html — cible -->
@if (chargement()) {
  <p class="muted">{{ 'commun.chargement' | translate }}</p>
} @else {
  <div class="contenu">
    @if (operations().length) {
      <div class="barre">
        ...
      </div>
    }

    <ul class="journal">
      ...
    </ul>
  </div>
}
```

```scss
/* frontend/src/app/features/historique/historique.scss — cible, à ajouter */
.contenu {
  animation: page-fade var(--dur-base) var(--ease-out) both;
}
```

`page-fade` est un simple `opacity: 0 → 1` (voir `frontend/src/styles.scss:138-145`).
`--dur-base` (180ms) et `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) sont les
tokens globaux définis dans `frontend/src/styles.scss:19-20` — les mêmes que
ceux déjà utilisés pour `monte-doux` sur le tableau de bord
(`frontend/src/app/features/dashboard/dashboard.scss:33`).

## Repo conventions to follow

- Les tokens de mouvement vivent dans `frontend/src/styles.scss` (`:root`,
  lignes 16-20) : `--ease-out`, `--ease-in-out`, `--dur-fast`, `--dur-base`.
  Ne pas en créer de nouveaux pour ce plan.
- Le keyframe `page-fade` (`frontend/src/styles.scss:138-145`) est déjà le
  motif « fondu d'entrée » standard de l'app (utilisé par
  `.content > router-outlet + *` à chaque navigation, `frontend/src/styles.scss:132-136`).
  Le réutiliser tel quel plutôt que d'écrire un nouveau `@keyframes`.
- Exemplaire à imiter pour la syntaxe `animation: <keyframe> <durée> var(--ease-out) both;` :
  `frontend/src/app/features/dashboard/dashboard.scss:33`
  (`animation: monte-doux 0.28s var(--ease-out) both;`).

## Steps

1. Dans `frontend/src/app/features/historique/historique.html`, ouvrir
   `<div class="contenu">` juste après `} @else {` (ligne 8) et le fermer
   juste avant le `}` qui clôt le bloc `@else` (ligne 77 actuelle). Ne rien
   changer d'autre à l'intérieur (le `@if (operations().length)`, la
   `<ul class="journal">` et son `@for`/`@empty` restent identiques, seulement
   réindentés d'un niveau).
2. Dans `frontend/src/app/features/historique/historique.scss`, ajouter la
   règle `.contenu { animation: page-fade var(--dur-base) var(--ease-out) both; }`
   n'importe où après le bloc `.entete` (par exemple juste avant `.barre {`).
3. Ne pas toucher `historique.ts` — ce plan est purement présentationnel.

## Boundaries

- Ne pas toucher au bloc `@if (chargement())` (le message « Chargement… »
  reste sans animation — il disparaît, il n'a pas besoin d'entrer en fondu).
- Ne pas modifier `.barre`, `.journal`, `.op` ou tout style existant listé
  dans `historique.scss` en dehors de l'ajout précisé à l'étape 2.
- Ne pas ajouter de nouveau `@keyframes` : réutiliser `page-fade`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale dans `frontend/src/styles.scss:159-168` désactive déjà toutes les
  durées d'animation/transition du site (`animation-duration: 0.001ms !important`
  sur `*`), donc ce fondu est automatiquement neutralisé sans rien écrire de
  plus.
- Si la structure actuelle du bloc `@else` a changé depuis le commit
  `8875b7b` (par exemple si `.barre` ou `.journal` ont été déplacés/renommés),
  arrêter et signaler plutôt que d'improviser un autre point d'ancrage.

## Verification

- **Mécanique** :
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → doit
    sortir sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/historique/historique.scss'); console.log('OK')"` → doit afficher `OK`.
- **Feel check** :
  - Recharger l'écran Historique (ou naviguer vers lui depuis un autre écran) :
    le message « Chargement… » disparaît et la barre + la liste apparaissent
    avec un fondu bref (~180ms), pas de flash de contenu brut ni de saut de
    mise en page.
  - Dans DevTools → Animations, régler la vitesse de lecture à 10 % et
    vérifier que le fondu est un simple `opacity` sans mouvement de
    translation (ce n'est volontairement pas un `monte-doux`, juste un fondu).
  - Taper dans le champ de recherche ou changer le filtre segmenté après le
    chargement initial : la liste filtrée doit se mettre à jour **sans**
    rejouer ce fondu (le fondu n'est déclenché qu'une fois, à l'entrée dans le
    bloc `@else`, pas à chaque recalcul de `operationsFiltrees()`).
  - Activer `prefers-reduced-motion` (onglet Rendering de DevTools) et
    recharger l'écran : le contenu apparaît instantanément, sans fondu.
- **Terminé quand** : les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement.
