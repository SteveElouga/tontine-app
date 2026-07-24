# Modèle de prêts — intérêts composés sur solde dégressif (v2)

> **Statut : validé le 2026-07-24 (Steve).** Décrit le nouveau calcul des prêts.
> Remplace le calcul actuel (intérêt **simple**) et sert de référence pour
> l'implémentation et les tests.

## 1. Ce qui change

| | Modèle actuel (v1) | Nouveau modèle (v2) |
|---|---|---|
| Intérêt du prêt | **simple** : `montant × 5 % × nb de mois` | **composé** sur le solde restant, mois par mois |
| Remboursement | **un seul** mois de remboursement par prêt | **plusieurs** remboursements partiels au fil des réunions |
| Fin des prêts | août (`mois_delai = 12`) | **juin** (la clôture = ouverture + durée) |
| Dépôts d'un emprunteur | épargne classique | comptés comme **remboursements** du prêt |
| Arrondi | au franc à chaque étape | calcul **exact** en interne, montant **final** arrondi à **1 décimale** |

## 2. Principes

- Une **réunion par mois**. À chaque réunion, la dette gagne **5 %** du solde restant (taux paramétrable = `taux_majoration`).
- **Composé** : l'intérêt non payé s'ajoute au solde ; le mois suivant les 5 % portent sur ce nouveau solde.
- **L'intérêt du 1ᵉʳ mois est engagé dès le prêt** : impossible d'y échapper par un remboursement anticipé. Un prêt subit **toujours au moins un mois** d'intérêt.
- Un remboursement **paie d'abord l'intérêt du mois, puis réduit le capital**.
- Les prêts **s'arrêtent en juin** (même clôture que l'épargne). Le solde restant en juin est la **dette finale**, retranchée de ce que le membre reçoit.
- Tant qu'un membre a un **prêt en cours**, ce qu'il dépose est un **remboursement** (même règle), pas de l'épargne.
- **Calcul exact en interne** (échéancier), et on **arrondit à 1 décimale seulement le montant final** : dette de juin, total d'intérêts, excédent reversé en épargne.
- **Épargne classique (sans prêt) : inchangée** — 5 %/mois dégressif jusqu'en juin (septembre 45 %, … mai 5 %).

## 3. Formule

Positions dans le cycle : septembre = 1 … mai = 9, **juin = 10** (clôture = durée + 1).

Pour un prêt du mois `p`, à chaque réunion `m` de `p+1` jusqu'à juin (10) :

```
intérêt(m) = solde × 5 %          (exact, pleine précision)
solde      = solde + intérêt(m) − paiement(m)
```

- Le premier intérêt est celui de l'intervalle `p → p+1`, **engagé dès le prêt** et encaissé à la réunion `p+1`.
- Un prêt du mois `p` cumule donc `10 − p` mois d'intérêt s'il n'est jamais remboursé (septembre → 9 mois).
- « Intérêt d'abord, puis capital » est automatique : `solde × 1,05 − paiement` revient à payer d'abord les 5 %, le reste réduisant le capital.
- **Arrondi** : aucun arrondi intermédiaire (échéancier exact) ; seul le montant **final** est arrondi à **1 décimale** (ROUND_HALF_UP).

## 4. Exemples chiffrés (calcul **exact**, dette finale arrondie à **1 décimale**)

### A. 100 000 emprunté en septembre, **jamais remboursé**

| Réunion | Intérêt (5 %) | Paiement | Solde |
|---|--:|--:|--:|
| Octobre | 5 000 | 0 | 105 000 |
| Novembre | 5 250 | 0 | 110 250 |
| Décembre | 5 512,5 | 0 | 115 762,5 |
| Janvier | 5 788,125 | 0 | 121 550,625 |
| Février | 6 077,53125 | 0 | 127 628,15625 |
| Mars | 6 381,4078125 | 0 | 134 009,5640625 |
| Avril | 6 700,478203125 | 0 | 140 710,042265625 |
| Mai | 7 035,50211328125 | 0 | 147 745,54437890625 |
| Juin | 7 387,2772189453125 | 0 | 155 132,8215978515625 |

→ **Dette finale (arrondie à 1 décimale) : 155 132,8**

### B. 100 000 en septembre, **20 000 payés en octobre**

