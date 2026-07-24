"""Schéma GraphQL racine (Strawberry).

Point d'entrée de l'API métier. Ici on expose une lecture : le récapitulatif d'un membre
sur un cycle (épargne, intérêts, dettes, position nette), calculé par le moteur de domaine.
Les mutations d'écriture (ajouter un dépôt, un prêt) sont amorcées et à compléter.
"""
from __future__ import annotations

import datetime
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
    date: Optional[str] = None  # ISO du jour de la saisie (None si aucun dépôt)


@strawberry.type
class MontantMois:
    mois_index: int
    montant: Decimal
    date: Optional[str] = None  # ISO du jour de la saisie (None si aucun dépôt)


@strawberry.type
class Membre:
    id: strawberry.ID
    nom: str
    telephone: str
    actif: bool


def _membre(m: Member) -> "Membre":
    return Membre(id=strawberry.ID(str(m.id)), nom=m.nom, telephone=m.telephone, actif=m.actif)


@strawberry.type
class CycleInfo:
    id: strawberry.ID
    libelle: str
    caisse_nom: str
    statut: str
    mois_debut: int
    duree_depot: int
    mois_delai: int


@strawberry.type
class Operation:
    type: str  # "depot" | "pret" | "remboursement"
    date: str  # ISO du moment de saisie (pour tri et affichage)
    membre_nom: str
    montant: Decimal
    mois: int  # mois du dépôt, du prêt ou du remboursement


@strawberry.type
class NoteSeance:
    """Une note libre de séance (cahier de la trésorière)."""
    mois: int
    texte: str
    modifie_le: str  # ISO du dernier enregistrement


@strawberry.type
class SimEpargne:
    taux: Decimal
    interet: Decimal
    total: Decimal


@strawberry.type
class SimPret:
    mois_de_dette: int
    majoration: Decimal
    total: Decimal


@strawberry.type
class DepotDetail:
    mois_index: int
    montant: Decimal
    taux: Decimal
    interet: Decimal


@strawberry.type
class LigneEcheance:
    """Une réunion dans la vie d'un prêt composé (montants exacts, réf. docs/03)."""
    mois: int
    interet: Decimal
    paiement: Decimal
    solde: Decimal


@strawberry.type
class PretDetail:
    montant: Decimal
    mois_pret: int
    solde: Decimal
    total_interets: Decimal
    total_rembourse: Decimal
    echeancier: List[LigneEcheance]


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


def _strategie_cloture(cycle: Cycle, mode: str, n_mois: int):
    """Stratégie de répartition des intérêts selon le mode choisi à la clôture."""
    params = cycle.to_params()
    if mode == "reduction":
        return interest.InteretsReductionMois(max(n_mois, 0))
    if mode in ("prorata", "egal"):
        from apps.savings.models import Deposit
        from apps.loans.models import Loan

        gains = Decimal(0)
        for loan in Loan.objects.filter(cycle=cycle):
            loan.cycle = cycle
            gains += loan.total_interets_composes
        if mode == "prorata":
            total = sum((d.montant for d in Deposit.objects.filter(cycle=cycle)), Decimal(0))
            return interest.InteretsEquitableProrata(gains, total)
        nb = Deposit.objects.filter(cycle=cycle).values("member").distinct().count()
        return interest.InteretsEquitableEgal(gains, nb)
    return interest.InteretsComplets()


def _recap_membre(member: Member, cycle: Cycle, strategie=None) -> RecapMembre:
    params = cycle.to_params()
    depots = [
        interest.Depot(d.mois_index, d.montant)
        for d in member.depots.filter(cycle=cycle)
    ]
    # Dette v2 : somme des soldes composés (à partir du registre de remboursements).
    dettes = Decimal(0)
    for loan in member.prets.filter(cycle=cycle):
        loan.cycle = cycle
        dettes += loan.dette
    strategie = strategie or interest.InteretsComplets()
    interets = strategie.interets(depots, params)
    total_depose = interest.total_depose(depots)
    epargne_plus_interets = total_depose + interets
    return RecapMembre(
        id=strawberry.ID(str(member.id)),
        nom=member.nom,
        total_depose=total_depose,
        interets=interets,
        epargne_plus_interets=epargne_plus_interets,
        dettes=dettes,
        position_nette=epargne_plus_interets - dettes,
    )


@strawberry.type
class Pret:
    id: strawberry.ID
    membre_id: strawberry.ID
    nom: str
    montant: Decimal
    mois_pret: int
    solde: Decimal
    total_interets: Decimal
    total_rembourse: Decimal


def _echeancier(loan) -> "List[LigneEcheance]":
    """Déroulé composé d'un prêt (une ligne par réunion)."""
    return [
        LigneEcheance(mois=l.mois, interet=l.interet, paiement=l.paiement, solde=l.solde)
        for l in loan.echeancier_compose()
    ]


