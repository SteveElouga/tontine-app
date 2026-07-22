"""Schéma GraphQL racine (Strawberry).

Point d'entrée de l'API métier. Ici on expose une lecture : le récapitulatif d'un membre
sur un cycle (épargne, intérêts, dettes, position nette), calculé par le moteur de domaine.
Les mutations d'écriture (ajouter un dépôt, un prêt) sont amorcées et à compléter.
"""
from __future__ import annotations

from decimal import Decimal
from typing import List, Optional

import strawberry

from apps.core.domain import interest
from apps.cycles.models import Cycle
from apps.members.models import Member


@strawberry.type
class RecapMembre:
    id: strawberry.ID
    nom: str
    total_depose: Decimal
    interets: Decimal
    epargne_plus_interets: Decimal
    dettes: Decimal
    position_nette: Decimal


@strawberry.type
class MembreMontant:
    id: strawberry.ID
    nom: str
    montant: Decimal


@strawberry.type
class MontantMois:
    mois_index: int
    montant: Decimal


@strawberry.type
class Membre:
    id: strawberry.ID
    nom: str
    telephone: str
    actif: bool


def _membre(m: Member) -> "Membre":
    return Membre(id=strawberry.ID(str(m.id)), nom=m.nom, telephone=m.telephone, actif=m.actif)


@strawberry.type
class DepotDetail:
    mois_index: int
    montant: Decimal
    taux: Decimal
    interet: Decimal


@strawberry.type
class PretDetail:
    montant: Decimal
    mois_pret: int
    mois_remboursement: Optional[int]
    mois_de_dette: int
    majoration: Decimal
    total_a_rembourser: Decimal


@strawberry.type
class FicheMembre:
    id: strawberry.ID
    nom: str
    depots: List[DepotDetail]
    prets: List[PretDetail]
    total_depose: Decimal
    interets: Decimal
    epargne_plus_interets: Decimal
    dettes: Decimal
    position_nette: Decimal


def _recap_membre(member: Member, cycle: Cycle) -> RecapMembre:
    params = cycle.to_params()
    depots = [
        interest.Depot(d.mois_index, d.montant)
        for d in member.depots.filter(cycle=cycle)
    ]
    prets = [
        interest.Pret(p.montant, p.mois_pret, p.mois_remboursement)
        for p in member.prets.filter(cycle=cycle)
    ]
    dettes = sum((interest.total_a_rembourser(p, params) for p in prets), Decimal(0))
    return RecapMembre(
        id=strawberry.ID(str(member.id)),
        nom=member.nom,
        total_depose=interest.total_depose(depots),
        interets=interest.interets_membre(depots, params),
        epargne_plus_interets=interest.epargne_plus_interets(depots, params),
        dettes=dettes,
        position_nette=interest.position_nette(depots, prets, params),
    )


@strawberry.type
class Pret:
    id: strawberry.ID
    membre_id: strawberry.ID
    nom: str
    montant: Decimal
    mois_pret: int
    mois_remboursement: Optional[int]
    mois_de_dette: int
    majoration: Decimal
    total_a_rembourser: Decimal
    rembourse: bool


def _pret(loan) -> "Pret":
    return Pret(
        id=strawberry.ID(str(loan.id)),
        membre_id=strawberry.ID(str(loan.member_id)),
        nom=loan.member.nom,
        montant=loan.montant,
        mois_pret=loan.mois_pret,
        mois_remboursement=loan.mois_remboursement,
        mois_de_dette=loan.mois_de_dette,
        majoration=loan.majoration,
        total_a_rembourser=loan.total_a_rembourser,
        rembourse=loan.mois_remboursement is not None,
    )