| Réunion | Intérêt (5 %) | Paiement | Solde |
|---|--:|--:|--:|
| Octobre | 5 000 | 20 000 | 85 000 |
| Novembre | 4 250 | 0 | 89 250 |
| Décembre | 4 462,5 | 0 | 93 712,5 |
| Janvier | 4 685,625 | 0 | 98 398,125 |
| Février | 4 919,90625 | 0 | 103 318,03125 |
| Mars | 5 165,9015625 | 0 | 108 483,9328125 |
| Avril | 5 424,196640625 | 0 | 113 908,129453125 |
| Mai | 5 695,40647265625 | 0 | 119 603,53592578125 |
| Juin | 5 980,1767962890625 | 0 | 125 583,7127220703125 |

→ **Dette finale (arrondie à 1 décimale) : 125 583,7**

Le paiement d'octobre : 5 000 couvrent l'intérêt, 15 000 réduisent le capital → 85 000.

### C. 100 000 en septembre, l'emprunteur **dépose 20 000 à chaque réunion** (= remboursements)

| Réunion | Intérêt (5 %) | Paiement | Solde |
|---|--:|--:|--:|
| Octobre | 5 000 | 20 000 | 85 000 |
| Novembre | 4 250 | 20 000 | 69 250 |
| Décembre | 3 462,5 | 20 000 | 52 712,5 |
| Janvier | 2 635,625 | 20 000 | 35 348,125 |
| Février | 1 767,40625 | 20 000 | 17 115,53125 |
| Mars | 855,7765625 | 20 000 | **0** (soldé) |

Prêt **soldé en mars**. Le versement de mars (20 000) dépasse le solde de **2 028,6921875** (arrondi final : **2 028,7**) → cet **excédent devient de l'épargne** (et gagnera les intérêts d'épargne restants jusqu'en juin).

### D. Épargnant pur (rappel — inchangé)

100 000 déposés en septembre, **sans prêt** : intérêt 5 % × 9 mois = **45 000** → reçoit **145 000** en juin.

## 5. Dépôts = remboursements (couplage épargne ↔ prêt)

- Tant qu'un membre a un prêt **non soldé**, son dépôt d'une réunion est enregistré comme **remboursement** de ce prêt (intérêt d'abord, puis capital).
- **Plusieurs prêts** : le dépôt rembourse le **plus ancien** d'abord ; le surplus passe au suivant, puis en épargne.
- Si le dépôt **dépasse** le solde restant, l'**excédent** est enregistré comme **épargne** de ce mois (exemple C).
- Une fois le(s) prêt(s) soldé(s), les dépôts suivants redeviennent de l'épargne normale.

## 6. Impact sur le modèle de données et les écrans

- **`Loan`** : `montant`, `mois_pret`. On **retire** le `mois_remboursement` unique.
- **`Remboursement`** (nouveau) : `prêt`, `mois`, `montant` — **plusieurs par prêt**.
- La dette d'un prêt (à n'importe quelle réunion, et finale en juin) se **recalcule à la volée** depuis le prêt + ses remboursements ordonnés.
- **Fin des prêts = juin** (`durée + 1`) : le réglage « remboursement au plus tard en » (août) devient juin / la clôture.
- Écran **Prêts** : saisir des **remboursements partiels** (mois + montant) au lieu d'un simple « marquer remboursé » ; afficher le solde courant.
- Écran **Fiche membre** : montrer l'échéancier du prêt (intérêt / paiement / solde par mois) et le lien dépôts→remboursements.
- **Moteur** (`interest.py`) : simulation composée (fait au chantier 1) ; `total_a_rembourser` / `majoration` / `mois_de_dette` remplacés par le calcul de solde.

## 7. Décisions validées (2026-07-24)

1. **Excédent de remboursement** (dépôt > solde du prêt) → devient l'épargne du mois. ✅
2. **Plusieurs prêts** pour un même membre : on rembourse le **plus ancien d'abord**. ✅
3. L'intérêt du 1ᵉʳ mois est **engagé dès le prêt** ; un prêt subit toujours au moins un mois d'intérêt. ✅
4. **Arrondi** : calcul exact en interne, **montant final arrondi à 1 décimale**. ✅
5. Le taux composé utilise **`taux_majoration`** (5 % paramétrable). ✅

## 8. Découpage d'implémentation

1. **Moteur composé + tests** (`interest.py`) — ✅ **fait** (`cloture`, `LigneEcheance`, `echeancier_pret`, `dette_finale`, `total_interets_pret`, `total_excedent`, `repartir_paiement` ; 10 tests, exemples A–D exacts).
2. **Modèle de données + migration** : `Remboursement` (registre), retrait de `mois_remboursement` unique, clôture prêts = juin.
3. **API GraphQL** : exposer le solde / l'échéancier, mutation « ajouter un remboursement », couplage dépôt→remboursement.
4. **Écran Prêts** : remboursements partiels + solde courant.
5. **Écran Fiche membre** : échéancier détaillé.