def _pret(loan) -> "Pret":
    return Pret(
        id=strawberry.ID(str(loan.id)),
        membre_id=strawberry.ID(str(loan.member_id)),
        nom=loan.member.nom,
        montant=loan.montant,
        mois_pret=loan.mois_pret,
        solde=loan.dette,
        total_interets=loan.total_interets_composes,
        total_rembourse=loan.total_rembourse,
    )


@strawberry.type
class InfosCloture:
    gains: Decimal            # majorations réellement encaissées
    total_promis: Decimal     # intérêts complets dus (mode 1)
    reduction_suggeree: int   # N suggéré pour que le total <= gains


@strawberry.type
class ParametresCycle:
    id: strawberry.ID
    libelle: str
    statut: str
    caisse_nom: str
    mois_debut: int
    duree_depot: int
    mois_delai: int
    taux_epargne: Decimal
    taux_majoration: Decimal


def _params_cycle(c: Cycle) -> "ParametresCycle":
    return ParametresCycle(
        id=strawberry.ID(str(c.id)),
        libelle=c.libelle,
        statut=c.statut,
        caisse_nom=c.caisse.nom,
        mois_debut=c.mois_debut,
        duree_depot=c.duree_depot,
        mois_delai=c.mois_delai,
        taux_epargne=c.taux_epargne,
        taux_majoration=c.taux_majoration,
    )


