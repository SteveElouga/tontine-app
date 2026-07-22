# Application de gestion de tontines — Caisse mutuelle (v1)

Digitaliser la tenue des comptes d'une **caisse mutuelle** de tontine : épargne, intérêts
dégressifs, prêts et majorations. Remplacer le calcul manuel (2–3 h à la clôture, sur cahier)
par une saisie simple et un calcul automatique, fiable et transparent.

Première brique d'un projet plus large (le module « tontine rotative » viendra ensuite).

## Documentation

| Document | Contenu |
|---|---|
| [`docs/01-specification-fonctionnelle.md`](docs/01-specification-fonctionnelle.md) | Personas, périmètre, règles de gestion, user stories, écrans, exigences, question ouverte. |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Stack, monolithe modulaire, modèle de données, moteur de calcul, offline-first, sécurité, déploiement. |

## Stack

- **Frontend** : Angular (PWA) + Apollo GraphQL — voir [`frontend/`](frontend/README.md)
- **Backend** : Django + DRF + GraphQL (Strawberry), **monolithe modulaire** — voir [`backend/`](backend/README.md)
- **Base de données** : PostgreSQL (SQLite en dev)

## Le cœur : un moteur de calcul testé

Toute la logique métier (intérêts, majorations) est isolée dans `backend/apps/core/domain/`,
en **Python pur**. Elle reproduit exactement les chiffres validés avec la trésorière pilote et
le classeur `Caisse-Mutuelle-Calculatrice.xlsx`, et est couverte par des tests :

```bash
cd backend && python apps/core/domain/tests_interest.py
```

Règles implémentées : cycle septembre→mai (dépôts) puis juin→août (remboursements) ;
intérêt d'épargne dégressif (septembre 45 % … mai 5 %) ; majoration de prêt 5 %/mois de dette.

## Démarrer

1. Backend : `cd backend` puis suivre `backend/README.md` (SQLite, 3 commandes).
2. Frontend : `cd frontend` puis suivre `frontend/README.md` (`ng new` + fichiers fournis).

## En attente

- **Règle d'ajustement des intérêts** quand tout l'argent déposé n'a pas été prêté :
  question posée à la trésorière. Le moteur est prêt à accueillir la réponse sans refonte
  (voir `backend/apps/core/domain/interest.py`, classes `RepartitionInterets`).
