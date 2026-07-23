# Spécification fonctionnelle — Module « Caisse mutuelle »

**Projet :** Application de gestion de tontines (Cameroun)
**Version du document :** 0.2
**Périmètre de cette version :** module Caisse mutuelle uniquement (épargne, intérêts, prêts)
**Statut :** v1 implémentée (tous les écrans + moteur de calcul testé). Règle d'ajustement des intérêts tranchée avec la trésorière (voir §5). Reste à valider avec une année réelle, puis authentification et mise en ligne.

---

## 1. Vision

Digitaliser la tenue des comptes d'une caisse mutuelle de tontine pour remplacer le calcul manuel — aujourd'hui fait à la main, sur cahier, en 2 à 3 heures à la clôture — par une saisie simple et un calcul automatique, fiable et transparent des intérêts et des dettes de chaque membre.

Le principe directeur : **si c'est plus compliqué que WhatsApp, c'est mort.** L'outil doit être utilisable par une trésorière de 45–60 ans, sur un téléphone d'entrée de gamme, avec une connexion faible.

> **Contrainte légale reprise du cadrage projet :** l'argent ne transite jamais par l'application. L'app ne fait que **tenir les comptes** (qui a déposé/emprunté quoi, quels intérêts). Les mouvements d'argent réels se font hors application (main à main, Mobile Money). Cela évite le statut d'établissement de paiement (agrément COBAC) et reste hors de portée réglementaire.

---

## 2. Personas

**Aïcha — la trésorière (utilisatrice principale).** Tient les comptes de la caisse. Subit la charge du calcul et le risque d'accusation en cas d'écart. C'est elle qui saisit les dépôts et les prêts, et qui présente les comptes à la clôture. Peu à l'aise avec les applications complexes. **C'est pour elle que l'app est conçue en priorité.**

**Les membres (utilisateurs secondaires, plus tard).** Veulent savoir où en est leur argent et disposer d'une preuve de leurs versements. Dans cette v1, ils ne se connectent pas encore : la trésorière est la seule utilisatrice. Leur accès en consultation est prévu pour une version ultérieure.

---

## 3. Glossaire du domaine

| Terme | Définition |
|---|---|
| **Cycle** | Période annuelle de la caisse. Ici : **septembre → mai** pour les dépôts, puis **juin–juillet–août** pour les remboursements, reprise en septembre. |
| **Membre** | Personne appartenant à la caisse (17 dans la caisse pilote). |
| **Dépôt (épargne)** | Somme versée par un membre un mois donné. Cumulable chaque mois. |
| **Taux à la clôture** | Intérêt appliqué à un dépôt, **dégressif selon son mois** : 5 % par mois restant jusqu'à la clôture. |
| **Intérêt** | Rémunération de l'épargne d'un membre = somme des dépôts × leur taux respectif. |
| **Prêt (prélèvement)** | Somme empruntée par un membre à la caisse. |
| **Majoration** | Coût du prêt = 5 % du montant emprunté **par mois de dette**, jusqu'au remboursement. |
| **Délai** | Date limite de remboursement d'un prêt : **fin août**. Au délai, capital + majoration sont facturés. |
| **Clôture / cassage** | Fin de cycle : on solde tout, chaque membre récupère son épargne + intérêts, moins ses dettes éventuelles. |

---

## 4. Règles de gestion (cœur du module)

Ces règles ont été recueillies et vérifiées avec le porteur de projet. **Elles sont paramétrables** (les taux et la durée ne doivent pas être codés en dur).

### 4.1 Rythme annuel

- **Septembre → mai (9 mois) :** période de dépôts et de prêts.
- **Juin, juillet, août :** période de remboursement uniquement — **on ne dépose plus, on ne prête plus**, mais **la majoration des prêts continue de courir** jusqu'au remboursement.
- **Reprise en septembre** pour un nouveau cycle.

### 4.2 Intérêt sur l'épargne (dégressif)

Chaque dépôt garde le taux **du mois où il est versé**, appliqué à la clôture :

| Mois du dépôt | Sept | Oct | Nov | Déc | Jan | Fév | Mar | Avr | Mai |
|---|---|---|---|---|---|---|---|---|---|
| Taux à la clôture | 45 % | 40 % | 35 % | 30 % | 25 % | 20 % | 15 % | 10 % | 5 % |

Règle générale : `taux = 5 % × (nombre de mois restants jusqu'à la clôture)`. Les dépôts de plusieurs mois s'additionnent, chacun avec son propre taux.

> **Exemple.** 100 000 déposés en septembre → 45 000 d'intérêt → **145 000** récupérés à la clôture.

### 4.3 Majoration sur les prêts

- Un membre qui emprunte paie **5 % du montant par mois de dette**, jusqu'au remboursement (été inclus).
- Au **délai (fin août)**, on additionne toute la majoration accumulée et on la facture avec le capital.
- `majoration = montant × 5 % × nombre de mois de dette` ; `total à rembourser = montant + majoration`.

> **Exemple.** 100 000 empruntés en février, remboursés en août (6 mois) → majoration 30 000 → **130 000** à rembourser.

### 4.4 Position nette d'un membre à la clôture

`position nette = (épargne + intérêts) − (dettes + majorations à régler)`

---

