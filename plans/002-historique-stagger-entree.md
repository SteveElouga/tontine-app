# 002 — Entrée en cascade de la liste au premier chargement (Historique)

- **Status**: DONE
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8) / Cohesion & tokens (#7 — réutilise `monte-doux`)
- **Estimated scope**: 2 fichiers (`historique.ts`, `historique.html`, `historique.scss`), ~20 lignes

## Problem

Au premier chargement de l'écran Historique, toutes les lignes de la liste
(`<ul class="journal">`, `frontend/src/app/features/historique/historique.html:32-76`)
apparaissent d'un coup, sans transition. Le tableau de bord a déjà résolu
exactement ce problème pour ses cartes avec une entrée en cascade
(`frontend/src/app/features/dashboard/dashboard.scss:29-40`) — Historique n'a
pas le même traitement alors que la situation (contenu qui arrive une fois par
visite) est identique.

`frontend/src/app/features/dashboard/dashboard.scss:29-40` (motif déjà en
place ailleurs, à reproduire) :

```scss
.carte {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 18px;
  animation: monte-doux 0.28s var(--ease-out) both;

  /* Léger décalage pour une entrée « en cascade ». */
  &:nth-child(2) {
    animation-delay: 0.05s;
  }
  &:nth-child(3) {
    animation-delay: 0.1s;
  }
}
```

**Contrainte propre à Historique** (absente sur le tableau de bord, qui n'a
que 3-4 cartes fixes) : la liste est filtrée en direct à chaque frappe dans le
champ de recherche et à chaque bascule du filtre segmenté
(`operationsFiltrees()`, `historique.ts:48-56`). Le `@for` du template utilise
`track $index` (`historique.html:33` — `@for (op of operationsFiltrees(); track $index)`)
car `Operation` n'a pas d'identifiant stable
(`frontend/src/app/core/domain/caisse.models.ts:186-192`). Si l'animation
d'entrée est posée directement sur `.op` sans précaution, elle rejouerait à
chaque frappe de recherche quand la liste filtrée se raccourcit puis se
rallonge — exactement le sur-animer que la doctrine d'Emil Kowalski proscrit
pour un élément à haute fréquence d'interaction. Ce plan neutralise ce risque
en gatant l'animation par un signal qui ne reste vrai que pendant la fenêtre
du tout premier rendu.

## Target

Ajouter un signal `entreeInitiale` dans `historique.ts`, vrai uniquement
pendant les ~500ms qui suivent l'arrivée des données, puis définitivement
faux. Le lier en classe sur `<ul class="journal">` ; tant que la classe est
présente, chaque `<li class="op">` anime son entrée avec `monte-doux` et un
décalage croissant plafonné à 240ms (8 lignes à 30ms d'écart, puis toutes les
suivantes au même délai que la 8ᵉ — pas de cascade qui s'étire sur des
secondes si la liste est longue).

```ts
// frontend/src/app/features/historique/historique.ts — cible
protected readonly entreeInitiale = signal(true);

// dans ngOnInit(), à l'intérieur du callback `next` existant, juste après
// this.chargement.set(false) :
ngOnInit(): void {
  this.caisse.historique(this.cycleStore.cycleId()).subscribe({
    next: (ops) => {
      this.operations.set(ops);
      this.chargement.set(false);
      // La cascade ne doit jouer qu'une fois : on referme la fenêtre après
      // la durée du plus long délai + la durée de l'animation elle-même
      // (240ms de décalage max + 280ms de monte-doux ≈ 520ms, arrondi à 600ms
      // par marge de sécurité).
      setTimeout(() => this.entreeInitiale.set(false), 600);
    },
    error: () => this.chargement.set(false),
  });
}

/** Décalage d'entrée en cascade, plafonné pour ne pas étirer une longue liste. */
protected retardEntree(i: number): number {
  return Math.min(i * 30, 240);
}
```

```html
<!-- frontend/src/app/features/historique/historique.html — cible -->
<ul class="journal" [class.journal--entree]="entreeInitiale()">
  @for (op of operationsFiltrees(); track $index; let i = $index) {
    <li
      class="op"
      [style.animation-delay.ms]="entreeInitiale() ? retardEntree(i) : null"
    >
      ...
    </li>
  } @empty {
    ...
  }
</ul>
```

```scss
/* frontend/src/app/features/historique/historique.scss — cible, à ajouter */
.journal--entree .op {
  animation: monte-doux 0.28s var(--ease-out) both;
}
```

`monte-doux` (translateY(8px)+opacity 0 → aucune transformation+opacity 1) et
`--ease-out` sont définis globalement dans `frontend/src/styles.scss:19,148-157` —
aucune nouvelle valeur.

## Repo conventions to follow

- Réutiliser le keyframe `monte-doux` tel quel (`frontend/src/styles.scss:148-157`) :
  ne pas écrire un nouveau `@keyframes` pour cette cascade.
- Réutiliser `var(--ease-out)` et la durée `0.28s` déjà choisie pour
  `monte-doux` sur le tableau de bord — cohérence de « personnalité » du
  mouvement entre les deux écrans.
- Le motif « classe conditionnelle qui n'anime qu'à une fenêtre précise, puis
  se désactive » n'existe pas encore ailleurs dans le repo : c'est ce plan qui
  l'introduit, précisément pour éviter de coupler l'animation à `track $index`
  (voir section Problem). Ne pas essayer de reproduire le style
  `&:nth-child(2) { animation-delay: 0.05s; }` du tableau de bord tel quel ici
  — la liste a une longueur variable et filtrée, contrairement aux 3-4 cartes
  fixes du dashboard ; le calcul `retardEntree(i)` (borné) est la bonne
  extension de ce motif pour une liste dynamique.

## Steps

1. Dans `frontend/src/app/features/historique/historique.ts` :
   - Ajouter `protected readonly entreeInitiale = signal(true);` à côté des
     autres signaux (`chargement`, `operations`, etc.).
   - Dans le callback `next` de `ngOnInit()`, juste après
     `this.chargement.set(false);`, ajouter
     `setTimeout(() => this.entreeInitiale.set(false), 600);`.
   - Ajouter la méthode `protected retardEntree(i: number): number { return Math.min(i * 30, 240); }`.
2. Dans `frontend/src/app/features/historique/historique.html` :
   - Sur `<ul class="journal">` (ligne 32), ajouter
     `[class.journal--entree]="entreeInitiale()"`.
   - Sur `@for (op of operationsFiltrees(); track $index)` (ligne 33), ajouter
     `; let i = $index` à la fin de l'expression `@for`.
   - Sur `<li class="op" ...>` (ligne 34), ajouter
     `[style.animation-delay.ms]="entreeInitiale() ? retardEntree(i) : null"`.
3. Dans `frontend/src/app/features/historique/historique.scss`, ajouter la
   règle `.journal--entree .op { animation: monte-doux 0.28s var(--ease-out) both; }`
   après le bloc `.op { ... }` existant.
4. Si le plan 001 (fondu chargement → contenu) a déjà été exécuté, le
   `<ul class="journal">` se trouve alors à l'intérieur du nouveau
   `<div class="contenu">` : ce plan reste valable tel quel, seule
   l'indentation change.

## Boundaries

- Ne pas toucher au modèle `Operation` ni à l'API GraphQL pour lui ajouter un
  identifiant stable — hors périmètre de ce plan (cf. Problem : c'est
  précisément ce qui est contourné, pas corrigé, ici).
- Ne pas appliquer l'animation en dehors de la fenêtre `entreeInitiale()` :
  aucune ligne ajoutée par le filtrage après le premier chargement ne doit
  s'animer.
- Ne pas dépasser un plafond de 240ms sur `retardEntree` — ne pas étirer la
  cascade même si la liste contient 50+ lignes.
- Ne pas modifier `.op`, `.ic`, `.txt`, `.montant` ou toute autre règle
  existante de `historique.scss` en dehors de l'ajout précisé à l'étape 3.
- Si les lignes citées (32-34) ont dérivé depuis le commit `8875b7b`, arrêter
  et signaler plutôt que d'improviser un autre point d'ancrage.

## Verification

- **Mécanique** :
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → doit
    sortir sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/historique/historique.scss'); console.log('OK')"` → doit afficher `OK`.
- **Feel check** :
  - Charger l'écran Historique pour la première fois (ou après un
    rafraîchissement) : les lignes apparaissent en cascade rapide (fondu +
    léger décalage vertical), pas toutes d'un coup.
  - Avec une longue liste (10+ opérations), vérifier que la cascade ne
    s'étire pas au-delà d'environ 500ms au total (les dernières lignes
    n'attendent pas plusieurs secondes).
  - Immédiatement après le chargement, taper dans le champ de recherche puis
    l'effacer plusieurs fois de suite : les lignes qui réapparaissent ne
    doivent **pas** rejouer l'animation (vérifier à l'œil, et si besoin dans
    DevTools → Animations, qu'aucune nouvelle instance de `monte-doux` ne se
    déclenche après la fenêtre de 600ms).
  - Dans DevTools → Animations, régler la vitesse de lecture à 10 % pendant
    le premier chargement et confirmer que le décalage entre lignes est
    perceptible et régulier (30ms), pas saccadé.
  - Activer `prefers-reduced-motion` et recharger l'écran : toutes les lignes
    apparaissent instantanément (la règle globale
    `frontend/src/styles.scss:159-168` neutralise `animation-duration` sur
    `*`), sans qu'il soit nécessaire d'ajouter une media query locale.
- **Terminé quand** : les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement, y compris l'absence de
  rejouage au filtrage.
