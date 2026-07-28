# 004 — Fondu entre les deux états du message d'enregistrement (Cahier de séance)

- **Status**: TODO
- **Commit**: 8875b7b
- **Severity**: LOW
- **Category**: Missed opportunities (#8 — state indication / feedback)
- **Estimated scope**: 2 fichiers (`notes.html`, `notes.scss`), ~15 lignes

## Problem

Sous la zone de texte, `<p class="etat">` affiche l'un de deux états
mutuellement exclusifs : « Enregistré le … » (icône verte) si une note existe
déjà pour la séance, sinon une astuce neutre invitant à écrire. Ces deux
blocs sont dans un `@if`/`@else` Angular : quand la trésorière quitte le
champ de texte modifié (`(blur)="enregistrer()"`, `notes.ts:64-88`), le
premier est détruit et le second inséré instantanément — aucun pont visuel
entre « rien n'est encore enregistré » et « c'est enregistré ». C'est une
confirmation d'action (feedback / state indication), qui survient de façon
occasionnelle (à chaque sortie de champ modifiée, pas en continu), donc
éligible à une animation standard et discrète.

`frontend/src/app/features/notes/notes.html:30-38` (état actuel) :

```html
<p class="etat">
  @if (enregistreLe()) {
    <i class="pi pi-check-circle ok"></i>
    <span>{{ 'notes.enregistreLe' | translate: { date: dateFr(enregistreLe()) } }}</span>
  } @else {
    <i class="pi pi-info-circle"></i>
    <span>{{ 'notes.videAstuce' | translate }}</span>
  }
</p>
```

`frontend/src/app/features/notes/notes.scss:101-117` (styles actuels) :

```scss
.etat {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--c-text-2);
  max-width: 720px;

  i {
    color: var(--c-accent);

    &.ok {
      color: var(--c-success);
    }
  }
}
```

## Target

Envelopper le contenu de chaque branche du `@if`/`@else` dans un
`<span class="etat-bloc">` : Angular recrée ce `<span>` à chaque bascule
d'état, ce qui redéclenche naturellement un fondu d'entrée à chaque
changement. Déplacer la mise en page flex de `.etat` vers `.etat-bloc`, et
réutiliser encore une fois le keyframe global `page-fade`, cette fois avec le
token de durée court `--dur-fast` (120ms) — budget « petit feedback » plutôt
que le `--dur-base` (180ms) utilisé pour les fondus de page/contenu.

```html
<!-- frontend/src/app/features/notes/notes.html — cible -->
<p class="etat">
  @if (enregistreLe()) {
    <span class="etat-bloc">
      <i class="pi pi-check-circle ok"></i>
      <span>{{ 'notes.enregistreLe' | translate: { date: dateFr(enregistreLe()) } }}</span>
    </span>
  } @else {
    <span class="etat-bloc">
      <i class="pi pi-info-circle"></i>
      <span>{{ 'notes.videAstuce' | translate }}</span>
    </span>
  }
</p>
```

```scss
/* frontend/src/app/features/notes/notes.scss — cible */
.etat {
  margin-top: 10px;
  font-size: 13px;
  color: var(--c-text-2);
  max-width: 720px;

  i {
    color: var(--c-accent);

    &.ok {
      color: var(--c-success);
    }
  }
}

.etat-bloc {
  display: flex;
  align-items: center;
  gap: 6px;
  animation: page-fade var(--dur-fast) var(--ease-out) both;
}
```

Note : `display: flex` et `gap: 6px` quittent `.etat` pour `.etat-bloc` (le
`<p>` n'a plus qu'un seul enfant direct désormais) ; `margin-top`,
`font-size`, `color`, `max-width` et les règles sur `i`/`i.ok` restent sur
`.etat`, inchangées.

## Repo conventions to follow

- Réutiliser `page-fade` (`frontend/src/styles.scss:138-145`) — ne pas créer
  de troisième keyframe « fondu » quasi identique (déjà utilisé tel quel par
  `plans/001` et `plans/003`) ; c'est une simple transition `opacity 0 → 1`,
  neutre vis-à-vis du contexte d'usage.
- `--dur-fast` (120ms) est déjà le token utilisé pour le retour tactile des
  boutons du stepper (`frontend/src/app/features/notes/notes.scss:45` —
  `transition: transform var(--dur-fast) var(--ease-out), color 0.12s ease;`).
  Ce plan l'étend à un deuxième usage plutôt que d'inventer une durée
  intermédiaire.
- `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) — même token que 001/003.

## Steps

1. Dans `frontend/src/app/features/notes/notes.html`, dans le bloc
   `<p class="etat">` (lignes 30-38 actuelles) :
   - Envelopper les deux `<i>`/`<span>` de la branche `@if (enregistreLe())`
     dans `<span class="etat-bloc"> ... </span>`.
   - Faire de même pour la branche `@else`.
2. Dans `frontend/src/app/features/notes/notes.scss`, sur la règle `.etat`
   (lignes 101-117 actuelles) :
   - Retirer `display: flex;`, `align-items: center;` et `gap: 6px;` de
     `.etat`.
   - Ajouter une nouvelle règle `.etat-bloc` juste après `.etat` avec
     `display: flex; align-items: center; gap: 6px; animation: page-fade var(--dur-fast) var(--ease-out) both;`.
   - Ne pas toucher aux règles `.etat i` / `.etat i.ok` (elles restent sous
     `.etat`, elles s'appliquent toujours via la descendance dans
     `.etat-bloc`).
3. Ne pas toucher `notes.ts` — ce plan est purement présentationnel, le
   comportement de `enregistrer()`/`afficherSeance()` ne change pas.

## Boundaries

- Ne pas toucher au stepper, à la `.zone` (textarea), ni au bloc
  `@if (chargement())`.
- Ne pas modifier les traductions `notes.enregistreLe` / `notes.videAstuce`.
- Ne pas ajouter de nouveau `@keyframes` ni de nouvelle valeur de durée/
  easing : réutiliser `page-fade` / `--dur-fast` / `--ease-out`.
- Ne pas ajouter de media query `prefers-reduced-motion` locale (déjà géré
  globalement, `frontend/src/styles.scss:159-168`).
- Si ce plan est exécuté après `plans/003-notes-fondu-chargement.md`, le
  `<p class="etat">` se trouve alors à l'intérieur du `<div class="contenu">`
  ajouté par 003 : ce plan reste valable tel quel, seule l'indentation change.
- Si les lignes citées (30-38, 101-117) ont dérivé depuis le commit
  `8875b7b`, arrêter et signaler plutôt que d'improviser un autre point
  d'ancrage.

## Verification

- **Mécanique** :
  - `cd frontend && node_modules/.bin/ngc -p tsconfig.app.json --noEmit` → sans erreur.
  - `cd frontend && node -e "require('sass').compile('src/app/features/notes/notes.scss'); console.log('OK')"` → affiche `OK`.
- **Feel check** :
  - Ouvrir une séance sans note, taper du texte puis cliquer en dehors du
    champ (déclenche `enregistrer()` au `blur`) : le message passe de
    l'astuce neutre à « Enregistré le … » avec un fondu bref (~120ms), pas
    un flash instantané.
  - Revenir sur une séance déjà enregistrée : le message « Enregistré le … »
    s'affiche directement (fondu au premier rendu de la branche, discret).
  - Vérifier que l'icône et le texte restent alignés horizontalement (le
    déplacement de `display: flex` vers `.etat-bloc` ne doit rien casser
    visuellement par rapport à l'état actuel).
  - Activer `prefers-reduced-motion` : le changement d'état reste instantané
    (pas de fondu), sans rien avoir à ajouter de plus.
- **Terminé quand** : les deux vérifications mécaniques passent et les quatre
  points du feel check sont confirmés visuellement.