@strawberry.type
class Query:
    @strawberry.field
    def sante(self) -> str:
        """Sonde simple pour vérifier que l'API répond."""
        return "ok"

    @strawberry.field
    def recap_cycle(self, cycle_id: strawberry.ID) -> List[RecapMembre]:
        """Récapitulatif de tous les membres d'un cycle."""
        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        membres = Member.objects.filter(caisse=cycle.caisse, actif=True)
        return [_recap_membre(m, cycle) for m in membres]

    @strawberry.field
    def depots_mois(self, cycle_id: strawberry.ID, mois_index: int) -> List[MembreMontant]:
        """Pour un mois donné, le montant déposé par chaque membre (0 si aucun)."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        depots = {
            d.member_id: d.montant
            for d in Deposit.objects.filter(cycle=cycle, mois_index=mois_index)
        }
        membres = Member.objects.filter(caisse=cycle.caisse, actif=True)
        return [
            MembreMontant(id=strawberry.ID(str(m.id)), nom=m.nom, montant=depots.get(m.id, Decimal(0)))
            for m in membres
        ]

    @strawberry.field
    def depots_membre(self, cycle_id: strawberry.ID, member_id: strawberry.ID) -> List[MontantMois]:
        """Pour un membre donné, le montant déposé à chaque mois du cycle (0 si aucun)."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        depots = {
            d.mois_index: d.montant
            for d in Deposit.objects.filter(cycle=cycle, member_id=member_id)
        }
        return [
            MontantMois(mois_index=m, montant=depots.get(m, Decimal(0)))
            for m in range(1, cycle.duree_depot + 1)
        ]

    @strawberry.field
    def membres(self, cycle_id: strawberry.ID) -> List[Membre]:
        """Liste des membres actifs de la caisse du cycle."""
        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        return [_membre(m) for m in Member.objects.filter(caisse=cycle.caisse, actif=True)]

    @strawberry.field
    def fiche_membre(self, cycle_id: strawberry.ID, member_id: strawberry.ID) -> FicheMembre:
        """Détail complet d'un membre : comment on arrive à son montant à la clôture."""
        from apps.savings.models import Deposit
        from apps.loans.models import Loan

        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        member = Member.objects.get(id=member_id)
        params = cycle.to_params()

        deposits = list(Deposit.objects.filter(cycle=cycle, member=member).order_by("mois_index"))
        loans = list(Loan.objects.filter(cycle=cycle, member=member).order_by("mois_pret"))

        depots_detail = [
            DepotDetail(
                mois_index=d.mois_index,
                montant=d.montant,
                taux=interest.taux_a_la_cloture(d.mois_index, params),
                interet=interest.interet_depot(d.montant, d.mois_index, params),
            )
            for d in deposits
        ]
        prets_detail = [
            PretDetail(
                montant=loan.montant,
                mois_pret=loan.mois_pret,
                mois_remboursement=loan.mois_remboursement,
                mois_de_dette=loan.mois_de_dette,
                majoration=loan.majoration,
                total_a_rembourser=loan.total_a_rembourser,
            )
            for loan in loans
        ]

        depots_domain = [interest.Depot(d.mois_index, d.montant) for d in deposits]
        prets_domain = [
            interest.Pret(loan.montant, loan.mois_pret, loan.mois_remboursement) for loan in loans
        ]
        dettes = sum((interest.total_a_rembourser(p, params) for p in prets_domain), Decimal(0))

        return FicheMembre(
            id=strawberry.ID(str(member.id)),
            nom=member.nom,
            depots=depots_detail,
            prets=prets_detail,
            total_depose=interest.total_depose(depots_domain),
            interets=interest.interets_membre(depots_domain, params),
            epargne_plus_interets=interest.epargne_plus_interets(depots_domain, params),
            dettes=dettes,
            position_nette=interest.position_nette(depots_domain, prets_domain, params),
        )

    @strawberry.field
    def prets_cycle(self, cycle_id: strawberry.ID) -> List[Pret]:
        """Tous les prêts d'un cycle (montant, majoration, total, statut)."""
        from apps.loans.models import Loan

        loans = (
            Loan.objects.filter(cycle_id=cycle_id)
            .select_related("member", "cycle")
            .order_by("member__nom", "mois_pret")
        )
        return [_pret(loan) for loan in loans]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def ajouter_depot(
        self, cycle_id: strawberry.ID, member_id: strawberry.ID, mois_index: int, montant: Decimal
    ) -> RecapMembre:
        """Enregistre un dépôt puis renvoie le récap à jour du membre. (À sécuriser : auth/rôles.)"""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        member = Member.objects.get(id=member_id)
        Deposit.objects.update_or_create(
            cycle=cycle, member=member, mois_index=mois_index,
            defaults={"montant": montant},
        )
        return _recap_membre(member, cycle)

    @strawberry.mutation
    def ajouter_membre(self, cycle_id: strawberry.ID, nom: str, telephone: str = "") -> Membre:
        """Ajoute un membre à la caisse du cycle."""
        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        m = Member.objects.create(caisse=cycle.caisse, nom=nom, telephone=telephone)
        return _membre(m)

    @strawberry.mutation
    def renommer_membre(self, member_id: strawberry.ID, nom: str) -> Membre:
        """Renomme un membre."""
        m = Member.objects.get(id=member_id)
        m.nom = nom
        m.save(update_fields=["nom"])
        return _membre(m)

    @strawberry.mutation
    def retirer_membre(self, member_id: strawberry.ID) -> bool:
        """Désactive un membre (on ne supprime pas, pour garder l'historique des dépôts)."""
        m = Member.objects.get(id=member_id)
        m.actif = False
        m.save(update_fields=["actif"])
        return True

    @strawberry.mutation
    def ajouter_pret(
        self, cycle_id: strawberry.ID, member_id: strawberry.ID, montant: Decimal, mois_pret: int
    ) -> Pret:
        """Enregistre un prêt accordé à un membre par la caisse."""
        from apps.loans.models import Loan

        cycle = Cycle.objects.get(id=cycle_id)
        member = Member.objects.get(id=member_id)
        loan = Loan.objects.create(cycle=cycle, member=member, montant=montant, mois_pret=mois_pret)
        loan.cycle = cycle
        loan.member = member
        return _pret(loan)

    @strawberry.mutation
    def rembourser_pret(
        self, pret_id: strawberry.ID, mois_remboursement: Optional[int] = None
    ) -> Pret:
        """Marque un prêt remboursé (mois indiqué ; vide = au délai d'août)."""
        from apps.loans.models import Loan

        loan = Loan.objects.select_related("member", "cycle").get(id=pret_id)
        loan.mois_remboursement = mois_remboursement
        loan.save(update_fields=["mois_remboursement"])
        return _pret(loan)


schema = strawberry.Schema(query=Query, mutation=Mutation)
