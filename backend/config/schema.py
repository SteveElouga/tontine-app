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


schema = strawberry.Schema(query=Query, mutation=Mutation)
