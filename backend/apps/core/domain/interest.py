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
from decimal import Decimal, ROUND_HALF_UP, localcontext
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


def total_majorations(prets: Iterable[Pret], cycle: Cycle) -> Decimal:
    """Somme des majorations dues sur tous les prêts — les « gains » de la caisse à la clôture."""
    return _fcfa(sum((majoration_pret(p, cycle) for p in prets), Decimal(0)))


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
# Répartition des intérêts à la clôture — RÈGLE TRANCHÉE PAR LA TRÉSORIÈRE.
#
# Les années où tout n'a pas été prêté, la caisse encaisse peu de majorations et ne peut
# pas verser tous les intérêts promis. La trésorière choisit alors le mode :
#   1.  Complets ................ tout a été prêté ; chacun touche ses intérêts pleins.
#   2.  Réduction de N mois ..... on retranche le même N à chaque dépôt (elle fixe N) ;
#                                 favorise les dépôts anciens, les tardifs peuvent tomber à 0.
#   3a. Équitable au prorata .... les gains encaissés, partagés au prorata du montant déposé.
#   3b. Équitable en parts égales entre les épargnants.
# Modes enfichables : le récap et la position nette ne changent pas.
# --------------------------------------------------------------------------- #
class RepartitionInterets(Protocol):
    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal: ...


class InteretsComplets:
    """Mode 1 : chaque membre touche tous ses intérêts promis (barème dégressif complet)."""

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        return interets_membre(depots, cycle)


class InteretsReductionMois:
    """Mode 2 : on retranche le même nombre de mois à chaque dépôt (fixé par la trésorière).

    Un dépôt de septembre (9 mois) avec N=3 ne compte plus que 6 mois (30 %) ; un dépôt
    dont les mois tombent à 0 ou moins ne rapporte rien. Favorise les dépôts les plus anciens.
    """

    def __init__(self, nb_mois: int):
        if nb_mois < 0:
            raise ValueError("nb_mois doit être >= 0")
        self.nb_mois = nb_mois

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        total = Decimal(0)
        for d in depots:
            mois = (cycle.duree_depot - d.mois_index + 1) - self.nb_mois
            if mois > 0:
                total += _money(d.montant) * cycle.taux_epargne * mois
        return _fcfa(total)


class InteretsEquitableProrata:
    """Mode 3a : gains encaissés partagés au prorata du montant déposé (les mois sont ignorés).

    `gains` = majorations encaissées sur la caisse ; `total_depose_caisse` = somme déposée par tous.
    """

    def __init__(self, gains, total_depose_caisse):
        self.gains = _money(gains)
        self.total_depose_caisse = _money(total_depose_caisse)

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        if self.total_depose_caisse <= 0:
            return Decimal(0)
        depose = sum((_money(d.montant) for d in depots), Decimal(0))
        return _fcfa(self.gains * depose / self.total_depose_caisse)


class InteretsEquitableEgal:
    """Mode 3b : gains encaissés partagés en parts égales entre les épargnants.

    `gains` = majorations encaissées ; `nb_epargnants` = nombre de membres ayant déposé.
    """

    def __init__(self, gains, nb_epargnants: int):
        self.gains = _money(gains)
        self.nb_epargnants = nb_epargnants

    def interets(self, depots: Iterable[Depot], cycle: Cycle) -> Decimal:
        depots = list(depots)
        if self.nb_epargnants <= 0 or not depots:
            return Decimal(0)
        return _fcfa(self.gains / self.nb_epargnants)


def suggerer_reduction_mois(
    tous_depots: Iterable[Depot], prets: Iterable[Pret], cycle: Cycle
) -> int:
    """Plus petit N tel que le total des intérêts (réduits de N mois) <= majorations encaissées.

    Aide la trésorière : le total distribué ne dépasse pas ce que la caisse a réellement gagné.
    Elle reste libre de choisir un autre N.
    """
    tous_depots = list(tous_depots)
    gains = total_majorations(prets, cycle)
    for n in range(0, cycle.duree_depot + 1):
        if InteretsReductionMois(n).interets(tous_depots, cycle) <= gains:
            return n
    return cycle.duree_depot


# --------------------------------------------------------------------------- #
# Prêts — intérêts COMPOSÉS sur solde dégressif (modèle v2).
#
# Réf. docs/03-modele-prets-composes.md. Règles tranchées avec la trésorière :
#   - 5 % par mois (taux_majoration) COMPOSÉ sur le solde restant ;
#   - l'intérêt du 1er mois est engagé dès le prêt (au moins un mois) ;
#   - remboursements partiels à chaque réunion (paient l'intérêt d'abord, puis le capital) ;
#   - les prêts s'arrêtent à la clôture (juin = durée de dépôt + 1) ;
#   - AUCUN arrondi : tous les montants sont EXACTS (Decimal pleine précision) ;
#   - plusieurs prêts d'un membre : on rembourse le plus ancien d'abord.
# --------------------------------------------------------------------------- #
_PREC_EXACTE = 50  # précision suffisante pour garder l'exactitude des puissances de 1,05
_ARRONDI_FINAL = Decimal("0.1")  # le montant final est arrondi à une décimale (choix trésorière)


