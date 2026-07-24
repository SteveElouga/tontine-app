"""Tests du moteur de calcul — chiffres vérifiés avec le porteur et dans le classeur Excel.

Exécutable de deux façons :
  * pytest apps/core/domain/tests_interest.py
  * python apps/core/domain/tests_interest.py   (mode autonome, sans dépendance)
"""
from decimal import Decimal

try:
    from apps.core.domain.interest import (
        Cycle, Depot, Pret, taux_a_la_cloture, interet_depot, interets_membre,
        epargne_plus_interets, mois_de_dette, majoration_pret, total_a_rembourser,
        total_majorations, position_nette,
        InteretsReductionMois, InteretsEquitableProrata, InteretsEquitableEgal,
        suggerer_reduction_mois,
    )
except ImportError:  # exécution directe depuis le dossier domain/
    from interest import (
        Cycle, Depot, Pret, taux_a_la_cloture, interet_depot, interets_membre,
        epargne_plus_interets, mois_de_dette, majoration_pret, total_a_rembourser,
        total_majorations, position_nette,
        InteretsReductionMois, InteretsEquitableProrata, InteretsEquitableEgal,
        suggerer_reduction_mois,
    )

CYCLE = Cycle()  # cycle standard : 9 mois de dépôt, délai août, taux 5 %


def test_taux_degressif():
    # Septembre (1) = 45 %, Mai (9) = 5 % ; de juin au délai (sept.) le dépôt reste possible à 0 %.
    assert taux_a_la_cloture(1, CYCLE) == Decimal("0.45")
    assert taux_a_la_cloture(2, CYCLE) == Decimal("0.40")
    assert taux_a_la_cloture(9, CYCLE) == Decimal("0.05")
    assert taux_a_la_cloture(10, CYCLE) == Decimal("0")   # juin : 0 %
    assert taux_a_la_cloture(11, CYCLE) == Decimal("0")   # juillet : 0 %
    assert taux_a_la_cloture(13, CYCLE) == Decimal("0")   # septembre (délai) : 0 %
    try:
        taux_a_la_cloture(14, CYCLE)  # au-delà du délai : hors période
        assert False, "mois 14 aurait dû lever ValueError"
    except ValueError:
        pass


def test_interet_depot_septembre():
    # 100 000 déposés en septembre → 45 000 d'intérêt
    assert interet_depot(100_000, 1, CYCLE) == Decimal("45000")


def test_interet_depot_fevrier():
    # Février = mois 6 → (9-6+1)=4 mois restants → 20 %
    assert interet_depot(100_000, 6, CYCLE) == Decimal("20000")


def test_epargne_plus_interets_cumul():
    # Dépôts cumulés : 100k en sept (45%) + 50k en janvier (mois 5 → 25%)
    depots = [Depot(1, Decimal("100000")), Depot(5, Decimal("50000"))]
    assert interets_membre(depots, CYCLE) == Decimal("45000") + Decimal("12500")
    assert epargne_plus_interets(depots, CYCLE) == Decimal("150000") + Decimal("57500")


def test_majoration_pret_rembourse():
    # 100 000 empruntés en février (6), remboursés en août (12) → 6 mois → 30 000
    pret = Pret(Decimal("100000"), mois_pret=6, mois_remboursement=12)
    assert mois_de_dette(pret, CYCLE) == 6
    assert majoration_pret(pret, CYCLE) == Decimal("30000")
    assert total_a_rembourser(pret, CYCLE) == Decimal("130000")


def test_pret_non_rembourse_utilise_le_delai():
    # Prêt en avril (8) non remboursé → délai septembre (13) → 5 mois → 18 750
    pret = Pret(Decimal("75000"), mois_pret=8, mois_remboursement=None)
    assert mois_de_dette(pret, CYCLE) == 5
    assert majoration_pret(pret, CYCLE) == Decimal("18750")


def test_position_nette():
    depots = [Depot(1, Decimal("100000"))]           # 145 000 épargne + intérêts
    prets = [Pret(Decimal("50000"), 1, 6)]           # 5 mois → maj 12 500 → 62 500 dû
    assert position_nette(depots, prets, CYCLE) == Decimal("145000") - Decimal("62500")


def test_reduction_mois():
    # Mode 2 (−3 mois). Awa : 100k sept (9 mois) ; Béa : 100k février (mois 6 → 4 mois).
    awa = [Depot(1, Decimal("100000"))]
    bea = [Depot(6, Decimal("100000"))]
    strat = InteretsReductionMois(3)
    assert strat.interets(awa, CYCLE) == Decimal("30000")  # 6 mois → 30 %
    assert strat.interets(bea, CYCLE) == Decimal("5000")   # 1 mois → 5 %


def test_reduction_mois_plancher_zero():
    # Dépôt d'avril (mois 8 → 2 mois) avec −3 mois → 0 (pas d'intérêt négatif).
    avril = [Depot(8, Decimal("100000"))]
    assert InteretsReductionMois(3).interets(avril, CYCLE) == Decimal("0")


def test_equitable_prorata():
    # Mode 3a : gains 30 000, Awa a déposé 200k, Béa 100k (total 300k).
    awa = [Depot(1, Decimal("200000"))]
    bea = [Depot(6, Decimal("100000"))]
    strat = InteretsEquitableProrata(Decimal("30000"), Decimal("300000"))
    assert strat.interets(awa, CYCLE) == Decimal("20000")  # 30000 × 200/300
    assert strat.interets(bea, CYCLE) == Decimal("10000")  # 30000 × 100/300


def test_equitable_egal():
    # Mode 3b : gains 30 000, 3 épargnants → 10 000 chacun ; un non-épargnant → 0.
    strat = InteretsEquitableEgal(Decimal("30000"), 3)
    assert strat.interets([Depot(1, Decimal("100000"))], CYCLE) == Decimal("10000")
    assert strat.interets([], CYCLE) == Decimal("0")


def test_total_majorations():
    prets = [Pret(Decimal("100000"), 6, 12), Pret(Decimal("50000"), 1, 6)]
    assert total_majorations(prets, CYCLE) == Decimal("42500")  # 30 000 + 12 500


def test_suggerer_reduction_mois():
    # Awa 100k sept (complet 45 000) ; gains encaissés 30 000 → il faut retrancher 3 mois.
    tous = [Depot(1, Decimal("100000"))]
    prets = [Pret(Decimal("100000"), 6, 12)]  # majoration 30 000
    assert total_majorations(prets, CYCLE) == Decimal("30000")
    assert suggerer_reduction_mois(tous, prets, CYCLE) == 3


def _run():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ✓ {t.__name__}")
    print(f"\n{len(tests)} tests passés.")


if __name__ == "__main__":
    _run()