@strawberry.type
class Query:
    @strawberry.field
    def sante(self) -> str:
        """Sonde simple pour vérifier que l'API répond."""
        return "ok"

    @strawberry.field
    def recap_cycle(
        self, cycle_id: strawberry.ID, mode: str = "complet", n_mois: int = 0
    ) -> List[RecapMembre]:
        """Récap de tous les membres selon le mode de répartition des intérêts à la clôture.

        mode : "complet" | "reduction" (avec n_mois) | "prorata" | "egal".
        """
        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        strategie = _strategie_cloture(cycle, mode, n_mois)
        membres = Member.objects.filter(caisse=cycle.caisse, actif=True)
        return [_recap_membre(m, cycle, strategie) for m in membres]

    @strawberry.field
    def infos_cloture(self, cycle_id: strawberry.ID) -> InfosCloture:
        """Contexte de clôture : majorations encaissées, intérêts promis, réduction suggérée."""
        from apps.savings.models import Deposit
        from apps.loans.models import Loan

        cycle = Cycle.objects.get(id=cycle_id)
        params = cycle.to_params()
        depots = [interest.Depot(d.mois_index, d.montant) for d in Deposit.objects.filter(cycle=cycle)]
        # Gains v2 = intérêts composés réellement facturés sur les prêts.
        gains = Decimal(0)
        for loan in Loan.objects.filter(cycle=cycle):
            loan.cycle = cycle
            gains += loan.total_interets_composes
        # Plus petit N tel que les intérêts (réduits de N mois) tiennent dans les gains.
        reduction = params.duree_depot
        for k in range(0, params.duree_depot + 1):
            if interest.InteretsReductionMois(k).interets(depots, params) <= gains:
                reduction = k
                break
        return InfosCloture(
            gains=gains,
            total_promis=interest.interets_membre(depots, params),
            reduction_suggeree=reduction,
        )

    @strawberry.field
    def depots_mois(self, cycle_id: strawberry.ID, mois_index: int) -> List[MembreMontant]:
        """Pour un mois donné, le montant déposé par chaque membre (0 si aucun)."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        depots = {
            d.member_id: d
            for d in Deposit.objects.filter(cycle=cycle, mois_index=mois_index)
        }
        membres = Member.objects.filter(caisse=cycle.caisse, actif=True)
        return [
            MembreMontant(
                id=strawberry.ID(str(m.id)),
                nom=m.nom,
                montant=depots[m.id].montant if m.id in depots else Decimal(0),
                date=depots[m.id].date_operation.isoformat() if m.id in depots else None,
            )
            for m in membres
        ]

    @strawberry.field
    def depots_membre(self, cycle_id: strawberry.ID, member_id: strawberry.ID) -> List[MontantMois]:
        """Pour un membre donné, le montant déposé à chaque mois du cycle (0 si aucun)."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        depots = {
            d.mois_index: d
            for d in Deposit.objects.filter(cycle=cycle, member_id=member_id)
        }
        return [
            MontantMois(
                mois_index=m,
                montant=depots[m].montant if m in depots else Decimal(0),
                date=depots[m].date_operation.isoformat() if m in depots else None,
            )
            for m in range(1, cycle.duree_depot + 2)  # +1 : inclut juin (dépôt à 0 %)
        ]

    @strawberry.field
    def membres(self, cycle_id: strawberry.ID) -> List[Membre]:
        """Liste des membres actifs de la caisse du cycle."""
        cycle = Cycle.objects.select_related("caisse").get(id=cycle_id)
        return [_membre(m) for m in Member.objects.filter(caisse=cycle.caisse, actif=True)]

    @strawberry.field
    def cycles(self) -> List[CycleInfo]:
        """Liste des cycles (toutes caisses) pour le sélecteur de cycle courant."""
        return [
            CycleInfo(
                id=strawberry.ID(str(c.id)),
                libelle=c.libelle,
                caisse_nom=c.caisse.nom,
                statut=c.statut,
                mois_debut=c.mois_debut,
                duree_depot=c.duree_depot,
                mois_delai=c.mois_delai,
            )
            for c in Cycle.objects.select_related("caisse").order_by("caisse__nom", "libelle")
        ]

    @strawberry.field
    def parametres_cycle(self, cycle_id: strawberry.ID) -> ParametresCycle:
        """Règles complètes d'un cycle (pour l'écran Paramètres)."""
        return _params_cycle(Cycle.objects.select_related("caisse").get(id=cycle_id))

    @strawberry.field
    def historique(self, cycle_id: strawberry.ID) -> List[Operation]:
        """Journal chronologique des opérations du cycle (dépôts + prêts)."""
        from apps.savings.models import Deposit
        from apps.loans.models import Loan, Remboursement

        cycle = Cycle.objects.get(id=cycle_id)
        ops: List[Operation] = []
        for d in Deposit.objects.filter(cycle=cycle).select_related("member"):
            ops.append(
                Operation(
                    type="depot",
                    date=d.saisi_le.isoformat(),
                    membre_nom=d.member.nom,
                    montant=d.montant,
                    mois=d.mois_index,
                )
            )
        for loan in Loan.objects.filter(cycle=cycle).select_related("member"):
            ops.append(
                Operation(
                    type="pret",
                    date=loan.cree_le.isoformat(),
                    membre_nom=loan.member.nom,
                    montant=loan.montant,
                    mois=loan.mois_pret,
                )
            )
        for r in Remboursement.objects.filter(loan__cycle=cycle).select_related("loan__member"):
            ops.append(
                Operation(
                    type="remboursement",
                    date=r.cree_le.isoformat(),
                    membre_nom=r.loan.member.nom,
                    montant=r.montant,
                    mois=r.mois,
                )
            )
        ops.sort(key=lambda o: o.date, reverse=True)
        return ops

    @strawberry.field
    def simuler_epargne(
        self, cycle_id: strawberry.ID, montant: Decimal, mois_index: int
    ) -> SimEpargne:
        """Projection d'un dépôt hypothétique à la clôture (moteur = source de vérité)."""
        params = Cycle.objects.get(id=cycle_id).to_params()
        taux = interest.taux_a_la_cloture(mois_index, params)
        interet = interest.interet_depot(montant, mois_index, params)
        return SimEpargne(taux=taux, interet=interet, total=montant + interet)

    @strawberry.field
    def simuler_pret(
        self, cycle_id: strawberry.ID, montant: Decimal, mois_pret: int
    ) -> SimPret:
        """Projection d'un prêt hypothétique NON remboursé : intérêts composés jusqu'à juin."""
        params = Cycle.objects.get(id=cycle_id).to_params()
        return SimPret(
            mois_de_dette=interest.cloture(params) - mois_pret,
            majoration=interest.total_interets_pret(montant, mois_pret, None, params),
            total=interest.dette_finale(montant, mois_pret, None, params),
        )

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
                solde=loan.dette,
                total_interets=loan.total_interets_composes,
                total_rembourse=loan.total_rembourse,
                echeancier=_echeancier(loan),
            )
            for loan in loans
        ]

        depots_domain = [interest.Depot(d.mois_index, d.montant) for d in deposits]
        epi = interest.epargne_plus_interets(depots_domain, params)
        # Dette v2 : somme des soldes composés.
        dettes = Decimal(0)
        for loan in loans:
            loan.cycle = cycle
            dettes += loan.dette

        return FicheMembre(
            id=strawberry.ID(str(member.id)),
            nom=member.nom,
            depots=depots_detail,
            prets=prets_detail,
            total_depose=interest.total_depose(depots_domain),
            interets=interest.interets_membre(depots_domain, params),
            epargne_plus_interets=epi,
            dettes=dettes,
            position_nette=epi - dettes,
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

    @strawberry.field
    def notes_seance(self, cycle_id: strawberry.ID) -> List[NoteSeance]:
        """Toutes les notes de séance déjà saisies pour un cycle (cahier de séance)."""
        from apps.cycles.models import NoteSeance as NoteSeanceModel

        return [
            NoteSeance(mois=n.mois, texte=n.texte, modifie_le=n.modifie_le.isoformat())
            for n in NoteSeanceModel.objects.filter(cycle_id=cycle_id).order_by("mois")
        ]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def ajouter_depot(
        self,
        cycle_id: strawberry.ID,
        member_id: strawberry.ID,
        mois_index: int,
        montant: Decimal,
        date: Optional[str] = None,
    ) -> RecapMembre:
        """Enregistre un dépôt (daté du jour, ou de la date fournie) puis renvoie le récap du membre."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        member = Member.objects.get(id=member_id)
        jour = datetime.date.fromisoformat(date) if date else datetime.date.today()
        Deposit.objects.update_or_create(
            cycle=cycle, member=member, mois_index=mois_index,
            defaults={"montant": montant, "date_operation": jour},
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
    def ajouter_remboursement(
        self, pret_id: strawberry.ID, mois: int, montant: Decimal
    ) -> Pret:
        """Enregistre un remboursement partiel d'un prêt (modèle composé v2, réf. docs/03)."""
        from apps.loans.models import Loan, Remboursement

        loan = Loan.objects.select_related("member", "cycle").get(id=pret_id)
        Remboursement.objects.create(loan=loan, mois=mois, montant=montant)
        return _pret(loan)

    @strawberry.mutation
    def enregistrer_note_seance(
        self, cycle_id: strawberry.ID, mois: int, texte: str
    ) -> NoteSeance:
        """Enregistre (ou remplace) la note d'une séance — le cahier de la trésorière."""
        from apps.cycles.models import NoteSeance as NoteSeanceModel

        cycle = Cycle.objects.get(id=cycle_id)
        note, _ = NoteSeanceModel.objects.update_or_create(
            cycle=cycle, mois=mois, defaults={"texte": texte}
        )
        return NoteSeance(mois=note.mois, texte=note.texte, modifie_le=note.modifie_le.isoformat())

    @strawberry.mutation
    def modifier_cycle(
        self,
        cycle_id: strawberry.ID,
        libelle: str,
        mois_debut: int,
        duree_depot: int,
        mois_delai: int,
        taux_epargne: Decimal,
        taux_majoration: Decimal,
    ) -> ParametresCycle:
        """Modifie les règles d'un cycle. Attention : recalcule les montants déjà saisis."""
        if not 1 <= mois_debut <= 12:
            raise ValueError("Le mois d'ouverture doit être entre 1 et 12.")
        if duree_depot < 1 or mois_delai < duree_depot:
            raise ValueError("Le délai doit être au moins égal à la durée des dépôts.")
        c = Cycle.objects.select_related("caisse").get(id=cycle_id)
        c.libelle = libelle
        c.mois_debut = mois_debut
        c.duree_depot = duree_depot
        c.mois_delai = mois_delai
        c.taux_epargne = taux_epargne
        c.taux_majoration = taux_majoration
        c.save(
            update_fields=[
                "libelle", "mois_debut", "duree_depot", "mois_delai",
                "taux_epargne", "taux_majoration"
            ]
        )
        return _params_cycle(c)

    @strawberry.mutation
    def creer_cycle(self, cycle_reference_id: strawberry.ID, libelle: str) -> ParametresCycle:
        """Crée une nouvelle année dans la même caisse, en reprenant les règles du cycle donné."""
        ref = Cycle.objects.select_related("caisse").get(id=cycle_reference_id)
        if Cycle.objects.filter(caisse=ref.caisse, libelle=libelle).exists():
            raise ValueError("Un cycle porte déjà ce libellé.")
        c = Cycle.objects.create(
            caisse=ref.caisse,
            libelle=libelle,
            mois_debut=ref.mois_debut,
            duree_depot=ref.duree_depot,
            mois_delai=ref.mois_delai,
            taux_epargne=ref.taux_epargne,
            taux_majoration=ref.taux_majoration,
        )
        return _params_cycle(c)

    @strawberry.mutation
    def cloturer_cycle(self, cycle_id: strawberry.ID) -> ParametresCycle:
        """Clôture un cycle (statut = clôturé)."""
        c = Cycle.objects.select_related("caisse").get(id=cycle_id)
        c.statut = "cloture"
        c.save(update_fields=["statut"])
        return _params_cycle(c)

    @strawberry.mutation
    def renommer_caisse(self, cycle_id: strawberry.ID, nom: str) -> ParametresCycle:
        """Renomme la caisse à laquelle appartient le cycle."""
        c = Cycle.objects.select_related("caisse").get(id=cycle_id)
        c.caisse.nom = nom
        c.caisse.save(update_fields=["nom"])
        return _params_cycle(c)


schema = strawberry.Schema(query=Query, mutation=Mutation)
