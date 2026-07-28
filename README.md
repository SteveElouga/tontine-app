# Application de gestion de tontines — Caisse mutuelle (v1)

Digitaliser la tenue des comptes d'une **caisse mutuelle** de tontine : épargne, intérêts
dégressifs, prêts et majorations. Remplacer le calcul manuel (2 à 3 h à la clôture, sur cahier)
par une saisie simple et un calcul automatique, fiable et transparent.

Pensé pour une trésorière de 40 à 60 ans, sur un téléphone modeste. Principe directeur : si c'est
plus compliqué que WhatsApp, c'est raté. Première brique d'un projet plus large (le module
« tontine rotative » viendra ensuite).

> L'argent ne transite jamais par l'application : elle tient seulement les comptes. Les mouvements
> réels se font hors application (main à main, Mobile Money).

## Ce que fait l'application (v1)

Tous les écrans sont réalisés :

- **Tableau de bord** : les totaux du cycle, une carte « état du cycle » (feu vert/orange/rouge + phrase de synthèse, bilingue), un graphe des 3 courbes (épargne/encours/trésorerie) et des raccourcis.
- **Saisie des dépôts** : par mois ou par membre, avec pré-remplissage des montants déjà saisis.
- **Prêts** : ajout d'un prêt, remboursement, calcul de la majoration.
- **Récapitulatif** : ce que chaque membre reçoit à la clôture, avec le choix du mode de
  répartition des intérêts, la recherche et une **impression pensée pour le papier**
  (en-tête avec la tontine, le cycle, le mode de répartition et la date ; menu et
  commandes de l'écran masqués).
- **Membres** : ajouter, renommer, retirer.
- **Simulation** : projeter un dépôt ou un prêt sans rien enregistrer.
- **Historique** : le journal de toutes les opérations.
- **Fiche membre** : le détail, d'où vient le montant de chacun (transparence).
- **Aide** : le guide du fonctionnement de la caisse et des écrans.

Une trésorière peut gérer **plusieurs tontines** (caisses) : sélecteur de tontine puis de cycle (barre latérale), création d'une nouvelle tontine à la volée.

L'interface respecte le réglage système « moins d'animations » : le mouvement y est discret
et se limite à des fondus d'entrée et à quelques retours tactiles. Les valeurs (courbes et
durées) sont centralisées dans `frontend/src/styles.scss` ; les décisions de motion sont
documentées dans `plans/`.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/01-specification-fonctionnelle.md`](docs/01-specification-fonctionnelle.md) | Personas, périmètre, règles de gestion, modes de répartition des intérêts, écrans, exigences. |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Stack, monolithe modulaire, modèle de données, moteur de calcul, offline-first, sécurité, déploiement. |
| [`MEMORY.md`](MEMORY.md) | État courant, journal des sessions, décisions, backlog, gouvernance Git. |

## Stack

- **Frontend** : Angular (PWA) + Apollo GraphQL, interface **bilingue français / anglais** (ngx-translate, bascule dans les Paramètres). Voir [`frontend/`](frontend/README.md).
- **Backend** : Django + DRF + GraphQL (Strawberry), **monolithe modulaire**. Voir [`backend/`](backend/README.md).
- **Base de données** : PostgreSQL (SQLite en développement).

## Le cœur : un moteur de calcul testé

Toute la logique métier (intérêts, majorations) est isolée dans `backend/apps/core/domain/`, en
**Python pur**. Elle reproduit exactement les chiffres validés avec la trésorière pilote et le
classeur `Caisse-Mutuelle-Calculatrice.xlsx`, et elle est couverte par des tests :

```bash
cd backend && python apps/core/domain/tests_interest.py
```

Règles implémentées : cycle septembre→mai (dépôts) puis juin→août (remboursements) ; intérêt
d'épargne dégressif (septembre 45 %, … mai 5 %) ; majoration de prêt de 5 % par mois de dette.

**Répartition des intérêts à la clôture.** Les années où l'on prête peu, la caisse ne peut pas
verser tous les intérêts promis. La trésorière choisit alors l'un des quatre modes : intérêts
complets, réduction d'un même nombre de mois pour tout le monde, partage au prorata des dépôts,
ou partage en parts égales. Les quatre sont implémentés et testés (`RepartitionInterets`).

## Démarrer en développement

1. **Backend** : `cd backend`, suivre `backend/README.md` (SQLite, quelques commandes). Charger les
   données de démonstration avec `python manage.py seed_pilote` (caisse, cycle 2025-2026, 17 membres).
2. **Frontend** : `cd frontend`, `npm install`, puis `ng serve`. L'API tourne sur
   `http://localhost:8000/graphql/`.

## Ce qui reste

- Valider avec le vrai cycle 2025-2026 (saisie réelle avec la trésorière, comparaison au calcul manuel).
- Tenancy par trésorière (aujourd'hui, un compte connecté voit toutes les tontines existantes).
- Déploiement en ligne (backend, frontend, PostgreSQL).
