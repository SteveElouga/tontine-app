# 009 — Transition douce quand une carte de prêt devient « soldée »

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — changement d'état visuel qui téléporte)
- **Estimated scope**: 1 fichier (`prets.scss`), ~1 ligne

## Problem

Quand un remboursement amène le solde d'un prêt à 0, la carte bascule
instantanément vers son style « soldée » (fond légèrement différent) et le
badge « Soldé » apparaît en même temps (voir
`frontend/src/app/features/prets/prets.html:69-74`, condition
`[class.soldee]="n(p.solde) === 0"`).

`frontend/src/app/features/prets/prets.scss:61-73` (état actuel) :

```scss
.carte {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 16px;

  &.soldee {
    background: var(--c-surface-1);
  }
}
```

Fréquence : rare (un prêt donné n'est soldé qu'une fois). Purpose : state
indication — confirmer visuellement que le prêt vient de passer à l'état
soldé plutôt qu'un changement de fond instantané.

## Target

Ajouter une transition sur la propriété `background` de `.carte`, avec le
token de durée déjà utilisé pour les micro-interactions de cet écran
(`--dur-fast`, 120ms) et la même courbe `--ease-out`.

```scss
/* frontend/src/app/features/prets/prets.scss — cible */
.carte {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 16px;
  transition: background var(--dur-fast) var(--ease-out);

  &.soldee {
    background: var(--c-surface-1);
  }
}
```

## Repo conventions to follow

- `--dur-fast` (120ms) et `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`,
  `frontend/src/styles.scss:19-20`) sont déjà utilisés dans ce même fichier
  pour `.c-modif`/`.c-suppr` (`prets.scss:99`), `.lien` (`prets.scss:293`) et
  `.mini-btn` (`prets.scss:324`) — même transition de propriété unique
  (`background`), même token, cohérence directe avec le reste de l'écran.
- Utiliser une transition CSS (pas un `@keyframes`) : `background` peut
  changer plusieurs fois dans de rares scénarios de correction (annulation
  d'un remboursement qui repasse le prêt en non-soldé) ; une transition est
  interruptible et se retargete proprement dans les deux sens, contrairement
  à un keyframe qui ne jouerait que dans un sens.

## Steps

1. Dans `frontend/src/app/features/prets/prets.scss`, sur la règle `.carte`
   (lignes 61-73 actuelles), ajouter la ligne
   `transition: background var(--dur-fast) var(--ease-out);` juste après
   `padding: 16px;` et avant le bloc `&.soldee { ... }`.
2. Ne pas toucher `prets.ts` ni `prets.html`.

## Boundaries

- Ne modifier que la propriété `transition` ajoutée : ne pas toucher aux
  valeurs de `background` elles-mêmes (`var(--c-surface)` / `var(--c-surface-1)`),
  ni à `&.soldee`, ni à tout autre sélecteur de `.carte`.
- Ne pas ajouter de nouveau `@keyframes`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale `frontend/src/styles.scss:159-168` neutralise déjà toutes les
  durées d'animation du site (une transition de couleur reste par ailleurs
  une des exceptions tolérées sous `prefers-reduced-motion`, mais elle est de
  toute façon neutralisée globalement ici, donc rien à faire de plus).
- Si ce plan est exécuté en même temps que `plans/008-prets-carte-apparition.md`
  (qui ajoute `animation: monte-doux ...` sur la même règle `.carte`), les
  deux propriétés (`animation` et `transition`) coexistent sans conflit —
  elles portent sur des propriétés différentes (`transform`/`opacity` vs
  `background`). Aucune coordination nécessaire entre les deux plans.
- Si la structure actuelle de la règle `.carte` a changé depuis le commit
  `8875b7b`, arrêter et signaler plutôt que d'improviser un autre point
  d'ancrage.

## Verification

- **Mechanical**:
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/prets/prets.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check**:
  - Rembourser un prêt jusqu'à solder son solde à 0 (via le formulaire de
    remboursement inline) : le fond de la carte glisse doucement vers
    `var(--c-surface-1)` (~120ms) au lieu de basculer d'un coup, en même
    temps que le badge « Soldé » apparaît.
  - Supprimer ce remboursement (bouton de suppression d'un remboursement,
    avec confirmation) pour repasser le prêt à un solde positif : le fond
    revient tout aussi doucement à `var(--c-surface)`.
  - Activer `prefers-reduced-motion` : le changement de fond reste instantané
    (déjà neutralisé globalement).
  - Dans DevTools, régler la vitesse de lecture à 10 % et confirmer une
    transition de couleur fluide, sans à-coup ni flash.
- **Done when**: les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement.