def arrondi_final(montant) -> Decimal:
    """Arrondit un montant FINAL à une décimale (ROUND_HALF_UP).

    Le calcul reste exact en interne ; on n'arrondit qu'à la sortie (dette de juin, total, excédent).
    """
    return _money(montant).quantize(_ARRONDI_FINAL, rounding=ROUND_HALF_UP)


def cloture(cycle: Cycle) -> int:
    """Position de la réunion de clôture (juin) = durée de dépôt + 1 ; les prêts s'y arrêtent."""
    return cycle.duree_depot + 1


@dataclass(frozen=True)
class LigneEcheance:
    """Une réunion dans la vie d'un prêt. Montants exacts, non arrondis."""
    mois: int          # position de la réunion (mois_pret+1 … clôture)
    interet: Decimal   # intérêt du mois = solde d'ouverture × taux
    paiement: Decimal  # part du versement imputée au prêt
    excedent: Decimal  # part du versement au-delà du solde (→ épargne)
    solde: Decimal     # solde restant après cette réunion


def echeancier_pret(montant, mois_pret: int, remboursements=None, cycle: Optional[Cycle] = None):
    """Déroule un prêt réunion par réunion, du mois suivant le prêt jusqu'à la clôture (juin).

    `remboursements` : dict {position_reunion: montant versé}. Un versement paie d'abord
    l'intérêt du mois puis le capital ; ce qui dépasse le solde devient un excédent (→ épargne).
    Aucun arrondi : tout est exact. Renvoie la liste des `LigneEcheance`.
    """
    cycle = cycle or Cycle()
    fin = cloture(cycle)
    if not 1 <= mois_pret < fin:
        raise ValueError(f"mois_pret {mois_pret} hors période de prêt (1..{fin - 1})")
    versements = {int(m): _money(v) for m, v in (remboursements or {}).items()}
    lignes = []
    with localcontext() as ctx:
        ctx.prec = _PREC_EXACTE
        solde = _money(montant)
        for m in range(mois_pret + 1, fin + 1):
            interet = solde * cycle.taux_majoration
            solde = solde + interet
            verse = versements.get(m, Decimal(0))
            impute = verse if verse < solde else solde
            excedent = verse - impute
            solde = solde - impute
            lignes.append(LigneEcheance(m, interet, impute, excedent, solde))
    return lignes


def dette_finale(montant, mois_pret: int, remboursements=None, cycle: Optional[Cycle] = None) -> Decimal:
    """Solde restant à la clôture (juin) : la dette finale d'un prêt, exacte."""
    lignes = echeancier_pret(montant, mois_pret, remboursements, cycle)
    return arrondi_final(lignes[-1].solde if lignes else _money(montant))


def total_interets_pret(montant, mois_pret: int, remboursements=None, cycle: Optional[Cycle] = None) -> Decimal:
    """Somme exacte des intérêts composés facturés sur la vie du prêt."""
    lignes = echeancier_pret(montant, mois_pret, remboursements, cycle)
    with localcontext() as ctx:
        ctx.prec = _PREC_EXACTE
        return arrondi_final(sum((l.interet for l in lignes), Decimal(0)))


def total_excedent(montant, mois_pret: int, remboursements=None, cycle: Optional[Cycle] = None) -> Decimal:
    """Somme exacte des excédents de versement (au-delà du solde) → à reverser en épargne."""
    lignes = echeancier_pret(montant, mois_pret, remboursements, cycle)
    with localcontext() as ctx:
        ctx.prec = _PREC_EXACTE
        return arrondi_final(sum((l.excedent for l in lignes), Decimal(0)))


def repartir_paiement(montant, soldes):
    """Répartit un versement sur des prêts, du plus ancien au plus récent (décision trésorière).

    `soldes` : soldes courants des prêts, ordonnés (plus ancien d'abord).
    Renvoie (liste des montants imputés à chaque prêt, reste). Le reste (tous soldés) va en épargne.
    """
    with localcontext() as ctx:
        ctx.prec = _PREC_EXACTE
        reste = _money(montant)
        imputes = []
        for s in soldes:
            s = _money(s)
            a = s if s < reste else reste
            imputes.append(a)
            reste = reste - a
        return imputes, reste
