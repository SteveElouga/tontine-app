"""Tests du moteur de prêts COMPOSÉS (modèle v2) — chiffres du doc 03, montants EXACTS.

Exécutable de deux façons :
  * pytest apps/core/domain/tests_interest_composes.py
  * python apps/core/domain/tests_interest_composes.py   (autonome, sans dépendance)
"""
from decimal import Decimal

try:
    from apps.core.domain.interest import (
        Cycle, Depot, interets_membre,
        cloture, echeancier_pret, dette_finale, total_interets_pret,
        total_excedent, repartir_paiement,
    )
except ImportError:  # exécution directe depuis le dossier domain/
    from interest import (
        Cycle, Depot, interets_membre,
        cloture, echeancier_pret, dette_finale, total_interets_pret,
        total_excedent, repartir_paiement,
    )

CYCLE = Cycle()  # 9 mois de dépôt, clôture juin (position 10), taux 5 %


def test_cloture_juin():
    assert cloture(CYCLE) == 10                       # sept + 9 = juin
    assert cloture(Cycle(duree_depot=6)) == 7


def test_exemple_A_jamais_rembourse():
    # 100 000 en septembre (position 1), aucun remboursement → 9 mois composés jusqu'en juin.
    lignes = echeancier_pret(100000, 1, {}, CYCLE)
    assert len(lignes) == 9
    assert lignes[0].mois == 2 and lignes[-1].mois == 10   # octobre … juin
    assert lignes[0].interet == Decimal("5000")            # 5 % de 100 000
    # Échéancier exact ; seule la dette finale est arrondie à 1 décimale.
    assert lignes[-1].solde == Decimal("155132.8215978515625")
    assert dette_finale(100000, 1, {}, CYCLE) == Decimal("155132.8")


def test_exemple_B_paiement_octobre():
    # 20 000 payés en octobre : 5 000 d'intérêt + 15 000 de capital → solde 85 000.
    lignes = echeancier_pret(100000, 1, {2: 20000}, CYCLE)
    assert lignes[0].solde == Decimal("85000")
    assert dette_finale(100000, 1, {2: 20000}, CYCLE) == Decimal("125583.7")


def test_exemple_C_solde_en_mars():
    # Dépôts de 20 000 à chaque réunion (octobre..mars) → prêt soldé en mars.
    remb = {m: 20000 for m in range(2, 8)}  # positions 2..7 = oct..mars
    lignes = echeancier_pret(100000, 1, remb, CYCLE)
    mars = next(l for l in lignes if l.mois == 7)
    assert mars.solde == Decimal("0")
    assert mars.excedent == Decimal("2028.6921875")       # ligne exacte (dépasse le solde → épargne)
    assert dette_finale(100000, 1, remb, CYCLE) == Decimal("0")
    assert total_excedent(100000, 1, remb, CYCLE) == Decimal("2028.7")  # arrondi final à 1 décimale


def test_premier_mois_engage():
    # L'intérêt du 1er mois est dû dès le prêt : payer 100 000 en octobre laisse 5 000.
    assert echeancier_pret(100000, 1, {2: 100000}, CYCLE)[0].solde == Decimal("5000")
    # Payer le solde exact (105 000) en octobre solde le prêt.
    assert dette_finale(100000, 1, {2: 105000}, CYCLE) == Decimal("0")


def test_arret_en_juin():
    # Un prêt de mai (position 9) ne court qu'un mois (juin).
    lignes = echeancier_pret(100000, 9, {}, CYCLE)
    assert len(lignes) == 1 and lignes[0].mois == 10
    assert dette_finale(100000, 9, {}, CYCLE) == Decimal("105000")


def test_remboursement_apres_cloture():
    # Après juin, la dette est FIGÉE : un versement de juillet/août la réduit SANS intérêt.
    # Sans remboursement tardif, l'échéancier s'arrête toujours à juin (pas de lignes vides).
    assert len(echeancier_pret(100000, 1, {}, CYCLE)) == 9
    # 50 000 remboursés en août (position 12) sur un prêt de septembre.
    lignes = echeancier_pret(100000, 1, {12: 50000}, CYCLE)
    aout = lignes[-1]
    assert aout.mois == 12 and aout.interet == Decimal("0") and aout.paiement == Decimal("50000")
    # Dette d'août = dette figée de juin (155 132,8) − 50 000, aucun intérêt en juillet/août.
    assert dette_finale(100000, 1, {12: 50000}, CYCLE) == Decimal("105132.8")
    # Les intérêts totaux restent ceux d'un prêt jamais remboursé (août ne majore pas).
    assert total_interets_pret(100000, 1, {12: 50000}, CYCLE) == total_interets_pret(100000, 1, {}, CYCLE)
    # Remboursement en septembre (position 13 = le délai) : accepté, toujours sans intérêt.
    assert dette_finale(100000, 1, {13: 50000}, CYCLE) == Decimal("105132.8")
    # Au-delà du délai (position 14) : refusé.
    try:
        echeancier_pret(100000, 1, {14: 10000}, CYCLE)
        assert False, "remboursement au mois 14 aurait dû lever ValueError"
    except ValueError:
        pass


def test_taux_parametrable():
    c = Cycle(taux_majoration=Decimal("0.10"))
    assert dette_finale(100000, 9, {}, c) == Decimal("110000")  # 1 mois à 10 %


def test_repartir_plus_ancien_dabord():
    # 30 000 sur deux prêts (soldes 20 000 puis 50 000) : solde le plus ancien, reste sur l'autre.
    imputes, reste = repartir_paiement(30000, [Decimal("20000"), Decimal("50000")])
    assert imputes == [Decimal("20000"), Decimal("10000")] and reste == Decimal("0")
    # Sur-versement : tout est soldé, le reste part en épargne.
    imputes, reste = repartir_paiement(80000, [Decimal("20000"), Decimal("50000")])
    assert imputes == [Decimal("20000"), Decimal("50000")] and reste == Decimal("10000")


def test_mois_pret_invalide():
    for mp in (0, 10, 11):  # avant le cycle, ou en/au-delà de la clôture
        try:
            echeancier_pret(100000, mp, {}, CYCLE)
            assert False, f"mois_pret={mp} aurait dû lever ValueError"
        except ValueError:
            pass


def test_epargnant_pur_inchange():
    # Rappel : l'épargne sans prêt ne change pas (100 000 en sept → 45 000 d'intérêts).
    assert interets_membre([Depot(1, Decimal("100000"))], CYCLE) == Decimal("45000")


def _run():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ✓ {t.__name__}")
    print(f"\n{len(tests)} tests passés.")


if __name__ == "__main__":
    _run()
