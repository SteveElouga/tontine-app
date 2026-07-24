"""Tests des résolveurs GraphQL avec données semées.

On sème une caisse réelle (2 membres actifs + 1 inactif, des dépôts, un prêt) puis on
interroge l'API `/graphql/` authentifiée. Le but n'est pas de retester le moteur (couvert
par `tests_interest.py`) mais de vérifier le **câblage** résolveur ↔ base ↔ moteur :
les bons montants, le bon filtrage (membres actifs), le bon format de fil (camelCase,
Decimal en chaîne).

Barème par défaut (mois_debut=9, duree_depot=9, mois_delai=12, taux 5 %) :
  - Awa : dépôt 10000 au mois 1 (taux 45 % → 4500) + 10000 au mois 9 (5 % → 500) = 5000 d'intérêts,
          épargne+intérêts = 25000 ; prêt 30000 au mois 2 non remboursé → 10 mois de dette,
          majoration 15000, total 45000 ; position nette = 25000 − 45000 = −20000.
  - Béa : dépôt 20000 au mois 1 (45 % → 9000) ; épargne+intérêts = 29000 ; pas de prêt.
  - Gains de la caisse (majorations encaissées) = 15000.
"""
from collections import Counter

import pytest


def _data(client, query, **variables):
    """Poste une requête GraphQL authentifiée et renvoie le bloc `data` (échoue si erreurs)."""
    r = client.post("/graphql/", {"query": query, "variables": variables}, format="json")
    assert r.status_code == 200, r.content
    body = r.json()
    assert "errors" not in body, body.get("errors")
    return body["data"]


@pytest.fixture
def donnees(db):
    """Caisse + cycle par défaut + 2 membres actifs (Awa, Béa) + 1 inactif, dépôts et prêt."""
    from apps.cycles.models import Caisse, Cycle
    from apps.loans.models import Loan
    from apps.members.models import Member
    from apps.savings.models import Deposit

    caisse = Caisse.objects.create(nom="Caisse test")
    cycle = Cycle.objects.create(caisse=caisse, libelle="2025-2026")
    awa = Member.objects.create(caisse=caisse, nom="Awa")
    bea = Member.objects.create(caisse=caisse, nom="Béa")
    Member.objects.create(caisse=caisse, nom="Zoé (inactive)", actif=False)

    Deposit.objects.create(cycle=cycle, member=awa, mois_index=1, montant=10000)
    Deposit.objects.create(cycle=cycle, member=awa, mois_index=9, montant=10000)
    Deposit.objects.create(cycle=cycle, member=bea, mois_index=1, montant=20000)
    Loan.objects.create(cycle=cycle, member=awa, montant=30000, mois_pret=2)

    return {"caisse": caisse, "cycle": cycle, "awa": awa, "bea": bea}


@pytest.mark.django_db
def test_recap_cycle_complet(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!){ recapCycle(cycleId: $id){"
        " nom totalDepose interets epargnePlusInterets dettes positionNette } }",
        id=str(donnees["cycle"].id),
    )
    lignes = data["recapCycle"]
    # Filtrage : seulement les 2 membres actifs, ordonnés par nom (Awa avant Béa).
    assert [l["nom"] for l in lignes] == ["Awa", "Béa"]

    awa, bea = lignes
    assert awa["totalDepose"] == "20000"
    assert awa["interets"] == "5000"
    assert awa["epargnePlusInterets"] == "25000"
    assert awa["dettes"] == "45000"
    assert awa["positionNette"] == "-20000"

    assert bea["interets"] == "9000"
    assert bea["dettes"] == "0"
    assert bea["positionNette"] == "29000"


@pytest.mark.django_db
def test_recap_cycle_mode_reduction(api_auth, donnees):
    # Mode « réduction de N mois » : on retranche 1 mois à chaque dépôt.
    # Awa : mois 1 → 8 mois (10000×5%×8 = 4000) ; mois 9 → 0 mois (rien) = 4000.
    data = _data(
        api_auth,
        'query($id: ID!){ recapCycle(cycleId: $id, mode: "reduction", nMois: 1){ nom interets } }',
        id=str(donnees["cycle"].id),
    )
    awa = next(l for l in data["recapCycle"] if l["nom"] == "Awa")
    assert awa["interets"] == "4000"


@pytest.mark.django_db
def test_membres_actifs_seulement(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!){ membres(cycleId: $id){ nom actif } }",
        id=str(donnees["cycle"].id),
    )
    noms = [m["nom"] for m in data["membres"]]
    assert noms == ["Awa", "Béa"]
    assert all(m["actif"] for m in data["membres"])


