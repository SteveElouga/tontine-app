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
        position_nette, InteretsAuProrataDuPrete,
    )
except ImportError:  # exécution directe depuis le dossier domain/
    from interest import (
        Cycle, Depot, Pret, taux_a_la_cloture, interet_depot, interets_membre,
        epargne_plus_interets, mois_de_dette, majoration_pret, total_a_rembourser,
        position_nette, InteretsAuProrataDuPrete,
    )

CYCLE = Cycle()  # cycle standard : 9 mois de dépôt, délai août, taux 5 %


def test_taux_degressif():
    # Septembre (1) = 45 %, Mai (9) = 5 %
    assert taux_a_la_cloture(1, CYCLE) == Decimal("0.45")
    assert taux_a_la_cloture(2, CYCLE) == Decimal("0.40")
    assert taux_a_la_cloture(9, CYCLE) == Decimal("0.05")


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
    # Prêt en avril (8) non remboursé → délai août (12) → 4 mois → 15 000
    pret = Pret(Decimal("75000"), mois_pret=8, mois_remboursement=None)
    assert mois_de_dette(pret, CYCLE) == 4
    assert majoration_pret(pret, CYCLE) == Decimal("15000")


def test_position_nette():
    depots = [Depot(1, Decimal("100000"))]           # 145 000 épargne + intérêts
    prets = [Pret(Decimal("50000"), 1, 6)]           # 5 mois → maj 12 500 → 62 500 dû
    assert position_nette(depots, prets, CYCLE) == Decimal("145000") - Decimal("62500")


def test_repartition_prorata():
    # Règle B : si seulement 50 % de l'argent a été prêté, intérêts réduits de moitié
    depots = [Depot(1, Decimal("100000"))]
    strat = InteretsAuProrataDuPrete(Decimal("0.5"))
    assert strat.interets(depots, CYCLE) == Decimal("22500")


def _run():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ✓ {t.__name__}")
    print(f"\n{len(tests)} tests passés.")


if __name__ == "__main__":
    _run()