## 5. Ajustement des intérêts quand tout n'a pas été prêté (règle tranchée)

Les intérêts versés aux épargnants sont financés par les majorations des emprunteurs. Certaines années, la caisse prête peu : elle encaisse peu de majorations et ne peut pas verser tous les intérêts promis. La trésorière pilote a tranché : **à la clôture, elle choisit l'un des quatre modes de répartition** suivants.

1. **Intérêts complets.** Tout a été prêté : chaque membre reçoit tous ses intérêts (barème dégressif complet).
2. **Réduction d'un nombre de mois.** On retranche le **même nombre de mois** à chaque dépôt, ce nombre étant fixé par la trésorière. Un dépôt de septembre (9 mois) avec 3 mois en moins ne compte plus que 6 mois (30 %). Cela **favorise ceux qui ont déposé tôt** ; les dépôts les plus tardifs peuvent tomber à zéro. L'application **propose** un nombre (celui qui fait tenir le total des intérêts dans les majorations réellement encaissées), que la trésorière peut modifier.
3. **Partage équitable au prorata des dépôts.** Les gains réellement encaissés sont partagés selon ce que chaque membre a déposé (les mois sont ignorés).
4. **Partage équitable en parts égales.** Les gains réellement encaissés sont partagés en parts égales entre les épargnants.

Le moteur implémente ces quatre modes via une stratégie enfichable (`RepartitionInterets`), couverte par des tests. Le choix se fait sur l'écran Récapitulatif (voir doc d'architecture, §5).

---

## 6. Périmètre fonctionnel de la v1

### 6.1 Ce que fait l'app (user stories)

**Gestion des membres**
- En tant que trésorière, je peux créer la caisse et son cycle (mois de début, durée, taux).
- En tant que trésorière, j'ajoute / modifie / retire des membres.

**Épargne**
- Je saisis, pour un membre et un mois, le montant déposé.
- L'app calcule automatiquement l'intérêt de chaque dépôt selon son mois, et le solde épargne + intérêts du membre.
- Je vois le total déposé et le total des intérêts pour toute la caisse.

**Prêts**
- Je saisis un prêt (membre, montant, mois du prêt).
- Je saisis (ou laisse vide) le mois de remboursement ; si vide, l'app utilise le délai d'août.
- L'app calcule la majoration et le total à rembourser.

**Clôture / récapitulatif**
- Je consulte le récapitulatif par membre : épargne + intérêts, dettes + majorations, position nette.
- Je consulte un contrôle indicatif de la caisse (intérêts promis vs majorations perçues).
- Je peux exporter / imprimer le récapitulatif pour la réunion de clôture.

### 6.2 Écrans (v1, tous réalisés)

1. **Tableau de bord** : totaux du cycle et raccourcis.
2. **Saisie des dépôts** : par mois ou par membre, avec pré-remplissage des montants déjà saisis.
3. **Prêts** : liste, ajout d'un prêt, remboursement, calcul de la majoration.
4. **Récapitulatif** : ce que chaque membre reçoit à la clôture, choix du mode de répartition, recherche, impression.
5. **Membres** : liste, ajout, renommage, retrait.
6. **Simulation** : projeter un dépôt ou un prêt sans rien enregistrer.
7. **Historique** : journal de toutes les opérations.
8. **Fiche membre** : le détail, d'où vient le montant de chacun (transparence).
9. **Aide** : guide du fonctionnement de la caisse et des écrans.

Un **sélecteur de cycle** (barre latérale) permet de changer le cycle courant.

### 6.3 Hors périmètre v1 (roadmap)

- Tontine rotative (cotisations, tours, rappels de retard) — *module suivant.*
- Accès en consultation pour les membres (comptes individuels).
- Intégration Mobile Money (MTN MoMo / Orange Money) — *les fonds restent hors app.*
- Multi-caisses / multi-tontines par utilisateur.
- Langues locales camerounaises (le français et l'anglais sont déjà disponibles).
- Gestion des amendes/retards, enchères (« tontine à la criée »).

---

## 7. Exigences non fonctionnelles

- **Simplicité radicale.** Parcours de saisie minimal, gros boutons, libellés en langage courant. Référence : plus simple que WhatsApp.
- **Hors ligne / connexion faible.** L'app doit rester utilisable sans réseau (PWA installable, saisie en local, synchronisation quand la connexion revient). Voir doc d'architecture.
- **Appareils modestes.** Android d'entrée de gamme **et** iPhone/Safari iOS (50 % des répondants au sondage sont sur iPhone). Bundle léger.
- **Français et anglais** : interface entièrement traduite, bascule dans les Paramètres (i18n via ngx-translate).
- **Confidentialité et sécurité** des données financières : accès protégé, données chiffrées en transit, sauvegarde.
- **Coût quasi nul en données mobiles.**
- **Transparence et traçabilité :** historique des saisies, pour remplacer le rôle de preuve du cahier en cas de litige.

---

## 8. Critères de succès de la v1

- La trésorière pilote saisit une année réelle et retrouve, pour chaque membre, **les mêmes chiffres** que son calcul manuel — en quelques minutes au lieu de 2–3 heures.
- Zéro erreur de calcul sur les intérêts et majorations (couvert par les tests du moteur).
- La trésorière peut présenter un récapitulatif clair à la réunion de clôture.
