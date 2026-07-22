"""Moteur de calcul de la caisse mutuelle — domaine pur (aucune dépendance Django).

Reproduit les règles vérifiées avec le porteur de projet et dans le classeur
`Caisse-Mutuelle-Calculatrice.xlsx` :

- Cycle : dépôts de septembre à mai (9 mois), remboursements jusqu'en août.
- Intérêt sur l'épargne : 5 % par mois restant jusqu'à la clôture, figé au mois du dépôt
  (septembre 45 %, octobre 40 % … mai 5 %). Les dépôts se cumulent.
- Majoration des prêts : 5 % du montant par mois de dette, jusqu'au remboursement
  (délai = août si non remboursé).

Les montants sont manipulés en `Decimal` (jamais de float pour de l'argent) et arrondis
au FCFA entier (pas de centimes).
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional, Protocol

# Indices de mois depuis le début du cycle : 1 = septembre … 9 = mai … 12 = août.
MOIS = {
    1: "Septembre", 2: "Octobre", 3: "Novembre", 4: "Décembre", 5: "Janvier",
    6: "Février", 7: "Mars", 8: "Avril", 9: "Mai", 10: "Juin", 11: "Juillet", 12: "Août",
}


def _money(valeur) -> Decimal:
    """Convertit vers Decimal sans passer par float."""
    return valeur if isinstance(valeur, Decimal) else Decimal(str(valeur))


def _fcfa(valeur: Decimal) -> Decimal:
    """Arrondit au franc entier."""
    return _money(valeur).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Cycle:
    """Paramètres d'un cycle annuel de caisse. Tous paramétrables — jamais codés en dur."""
    mois_debut: int = 9          # 9 = septembre (informatif)
    duree_depot: int = 9         # nombre de mois de dépôt (septembre → mai)
    mois_delai: int = 12         # délai de remboursement des prêts (12 = août)
    taux_epargne: Decimal = Decimal("0.05")     # par mois restant jusqu'à la clôture
    taux_majoration: Decimal = Decimal("0.05")  # par mois de dette

    def __post_init__(self):
        if self.duree_depot < 1:
            raise ValueError("duree_depot doit être >= 1")
        if self.mois_delai < self.duree_depot:
            raise ValueError("mois_delai doit être >= duree_depot")


@dataclass(frozen=True)
class Depot:
    mois_index: int
    montant: Decimal


@dataclass(frozen=True)
class Pret:
    montant: Decimal
    mois_pret: int
    mois_remboursement: Optional[int] = None  # None => remboursé au délai


# --------------------------------------------------------------------------- #
# Épargne et intérêts
# --------------------------------------------------------------------------- #
def taux_a_la_cloture(mois_index: int, cycle: Cycle) -> Decimal:
    """Taux dégressif appliqué à un dépôt selon son mois (septembre 45 %, … mai 5 %)."""
    if not 1 <= mois_index <= cycle.duree_depot:
        raise ValueError(
            f"mois_index {mois_index} hors période de dépôt (1..{cycle.duree_depot})"
        )
    mois_restants = cycle.duree_depot - mois_index + 1
    return cycle.taux_epargne * mois_restants


def interet_depot(montant, mois_index: int, cycle: Cycle) -> Decimal:
    """Intérêt d'un dépôt unique."""
    return _fcfa(_money(montant) * taux_a_la_cloture(mois_index, cycle))


def total_depose(depots: Iterable[Depot]) -> Decimal:
    return _fcfa(sum((_money(d.montant) for d in depots), Decimal(0)))


def interets_membre(depots: Iterable[Depot], cycle: Cycle) -> Decimal:
    """Somme des intérêts de tous les dépôts d'un membre."""
    return _fcfa(sum((interet_depot(d.montant, d.mois_index, cycle) for d in depots), Decimal(0)))


def epargne_plus_interets(depots: Iterable[Depot], cycle: Cycle) -> Decimal:
    depots = list(depots)
    return _fcfa(total_depose(depots) + interets_membre(depots, cycle))


# --------------------------------------------------------------------------- #
# Prêts et majoration
# --------------------------------------------------------------------------- #
def mois_de_dette(pret: Pret, cycle: Cycle) -> int:
    """Nombre de mois pendant lesquels la dette court (jusqu'au délai si non remboursée)."""
    fin = pret.mois_remboursement if pret.mois_remboursement is not None else cycle.mois_delai
    duree = fin - pret.mois_pret
    if duree < 0:
        raise ValueError("Le remboursement ne peut pas précéder le prêt")
    return duree


def majoration_pret(pret: Pret, cycle: Cycle) -> Decimal:
    """Majoration = montant × taux × nombre de mois de dette."""
    return _fcfa(_money(pret.montant) * cycle.taux_majoration * mois_de_dette(pret, cycle))


def total_a_rembourser(pret: Pret, cycle: Cycle) -> Decimal:
    return _fcfa(_money(pret.montant) + majoration_pret(pret, cycle))


# --------------------------------------------------------------------------- #
# Position nette d'un membre à la clôture
# --------------------------------------------------------------------------- #
def position_nette(
    depots: Iterable[Depot],
    prets: Iterable[Pret],
    cycle: Cycle,
    repartition: "RepartitionInterets | None" = None,
) -> Decimal:
    """(épargne + intérêts) − (dettes + majorations)."""
    depots = list(depots)
    strategie = repartition or InteretsComplets()
    interets = strategie.interets(depots, cycle)
    epargne = total_depose(depots) + interets
    dettes = sum((total_a_rembourser(p, cycle) for p in prets), Decimal(0))
    return _fcfa(epargne - dettes)


# --------------------------------------------------------------------------- #
# Règle d'ajustement des intérêts — QUESTION OUVERTE (voir spec §5).
# Stratégie enfichable : la trésorière tranchera, on branche la bonne implémentation
# sans toucher au reste du code.
# --------------------------------------------------------------------------- #
class RepartitionInterets(Protocol):
    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal: ...


class InteretsComplets:
    """Règle par défaut : chaque membre touche tous ses intérêts promis."""

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        return interets_membre(depots, cycle)


class InteretsAuProrataDuPrete:
    """À ACTIVER si la trésorière répond « B » : on ne rémunère que la part réellement prêtée.

    `taux_prete` = (total prêté) / (total déposé) sur la caisse. À implémenter au niveau caisse
    une fois la règle confirmée.
    """

    def __init__(self, taux_prete: Decimal):
        self.taux_prete = _money(taux_prete)

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        return _fcfa(interets_membre(depots, cycle) * self.taux_prete)


# NB : la règle « C » (partage des majorations réellement encaissées au prorata des dépôts)
# se calcule au niveau de la caisse entière, pas du membre seul : à ajouter dans `reporting`
# quand la trésorière aura tranché.
