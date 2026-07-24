"""Tests des modèles et de la commande de création du compte trésorière."""
from decimal import Decimal

import pytest


@pytest.mark.django_db
def test_to_params_reprend_les_reglages_du_cycle():
    from apps.cycles.models import Caisse, Cycle

    caisse = Caisse.objects.create(nom="Caisse test")
    cycle = Cycle.objects.create(caisse=caisse, libelle="2025-2026")
    params = cycle.to_params()

    assert params.mois_debut == 9
    assert params.duree_depot == 9
    assert params.mois_delai == 12
    assert params.taux_epargne == Decimal("0.05")
    assert params.taux_majoration == Decimal("0.05")


@pytest.mark.django_db
def test_creer_tresoriere_cree_le_compte():
    from django.contrib.auth import get_user_model
    from django.core.management import call_command

    call_command("creer_tresoriere", "--username", "therese", "--password", "mot-de-passe-123")

    user = get_user_model().objects.get(username="therese")
    assert user.is_active
    assert user.is_staff
    assert user.check_password("mot-de-passe-123")


@pytest.mark.django_db
def test_creer_tresoriere_met_a_jour_sans_dupliquer():
    from django.contrib.auth import get_user_model
    from django.core.management import call_command

    call_command("creer_tresoriere", "--username", "therese", "--password", "ancien-123")
    call_command("creer_tresoriere", "--username", "therese", "--password", "nouveau-456")

    User = get_user_model()
    assert User.objects.filter(username="therese").count() == 1
    assert User.objects.get(username="therese").check_password("nouveau-456")


@pytest.mark.django_db
def test_dette_composee_et_registre_de_remboursements():
    """Le prêt calcule sa dette composée à partir du registre de remboursements (docs/03)."""
    from apps.cycles.models import Caisse, Cycle
    from apps.loans.models import Loan, Remboursement
    from apps.members.models import Member

    caisse = Caisse.objects.create(nom="Caisse test")
    cycle = Cycle.objects.create(caisse=caisse, libelle="2025-2026")
    membre = Member.objects.create(caisse=caisse, nom="Awa")
    pret = Loan.objects.create(cycle=cycle, member=membre, montant=100000, mois_pret=1)

    # Sans remboursement → exemple A (dette finale arrondie à 1 décimale).
    assert pret.dette == Decimal("155132.8")
    assert pret.est_solde is False

    # Un remboursement de 20 000 en octobre (mois 2) → exemple B.
    Remboursement.objects.create(loan=pret, mois=2, montant=20000)
    assert pret.total_rembourse == Decimal("20000")
    assert pret.remboursements_par_mois() == {2: Decimal("20000")}
    assert pret.dette == Decimal("125583.7")
