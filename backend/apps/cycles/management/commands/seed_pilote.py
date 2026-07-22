"""Seed de la caisse pilote (la caisse mutuelle de la trésorière pilote).

Crée, de façon idempotente : une caisse, un cycle 2025-2026 (septembre → mai, taux 5 %),
et 17 membres. L'option --demo ajoute quelques dépôts et un prêt pour voir le récapitulatif.

    python manage.py seed_pilote
    python manage.py seed_pilote --demo
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.cycles.models import Caisse, Cycle
from apps.loans.models import Loan
from apps.members.models import Member
from apps.savings.models import Deposit

NB_MEMBRES = 17

# Dépôts de démonstration : {n° de membre: [(mois_index, montant), ...]}  (1 = septembre)
DEMO_DEPOTS = {
    1: [(1, 100_000), (5, 50_000)],
    2: [(1, 50_000)],
    3: [(2, 75_000), (6, 25_000)],
    4: [(1, 30_000), (3, 30_000), (9, 30_000)],
}
# Prêt de démonstration : membre n°3, 50 000 pris en décembre (mois 4), remboursé en juillet (mois 11).
DEMO_PRET = dict(membre=3, montant=50_000, mois_pret=4, mois_remboursement=11)


class Command(BaseCommand):
    help = "Crée la caisse pilote, un cycle et 17 membres (idempotent). --demo ajoute des données d'exemple."

    def add_arguments(self, parser):
        parser.add_argument(
            "--demo",
            action="store_true",
            help="Ajoute des dépôts et un prêt d'exemple pour visualiser le récapitulatif.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        caisse, cree = Caisse.objects.get_or_create(nom="Caisse mutuelle (pilote)")
        self._log(caisse.nom, cree)

        cycle, cree = Cycle.objects.get_or_create(
            caisse=caisse,
            libelle="2025-2026",
            defaults=dict(
                mois_debut=9,
                duree_depot=9,
                mois_delai=12,
                taux_epargne=Decimal("0.05"),
                taux_majoration=Decimal("0.05"),
            ),
        )
        self._log(f"Cycle {cycle.libelle}", cree)

        membres = []
        for i in range(1, NB_MEMBRES + 1):
            membre, _ = Member.objects.get_or_create(caisse=caisse, nom=f"Membre {i:02d}")
            membres.append(membre)
        self.stdout.write(self.style.SUCCESS(f"✓ {len(membres)} membres."))

        if options["demo"]:
            self._seed_demo(cycle, membres)

        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO(f"cycle_id à utiliser dans GraphQL : {cycle.id}"))

    def _seed_demo(self, cycle, membres):
        for num, depots in DEMO_DEPOTS.items():
            for mois, montant in depots:
                Deposit.objects.update_or_create(
                    cycle=cycle,
                    member=membres[num - 1],
                    mois_index=mois,
                    defaults={"montant": Decimal(montant)},
                )
        Loan.objects.get_or_create(
            cycle=cycle,
            member=membres[DEMO_PRET["membre"] - 1],
            montant=Decimal(DEMO_PRET["montant"]),
            mois_pret=DEMO_PRET["mois_pret"],
            defaults={"mois_remboursement": DEMO_PRET["mois_remboursement"]},
        )
        self.stdout.write(self.style.SUCCESS("✓ Données de démonstration ajoutées (--demo)."))

    def _log(self, libelle, cree):
        etat = "créé" if cree else "déjà présent"
        self.stdout.write(self.style.SUCCESS(f"✓ {libelle} ({etat})."))