@pytest.mark.django_db
def test_depots_mois(api_auth, donnees):
    cid = str(donnees["cycle"].id)
    # Mois 1 : Awa 10000, Béa 20000.
    data = _data(
        api_auth,
        "query($id: ID!, $m: Int!){ depotsMois(cycleId: $id, moisIndex: $m){ nom montant } }",
        id=cid, m=1,
    )
    par_nom = {d["nom"]: d["montant"] for d in data["depotsMois"]}
    assert par_nom == {"Awa": "10000", "Béa": "20000"}

    # Mois 9 : Awa 10000, Béa n'a rien déposé → 0.
    data = _data(
        api_auth,
        "query($id: ID!, $m: Int!){ depotsMois(cycleId: $id, moisIndex: $m){ nom montant } }",
        id=cid, m=9,
    )
    par_nom = {d["nom"]: d["montant"] for d in data["depotsMois"]}
    assert par_nom == {"Awa": "10000", "Béa": "0"}


@pytest.mark.django_db
def test_prets_cycle(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!){ pretsCycle(cycleId: $id){"
        " nom montant moisDeDette majoration totalARembourser rembourse solde totalRembourse } }",
        id=str(donnees["cycle"].id),
    )
    prets = data["pretsCycle"]
    assert len(prets) == 1
    p = prets[0]
    assert p["nom"] == "Awa"
    assert p["montant"] == "30000"
    # Anciens champs (calcul simple) — conservés en additif :
    assert p["moisDeDette"] == 10
    assert p["majoration"] == "15000"
    assert p["totalARembourser"] == "45000"
    assert p["rembourse"] is False
    # Nouveaux champs composés v2 (30000 au mois 2, sans remboursement) :
    assert p["solde"] == "44323.7"
    assert p["totalRembourse"] == "0"


@pytest.mark.django_db
def test_ajouter_remboursement(api_auth, donnees):
    cid = str(donnees["cycle"].id)
    pid = _data(api_auth, "query($id: ID!){ pretsCycle(cycleId: $id){ id } }", id=cid)[
        "pretsCycle"
    ][0]["id"]
    data = _data(
        api_auth,
        "mutation($p: ID!, $mt: Decimal!){"
        " ajouterRemboursement(pretId: $p, mois: 5, montant: $mt){ solde totalRembourse } }",
        p=pid, mt="20000",
    )
    r = data["ajouterRemboursement"]
    assert r["solde"] == "18798.0"       # 30000@mois2, 20000 remboursés au mois 5 (composé)
    assert r["totalRembourse"] == "20000"


@pytest.mark.django_db
def test_historique(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!){ historique(cycleId: $id){ type membreNom montant } }",
        id=str(donnees["cycle"].id),
    )
    ops = data["historique"]
    # 3 dépôts + 1 prêt.
    assert Counter(o["type"] for o in ops) == {"depot": 3, "pret": 1}
    pret = next(o for o in ops if o["type"] == "pret")
    assert pret["membreNom"] == "Awa"
    assert pret["montant"] == "30000"


@pytest.mark.django_db
def test_fiche_membre(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!, $mid: ID!){ ficheMembre(cycleId: $id, memberId: $mid){"
        " nom totalDepose interets dettes positionNette"
        " depots{ moisIndex montant interet }"
        " prets{ montant moisDeDette majoration totalARembourser } } }",
        id=str(donnees["cycle"].id), mid=str(donnees["awa"].id),
    )
    fiche = data["ficheMembre"]
    assert fiche["nom"] == "Awa"
    assert fiche["totalDepose"] == "20000"
    assert fiche["interets"] == "5000"
    assert fiche["dettes"] == "45000"
    assert fiche["positionNette"] == "-20000"

    # Dépôts détaillés (ordonnés par mois) : intérêt figé au mois du dépôt.
    depots = {d["moisIndex"]: d for d in fiche["depots"]}
    assert depots[1]["interet"] == "4500"   # septembre : 45 %
    assert depots[9]["interet"] == "500"    # mai : 5 %

    assert len(fiche["prets"]) == 1
    assert fiche["prets"][0]["majoration"] == "15000"


@pytest.mark.django_db
def test_infos_cloture(api_auth, donnees):
    data = _data(
        api_auth,
        "query($id: ID!){ infosCloture(cycleId: $id){ gains totalPromis reductionSuggeree } }",
        id=str(donnees["cycle"].id),
    )
    infos = data["infosCloture"]
    assert infos["gains"] == "15000"        # majorations encaissées (prêt Awa)
    assert infos["totalPromis"] == "14000"  # intérêts complets dus (Awa 5000 + Béa 9000)
    # Les gains (15000) couvrent déjà les intérêts promis (14000) → aucune réduction nécessaire.
    assert infos["reductionSuggeree"] == 0
