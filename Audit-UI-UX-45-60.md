# Audit UI/UX — Tontine (public 45‑60 ans)

Passe combinée à travers les skills de design d'Emil Kowalski, appliquée au frontend réel
(Angular + PrimeNG). Chaque constat est fondé sur le code, priorisé pour un public 45‑60 :
lisibilité, cibles larges, retour clair, et **retenue** du mouvement.

Priorités : 🔴 fort (à faire) · 🟠 moyen · ⚪ finition.

---

## 1. apple-design — fondations, lisibilité, retenue

### Déjà bien (à garder)

- **Mouvement réduit respecté.** Un `@media (prefers-reduced-motion: reduce)` global coupe
  animations et transitions. C'est exactement la bonne base pour le 45‑60.
- **Police système** (`-apple-system, Segoe UI, Roboto…`) : optical sizing et lisibilité natifs.
- **Retour à l'appui** (`:active { transform: scale(...) }`) sur les boutons, segments et flèches :
  le feedback est sur le *press*, pas sur le relâchement — conforme au principe « Response ».
- **Couleurs sémantiques + thème sombre** via variables CSS : cohérent et maintenable.

### À corriger (priorisé)

**🔴 1. Contraste du texte « discret » insuffisant.** `--c-text-muted: #8a94a3` sur blanc donne
un ratio ≈ **3,1:1** — sous le seuil WCAG AA (4,5:1 pour du texte normal). Or cette couleur porte
presque tout le texte à 12 px (compteurs, unités « FCFA », dates, aides). Pour des yeux de 45‑60,
c'est le point le plus pénalisant. → Foncer vers ~`#66707e` (≈ 4,8:1) en clair, et vérifier l'équivalent sombre.

**🔴 2. Le texte ne grossit pas avec les réglages système.** Le `body` n'a ni `font-size` ni
`line-height` explicites, et les tailles sont en **px** partout. Si l'utilisateur augmente la taille
de police de son téléphone/navigateur (fréquent après 45 ans), la mise en page ne suit pas.
→ Poser une base (`font-size: 16–17px; line-height: 1.5`) et laisser le texte s'agrandir (échelle en
`rem` pour la typo, au moins sur les écrans clés), sans rognage.

**🟠 3. Le plus petit palier (12 px) est trop petit.** `.sous`, `.unite`, `.tip`, `.date-aide`,
`.ligne-date`… → passer le plancher à **13 px**. Gain de confort immédiat, coût nul.

**🟠 4. Cibles tactiles sous 44 px.** Les flèches du stepper (~34 px), les petites icônes ℹ et les
mini‑boutons de remboursement sont en‑dessous de la cible confortable de 44 px recommandée.
→ Élargir la zone cliquable (padding/hit‑area) sans forcément grossir l'icône.

**⚪ 5. Finitions.** Ajouter `prefers-reduced-transparency` / `prefers-contrast` (bordures nettes en
mode contraste élevé) ; resserrer légèrement le tracking des gros titres (`-0.01em`).

---

## 2. emil-design-eng — polish des composants & décisions d'animation

Bonne surprise : le code ne contient **aucun anti‑pattern** de la checklist d'Emil — pas de
`transition: all`, pas de `ease-in`, aucune entrée depuis `scale(0)`, survols correctement isolés
derrière `@media (hover: hover)`, retour à l'appui présent, cartes du tableau en cascade (~50 ms),
et `prefers-reduced-motion` global. Le mouvement est déjà **retenu et intentionnel** — exactement
ce qu'il faut pour le 45‑60.

Les rares améliorations, au format revue :

| Avant | Après | Pourquoi |
| --- | --- | --- |
| `transition: … ease` partout (courbes natives) | définir `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` et l'utiliser | Les easings natifs sont mous ; une courbe custom donne un « punch » intentionnel aux micro‑animations |
| `page-fade` / `monte-doux` en `ease` | `ease-out` (ce sont des entrées) | Une entrée doit démarrer vite ; à durée égale, `ease-out` paraît plus rapide |
| `.raccourci` anime `box-shadow` + `border-color` | privilégier `transform`/`opacity`, ombre discrète | Seuls `transform`/`opacity` évitent le repaint (impact mineur à cette échelle) |
| `etat-ok-apparait` en `@keyframes` (à chaque sauvegarde) | OK ; passer en transition si ça scintille un jour sur saisies rapides | Les transitions se recalibrent en douceur ; les keyframes repartent de zéro |

Verdict Emil : **peu à faire.** Le seul geste « systémique » utile est le jeu de courbes d'easing
custom (un token, réutilisé partout).

---

## 3. Trio animation (find-animation-opportunities / improve-animations / review-animations)

- **find-animation-opportunities** — déjà passé (session précédente) : avait identifié le retour
  tactile, l'anti‑flash des cartes, la confirmation ✓ de sauvegarde, les fondus — tous implémentés.
- **improve-animations** — audit priorisé du mouvement, verdict : **aucune anomalie HIGH/MEDIUM.**
  Le mouvement est déjà correct. Leviers restants, tous LOW :
  - *Cohésion* : durées ad‑hoc (0,12 / 0,15 / 0,2 / 0,28 s) + courbes natives → factoriser en tokens.
  - *Perf* : `.raccourci` anime `box-shadow`/`border-color` (repaint) → transform/opacity de préférence.
  - *Fréquence* : le ✓ à chaque sauvegarde est vu des dizaines de fois/session, mais c'est un
    **feedback** légitime, déjà court et discret (0,12 s) — à garder tel quel.
- **review-animations** — outil de revue d'un **diff** précis (sur une PR). À dégainer quand on
  modifiera une animation, pas en audit global.

Constat 45‑60 transversal : **rien n'est sur‑animé.** Le risque pour ce public — un mouvement qui
distrait ou désoriente — n'est pas présent. L'effort doit aller à la **lisibilité**, pas au mouvement.

---

## Synthèse — plan d'action priorisé pour le 45‑60

**🔴 Quick wins (fort impact, faible coût) :**

1. **Foncer `--c-text-muted`** (#8a94a3 → ~#66707e) : fait passer tout le texte discret au‑dessus du
   seuil de contraste AA. *(1 ligne, clair + sombre)*
2. **Plancher de police à 13 px** au lieu de 12 pour les petits libellés. *(quelques valeurs SCSS)*
3. **Base typographique explicite** sur `body` (16‑17 px, `line-height: 1.5`) + laisser le texte
   grossir avec les réglages système. *(styles globaux)*
4. **Cibles tactiles ≥ 44 px** (flèches du stepper, mini‑boutons, icônes ℹ). *(padding / hit‑area)*

**🟠 Moyen terme :**

5. Jeu de tokens d'easing/durée (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--dur-fast: 120ms`…)
   branchés partout.
6. `prefers-reduced-transparency` / `prefers-contrast` (bordures nettes en contraste élevé).

**⚪ Finition :**

7. Tracking des gros titres (‑0.01em) ; `.raccourci` en transform/opacity.

Les 4 quick wins sont de petites diffs SCSS (contraste, tailles, base typo, cibles), vérifiables par
ngc + sass, sans toucher à la logique.

