# Plans d'animation

Plans générés par `improve-animations`, issus des analyses design des écrans
**Historique**, **Cahier de séance**, **Saisie des dépôts** et **Prêts**
(`apple-design` + `emil-design-eng` + `find-animation-opportunities`).
001/002 (Historique), 003 (Cahier de séance), 005/006 (Saisie) et 007/008/009
(Prêts) ont été exécutés (worktree isolé indisponible dans ce sandbox —
exécutés directement, diff relu contre les « Boundaries » de chaque plan et
la doctrine d'Emil Kowalski ; `ngc` + `sass` vérifiés OK). 004 (Cahier de
séance) est écrit, pas encore exécuté.

| # | Titre | Sévérité | Statut | Dépendances |
|---|-------|----------|--------|--------------|
| [001](001-historique-fondu-chargement.md) | Historique — fondu chargement → contenu | LOW | DONE | Aucune |
| [002](002-historique-stagger-entree.md) | Historique — entrée en cascade de la liste au premier chargement | LOW | DONE | Aucune (compatible avec 001, voir plan 002 §Steps point 4) |
| [003](003-notes-fondu-chargement.md) | Cahier de séance — fondu chargement → contenu | LOW | DONE | Aucune |
| [004](004-notes-fondu-etat-enregistrement.md) | Cahier de séance — fondu entre les deux états du message d'enregistrement | LOW | TODO | Aucune (compatible avec 003, voir plan 004 §Boundaries) |
| [005](005-saisie-fondu-chargement.md) | Saisie — fondu chargement → contenu | LOW | DONE | Aucune |
| [006](006-saisie-stagger-entree.md) | Saisie — entrée en cascade de la liste au tout premier chargement (jamais aux changements de mois/membre) | LOW | DONE | Aucune (compatible avec 005, même logique que 001/002) |
| [007](007-prets-fondu-chargement.md) | Prêts — fondu chargement → contenu | LOW | DONE | Aucune |
| [008](008-prets-carte-apparition.md) | Prêts — apparition douce des cartes (premier chargement + ajout d'un prêt), fusion de deux constats | LOW | DONE | Aucune (compatible avec 007 et 009, propriétés distinctes sur `.carte`) |
| [009](009-prets-transition-soldee.md) | Prêts — transition de fond quand une carte passe « soldée » | LOW | DONE | Aucune (compatible avec 008, voir plan 009 §Boundaries) |

## Ordre d'exécution recommandé

1. **001** puis **002** (Historique) — déjà fait.
2. **003** puis **004** (Cahier de séance) — même logique : 003 est le
   changement le plus simple (wrapper + règle CSS, identique au motif de
   001), 004 a un peu plus de surface (déplacement de `display: flex` de
   `.etat` vers un nouveau `.etat-bloc`).
3. **005** puis **006** (Saisie) — même logique que 001/002, avec une
   contrainte supplémentaire sur 006 : la cascade doit se fermer une seule
   fois au tout premier chargement (mois ou membre, selon lequel arrive en
   premier) et ne jamais rejouer sur les changements de mois/membre déclenchés
   par les flèches du stepper (interaction « tens/day », voir plan 006
   §Problem et §Boundaries).
4. **007**, puis **008** et **009** dans n'importe quel ordre (Prêts) —
   007 est le motif habituel (fondu chargement → contenu). 008 fusionne deux
   constats de l'analyse (cascade au premier chargement + apparition d'une
   carte ajoutée) en une seule règle CSS non gatée, car `track p.id` sur le
   `@for` des cartes fait déjà tout le travail de distinction entre nouvel
   élément et élément réordonné/filtré — plus simple que le mécanisme
   `entreeInitiale` de 002/006. 009 est un quick win indépendant (transition
   de fond sur `.carte.soldee`), sur la même règle `.carte` que 008 mais une
   propriété différente (`transition` de `background` vs `animation` de
   `transform`/`opacity`) : aucun conflit, aucune coordination requise.

Aucune dépendance bloquante entre les quatre groupes d'écrans (Historique,
Cahier de séance, Saisie, Prêts). Ils peuvent être exécutés dans n'importe
quel ordre ou en parallèle, du moment que chaque exécuteur relit l'état réel
du fichier avant d'éditer (cf. « Boundaries » de chaque plan : arrêter et
signaler si le code a dérivé du commit stamp `8875b7b`).

Pour exécuter : `improve-animations execute plans/007-prets-fondu-chargement.md`
(ou 004/008/009), qui dispatch un exécuteur dans un worktree isolé puis relit
son diff avec la barre de `review-animations`.
