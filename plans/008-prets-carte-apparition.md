# 008 — Apparition douce des cartes de prêt (premier chargement + ajout)

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — groupe d'éléments qui apparaît d'un
  bloc / nouvel élément qui téléporte)
- **Estimated scope**: 1 fichier (`prets.scss`), ~3 lignes

## Problem

Ce plan fusionne deux constats de l'analyse design (find-animation-opportunities)
qui partagent exactement le même fichier et le même correctif — voir
« Notes for the plan author » de PLAN-TEMPLATE.md :

1. Au tout premier chargement de l'écran, toutes les cartes de
   `frontend/src/app/features/prets/prets.html:68`
   (`@for (p of pretsFiltres(); track p.id)`) apparaissent en même temps,
   sans transition.
2. Quand une trésorière ajoute un nouveau prêt, `ajouter()` dans
   `frontend/src/app/features/prets/prets.ts:132-144` insère la nouvelle
   carte **localement**, sans recharger toute la liste :

   ```ts
   // frontend/src/app/features/prets/prets.ts:132-144 — actuel
   this.caisse.ajouterPret(this.cycleStore.cycleId(), membreId, montant, mois).subscribe({
     next: (p) => {
       this.prets.update((l) => [...l, p].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
       ...
   ```

   La nouvelle carte apparaît alors instantanément dans la grille, sans
   aucune confirmation visuelle de l'ajout au-delà du toast d'annulation
   (undo) qui suit.

Contrairement à Historique (`plans/002`) et Saisie (`plans/006`), **aucun
signal de gating (`entreeInitiale`) n'est nécessaire ici** : le `@for` utilise
`track p.id`, donc Angular ne recrée un `<article class="carte">` que lorsque
son id apparaît pour la première fois dans le tableau — que ce soit au tout
premier chargement ou lors d'un ajout ultérieur. Un changement de filtre
membre (`filtreMembre`) ne recrée pas les cartes qui restent visibles, il ne
fait qu'ajouter/retirer des éléments du DOM — donc une animation liée à la
création de l'élément ne rejouera jamais sur un simple changement de filtre.

## Target

Ajouter une seule règle CSS, non conditionnelle, sur `.carte` : elle jouera
naturellement à chaque création réelle d'un `<article class="carte">` (premier
chargement et ajouts ultérieurs), jamais sur un réordonnancement ou un
filtrage qui ne fait que montrer/cacher des cartes déjà existantes.
Réutilisation du keyframe global `monte-doux`
(`frontend/src/styles.scss:147-154`), déjà utilisé par le tableau de bord,
Historique et Saisie.

```scss
/* frontend/src/app/features/prets/prets.scss — cible, à ajouter */
.carte {
  animation: monte-doux 0.28s var(--ease-out) both;
}
```

## Repo conventions to follow

- Réutiliser `monte-doux` (`frontend/src/styles.scss:147-154`) et
  `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`,
  `frontend/src/styles.scss:19`). Même durée (0.28s) que les exemplaires
  suivants, pour la cohérence entre écrans.
- Exemplaires à imiter (mécanisme différent, mais mêmes valeurs) :
  `frontend/src/app/features/historique/historique.scss` (règle
  `.journal--entree .op { animation: monte-doux 0.28s var(--ease-out) both; }`,
  plan 002) et `frontend/src/app/features/saisie/saisie.scss` (règle
  `.grille-membres--entree .ligne { animation: monte-doux 0.28s var(--ease-out) both; }`,
  plan 006). Ici, pas besoin de classe conditionnelle ni de signal
  `entreeInitiale` : `track p.id` fait déjà tout le travail de distinction
  entre « nouvel élément » et « élément existant réordonné/filtré ».

## Steps

1. Dans `frontend/src/app/features/prets/prets.scss`, ajouter la règle
   ```scss
   .carte {
     animation: monte-doux 0.28s var(--ease-out) both;
   }
   ```
   directement dans la déclaration existante de `.carte` (lignes 61-73
   actuelles), par exemple juste après la propriété `padding: 16px;` et avant
   `&.soldee { ... }`. Ne pas créer de nouvelle classe séparée : `.carte` porte
   déjà toutes les autres règles de la carte, l'animation s'y ajoute
   naturellement.
2. Ne pas toucher `prets.ts` ni `prets.html` : aucun changement de structure,
   de signal ou de binding n'est nécessaire pour ce plan.

## Boundaries

- Ne pas ajouter de signal `entreeInitiale`/`retardEntree` ni de décalage
  (`nth-child`/`animation-delay`) : ce plan couvre uniquement l'apparition de
  chaque carte à sa création, pas une cascade décalée entre cartes. Si un
  décalage type stagger est souhaité plus tard, ce sera un plan séparé.
- Ne pas modifier `&.soldee` (couvert par `plans/009-prets-transition-soldee.md`),
  ni `.c-tete`, `.c-lignes`, `.c-rembs`, `.c-pied` ou tout autre style existant
  de `.carte` en dehors de l'ajout de la propriété `animation`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale : la règle
  globale `frontend/src/styles.scss:159-168` neutralise déjà toutes les
  durées d'animation du site.
- Si la structure de `.carte` a changé depuis le commit `8875b7b` (par
  exemple si `&.soldee` a été retiré ou renommé), arrêter et signaler plutôt
  que d'improviser un autre point d'ancrage.

## Verification

- **Mechanical**:
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/prets/prets.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check**:
  - Recharger l'écran Prêts avec plusieurs prêts existants : chaque carte
    entre avec un léger mouvement vers le haut + fondu (~280ms).
  - Changer le filtre membre après ce premier chargement : les cartes qui
    restent visibles ne rejouent **pas** l'animation (pas de re-création, donc
    pas de nouvelle apparition) ; seules les cartes qui entrent réellement
    dans la vue filtrée (si le filtre venait d'exclure un membre puis qu'on
    revient sur « Tous ») pourraient théoriquement la rejouer — à vérifier que
    cela reste discret et ne gêne pas un filtrage répété.
  - Ajouter un nouveau prêt via le formulaire du haut : la nouvelle carte
    apparaît avec la même animation, confirmant visuellement l'ajout avant même
    le toast d'annulation.
  - Activer `prefers-reduced-motion` : aucune animation visible, apparition
    instantanée dans tous les cas ci-dessus.
  - Dans DevTools, régler la vitesse de lecture à 10 % (panneau Animations) et
    confirmer que le mouvement (`translateY(8px) → none`) et le fondu sont
    synchronisés, sans à-coup.
- **Done when**: les deux vérifications mécaniques passent, l'animation ne
  joue qu'à la création réelle d'une carte (premier chargement ou ajout, pas
  au filtrage d'une carte déjà existante) et les cinq points du feel check
  sont confirmés visuellement.
