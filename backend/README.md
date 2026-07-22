# Backend — Caisse mutuelle (Django · DRF · GraphQL)

Monolithe modulaire. Chaque domaine métier est une app sous `apps/`. Le cœur des calculs
(`apps/core/domain/`) est du **Python pur**, sans Django, donc testable en isolation.

## Démarrage rapide (dev, SQLite)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser        # pour accéder à l'admin
python manage.py runserver
```

- API GraphQL (avec explorateur) : http://localhost:8000/graphql/
- Admin Django : http://localhost:8000/admin/
- Santé : http://localhost:8000/api/sante/

## Avec PostgreSQL (Docker)

```bash
cp .env.example .env        # renseigner POSTGRES_DB, POSTGRES_PASSWORD…
docker compose up --build
```

## Tester le moteur de calcul

Le moteur est couvert par des tests qui reprennent les chiffres validés avec la trésorière
(100 000 en septembre → 45 000 d'intérêt ; prêt de 100 000 sur 6 mois → 30 000 de majoration).

```bash
python apps/core/domain/tests_interest.py      # exécution autonome
# ou, avec pytest installé :
pytest apps/core/domain/tests_interest.py
```

## Exemple de requête GraphQL

```graphql
query {
  recapCycle(cycleId: "<uuid-du-cycle>") {
    nom
    totalDepose
    interets
    epargnePlusInterets
    dettes
    positionNette
  }
}
```

## Créer les migrations d'un module

```bash
python manage.py makemigrations members cycles savings loans
python manage.py migrate
```

## Structure

```
backend/
├── config/            # projet Django : settings (base/dev), urls, schema GraphQL racine, wsgi/asgi
└── apps/
    ├── core/domain/   # MOTEUR DE CALCUL (Python pur) + tests
    ├── members/       # membres
    ├── cycles/        # cycle annuel + paramètres (taux, durée, délai)
    ├── savings/       # dépôts + intérêts
    └── loans/         # prêts + majoration
```

## Prochaines étapes

- Activer l'authentification JWT (dé-commenter dans `config/urls.py`, requirements déjà prêt).
- Écrire les migrations et un `seed` de données (la caisse pilote : 17 membres).
- Enrichir le schéma GraphQL (mutations prêts, clôture) et exposer le contrôle de caisse.
- Brancher la règle d'ajustement des intérêts une fois tranchée (voir `interest.py`,
  classes `RepartitionInterets`).
