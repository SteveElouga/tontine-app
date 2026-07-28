"""Schéma GraphQL racine (Strawberry).

Point d'entrée de l'API métier. Ici on expose une lecture : le récapitulatif d'un membre
sur un cycle (épargne, intérêts, dettes, position nette), calculé par le moteur de domaine.
Les mutations d'écriture (ajouter un dépôt, un prêt) sont amorcées et à compléter.
"""
from __future__ import annotations

import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

import strawberry

from apps.core.domain import interest
from apps.cycles.models import Caisse, Cycle
from apps.members.models import Member


@strawberry.type
class RecapMembre:
    id: strawberry.ID
    nom: str
    total_depose: Decimal
    interets: Decimal
    epargne_plus_interets: Decimal
    dettes: Decimal              # reste dû (capital + majoration − remboursé)
    capital_emprunte: Decimal    # total emprunté sur le cycle
    majoration: Decimal          # majoration TOTALE facturée (intérêts, remboursés compris)
    total_rembourse: Decimal     # total remboursé sur les prêts
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
    caisse_id: strawberry.ID
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


# ── État du cycle (synthèse « santé ») ────────────────────────────────────────
# Cache mémoire de la reformulation IA, indexé par la signature des chiffres : on ne
# rappelle l'IA que si les données ont bougé (évite un appel réseau à chaque affichage).
_CACHE_ETAT_IA: "dict[tuple, str]" = {}


def _fmt_fcfa(valeur) -> str:
    """Montant lisible en FCFA : séparateurs de milliers par espace (1 234 567)."""
    n = Decimal(valeur).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return f"{int(n):,}".replace(",", " ")


def _texte_etat_ia(
    verdict, epargne, promis, prets, majoration, rembourse, reste, tresorerie, taux, langue="fr"
):
    """Reformulation naturelle par Claude, SI la clé ANTHROPIC_API_KEY est configurée.

    Renvoie None en l'absence de clé, de paquet, de réseau ou en cas d'erreur : le texte
    calculé prend alors le relais. Résultat mis en cache tant que les chiffres ne bougent pas
    (la langue fait partie de la signature : FR et EN sont mis en cache séparément).
    """
    import os

    cle = os.environ.get("ANTHROPIC_API_KEY")
    if not cle:
        return None
    signature = (verdict, int(promis), int(majoration), int(rembourse), int(reste), langue)
    if signature in _CACHE_ETAT_IA:
        return _CACHE_ETAT_IA[signature]
    try:
        import anthropic

        chiffres = (
            f"- Épargne collectée : {_fmt_fcfa(epargne)} FCFA\n"
            f"- Intérêts promis aux épargnants (complets) : {_fmt_fcfa(promis)}\n"
            f"- Prêts accordés : {_fmt_fcfa(prets)}\n"
            f"- Majoration gagnée sur les prêts : {_fmt_fcfa(majoration)}\n"
            f"- Déjà remboursé : {_fmt_fcfa(rembourse)} ({taux} % du total à rembourser)\n"
            f"- Reste dû sur les prêts : {_fmt_fcfa(reste)}\n"
            f"- Trésorerie disponible : {_fmt_fcfa(tresorerie)}\n"
            f"- Feu déjà décidé : {verdict}"
        )
        langue_txt = "en anglais" if langue == "en" else "en français"
        systeme = (
            "Tu écris l'état de santé d'une tontine camerounaise (caisse mutuelle) pour une "
            f"trésorière de 45 à 60 ans, non technique. Réponds {langue_txt}, quelle que soit la "
            "langue des chiffres ci-dessous. Style calme, clair et bienveillant : 3 à 4 "
            "phrases courtes, montants en FCFA précis (pas d'arrondis vagues). "
            "Cite au moins les prêts accordés et la majoration face aux intérêts promis. Un manque "
            "d'intérêts n'est PAS un échec : c'est le cas normal quand des prêts démarrent tard dans "
            "le cycle ou sont remboursés tôt (moins de mois, moins d'intérêts), pas un problème "
            "d'argent non prêté ; réglé par une réduction à la clôture, dis-le sans dramatiser. "
            "Tourne le propos vers la clôture (ce que ça donnera à la fin). Pas de "
            "listes, ni tiret cadratin (—), pas de jargon, ne réexplique pas le feu. Réponds "
            "uniquement par la synthèse."
        )
        client = anthropic.Anthropic(api_key=cle)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=260,
            system=systeme,
            messages=[
                {"role": "user", "content": f"Chiffres du cycle :\n{chiffres}\n\nRédige la synthèse."}
            ],
        )
        texte = "".join(getattr(bloc, "text", "") for bloc in message.content).strip()
        if texte:
            _CACHE_ETAT_IA[signature] = texte
        return texte or None
    except Exception:
        return None


def _texte_etat(
    verdict, epargne, promis, prets, majoration, rembourse, reste, tresorerie, taux, langue="fr"
) -> str:
    """Phrase de synthèse : texte calculé (toujours disponible, fiable, FR ou EN selon `langue`),
    reformulé par l'IA si une clé est configurée (repli automatique sur le calculé)."""
    manque = promis - majoration
    if langue == "en":
        if verdict == "vert":
            base = (
                f"This cycle is running smoothly: {_fmt_fcfa(epargne)} FCFA saved, {_fmt_fcfa(prets)} "
                f"FCFA lent out. Loan interest covers what's owed to savers ({_fmt_fcfa(majoration)} vs "
                f"{_fmt_fcfa(promis)} FCFA), and repayments are keeping pace ({taux} %, {_fmt_fcfa(reste)} "
                f"FCFA still to come in). If it stays this way, everyone will get their full share at "
                f"closing."
            )
        elif verdict == "orange" and majoration < promis:
            base = (
                f"The fund is holding steady, just worth watching. Out of {_fmt_fcfa(prets)} FCFA lent, "
                f"the interest collected doesn't cover it all yet: {_fmt_fcfa(majoration)} FCFA against "
                f"{_fmt_fcfa(promis)} owed to savers, a shortfall of about {_fmt_fcfa(manque)}. That's "
                f"normal when loans start late in the cycle or get repaid early: fewer months, less "
                f"interest, not a case of money sitting unused. At closing, everyone's interest will be "
                f"trimmed slightly, that's exactly what this is for. As for repayments, {taux} % is in, "
                f"with {_fmt_fcfa(reste)} FCFA still to collect."
            )
        elif verdict == "orange":
            base = (
                f"Money-wise, it's all there: out of {_fmt_fcfa(prets)} FCFA lent, the interest easily "
                f"covers what's owed to savers ({_fmt_fcfa(majoration)} vs {_fmt_fcfa(promis)} FCFA). "
                f"What needs watching is repayments: only {taux} % is in so far, with "
                f"{_fmt_fcfa(reste)} FCFA still to collect before closing."
            )
        else:  # rouge
            base = (
                f"This cycle needs closer attention. Cash on hand stands at {_fmt_fcfa(tresorerie)} FCFA, "
                f"and out of {_fmt_fcfa(prets)} FCFA lent, interest collected is only "
                f"{_fmt_fcfa(majoration)} against {_fmt_fcfa(promis)} owed to savers, a significant "
                f"shortfall that goes beyond simple timing. Interest will need to be cut noticeably at "
                f"closing, and repayments need a push ({taux} % collected, {_fmt_fcfa(reste)} FCFA "
                f"remaining)."
            )
    elif verdict == "vert":
        base = (
            f"Tout roule pour ce cycle : {_fmt_fcfa(epargne)} FCFA d'épargne, {_fmt_fcfa(prets)} FCFA "
            f"prêtés. Les prêts rapportent de quoi payer les intérêts promis aux épargnants "
            f"({_fmt_fcfa(majoration)} contre {_fmt_fcfa(promis)} FCFA), et les remboursements suivent le "
            f"rythme ({taux} %, il reste {_fmt_fcfa(reste)} FCFA à rentrer). Si ça continue ainsi, chacun "
            f"repartira avec sa part complète à la clôture."
        )
    elif verdict == "orange" and majoration < promis:
        base = (
            f"La caisse tient la route, gardons juste un œil dessus. Sur {_fmt_fcfa(prets)} FCFA prêtés, "
            f"les intérêts rapportés ne couvrent pas encore tout : {_fmt_fcfa(majoration)} FCFA contre "
            f"{_fmt_fcfa(promis)} promis aux épargnants, un manque d'environ {_fmt_fcfa(manque)}. C'est "
            f"normal quand des prêts démarrent tard dans le cycle ou sont remboursés tôt : moins de mois, "
            f"moins d'intérêts, pas un problème d'argent non prêté. À la clôture, on réduira un peu les "
            f"intérêts pour chacun, c'est justement prévu pour ce cas. Côté remboursements, {taux} % sont "
            f"rentrés, il reste {_fmt_fcfa(reste)} FCFA à récupérer."
        )
    elif verdict == "orange":
        base = (
            f"Côté argent, tout est là : sur {_fmt_fcfa(prets)} FCFA prêtés, les intérêts couvrent "
            f"largement ce qui est promis aux épargnants ({_fmt_fcfa(majoration)} contre "
            f"{_fmt_fcfa(promis)} FCFA). Ce qu'il faut suivre, ce sont les remboursements : {taux} % "
            f"seulement sont rentrés, il reste {_fmt_fcfa(reste)} FCFA à récupérer avant la clôture."
        )
    else:  # rouge
        base = (
            f"Ce cycle mérite qu'on s'y attarde. La trésorerie est à {_fmt_fcfa(tresorerie)} FCFA, et sur "
            f"{_fmt_fcfa(prets)} FCFA prêtés, les intérêts n'ont rapporté que {_fmt_fcfa(majoration)} pour "
            f"{_fmt_fcfa(promis)} promis aux épargnants, un manque important, au-delà du simple décalage "
            f"de calendrier. Il faudra réduire nettement les intérêts à la clôture et pousser sur les "
            f"remboursements ({taux} % rentrés, {_fmt_fcfa(reste)} FCFA restant)."
        )
    return (
        _texte_etat_ia(
            verdict, epargne, promis, prets, majoration, rembourse, reste, tresorerie, taux, langue
        )
        or base
    )


def _recap_membre(member: Member, cycle: Cycle, strategie=None) -> RecapMembre:
    params = cycle.to_params()
    depots = [
        interest.Depot(d.mois_index, d.montant)
        for d in member.depots.filter(cycle=cycle)
    ]
    # Dette v2 (vue totaux) : capital emprunté, majoration TOTALE facturée, total remboursé,
    # et reste dû = capital + majoration − remboursé (= somme des soldes composés).
    dettes = Decimal(0)
    capital_emprunte = Decimal(0)
    majoration_totale = Decimal(0)
    total_rembourse_prets = Decimal(0)
    for loan in member.prets.filter(cycle=cycle):
        loan.cycle = cycle
        dettes += loan.dette
        capital_emprunte += loan.montant
        majoration_totale += loan.total_interets_composes
        total_rembourse_prets += loan.total_rembourse
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
        capital_emprunte=capital_emprunte,
        majoration=majoration_totale,
        total_rembourse=total_rembourse_prets,
        position_nette=epargne_plus_interets - dettes,
    )


@strawberry.type
class RemboursementDetail:
    id: strawberry.ID
    mois: int
    montant: Decimal


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
    remboursements: List["RemboursementDetail"]


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
        remboursements=[
            RemboursementDetail(id=strawberry.ID(str(r.id)), mois=r.mois, montant=r.montant)
            for r in loan.remboursements.order_by("mois", "cree_le")
        ],
    )


@strawberry.type
class PartRepartition:
    """Une part d'un versement réparti : soit sur un prêt, soit en épargne."""
    type: str                    # "pret" ou "epargne"
    montant: Decimal
    mois_cible: int              # mois du prêt ciblé (pret) ou mois de l'épargne (epargne)
    remboursement_id: Optional[strawberry.ID] = None  # présent si type == "pret" (pour annuler)


@strawberry.type
class ResultatRemboursement:
    """Résultat d'un versement : les prêts du membre à jour + la répartition effectuée."""
    prets: List["Pret"]
    repartition: List["PartRepartition"]


@strawberry.type
class PointSerie:
    """Un mois du cycle : les 3 indicateurs cumulés (pour le graphe du tableau de bord)."""
    mois: int
    epargne: Decimal       # épargne cumulée collectée
    encours: Decimal       # dette totale des prêts encore due à ce mois
    tresorerie: Decimal    # argent disponible = épargne + remboursements − prêts accordés


@strawberry.type
class EtatCycle:
    """Synthèse « santé » du cycle en cours (feu + phrase)."""
    verdict: str               # "vert" | "orange" | "rouge"
    texte: str                 # phrase(s) de synthèse (calculée, ou reformulée par l'IA)
    epargne: Decimal
    interets_promis: Decimal   # intérêts complets dus aux épargnants
    prets: Decimal
    majoration: Decimal        # majoration totale gagnée sur les prêts
    rembourse: Decimal
    reste_du: Decimal
    tresorerie: Decimal
    taux_remboursement: int    # % du total à rembourser déjà encaissé


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
            # Jusqu'au délai : juin → septembre acceptés en dépôt (à 0 %).
            for m in range(1, cycle.mois_delai + 1)
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
                caisse_id=strawberry.ID(str(c.caisse_id)),
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
            .prefetch_related("remboursements")
            .order_by("member__nom", "mois_pret")
        )
        return [_pret(loan) for loan in loans]

    @strawberry.field
    def serie_mensuelle(self, cycle_id: strawberry.ID) -> List[PointSerie]:
        """Évolution mensuelle du cycle : épargne cumulée, encours des prêts, trésorerie.
        Une valeur par réunion (mois 1..délai) — pour le graphe du tableau de bord."""
        from apps.loans.models import Loan
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        params = cycle.to_params()
        depots = [
            (d.mois_index, interest._money(d.montant))
            for d in Deposit.objects.filter(cycle=cycle, member__actif=True)
        ]
        loans = list(
            Loan.objects.filter(cycle=cycle, member__actif=True)
            .select_related("cycle")
            .prefetch_related("remboursements")
        )
        rmaps = {loan.id: loan.remboursements_par_mois() for loan in loans}

        points: List[PointSerie] = []
        for m in range(1, params.mois_delai + 1):
            epargne = sum((v for mi, v in depots if mi <= m), Decimal(0))
            prets_out = sum(
                (interest._money(loan.montant) for loan in loans if loan.mois_pret <= m),
                Decimal(0),
            )
            remb_cumule = sum(
                (mt for loan in loans for mo, mt in rmaps[loan.id].items() if mo <= m),
                Decimal(0),
            )
            encours = Decimal(0)
            for loan in loans:
                if loan.mois_pret > m:
                    continue  # prêt pas encore accordé à ce mois
                if loan.mois_pret == m:
                    encours += interest._money(loan.montant)  # capital, pas encore d'intérêt
                else:
                    encours += interest.solde_a_la_reunion(
                        loan.montant, loan.mois_pret, rmaps[loan.id], m, params
                    )
            points.append(
                PointSerie(
                    mois=m,
                    epargne=interest.arrondi_final(epargne),
                    encours=interest.arrondi_final(encours),
                    tresorerie=interest.arrondi_final(epargne + remb_cumule - prets_out),
                )
            )
        return points

    @strawberry.field
    def etat_cycle(self, cycle_id: strawberry.ID, langue: str = "fr") -> EtatCycle:
        """Synthèse « santé » du cycle : feu (vert/orange/rouge) + phrase de lecture immédiate.
        Chiffres calculés par le moteur ; texte calculé (toujours dispo, FR ou EN selon `langue`)
        reformulé par l'IA si une clé est configurée."""
        from apps.loans.models import Loan
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        params = cycle.to_params()
        depots = list(Deposit.objects.filter(cycle=cycle, member__actif=True))
        loans = list(
            Loan.objects.filter(cycle=cycle, member__actif=True)
            .select_related("cycle")
            .prefetch_related("remboursements")
        )

        if not depots and not loans:
            texte_neutre = (
                "This tontine is just getting started: no savings or loans recorded yet. "
                "Enter the first deposits and the status will fill in on its own."
                if langue == "en"
                else "Cette tontine démarre : aucune épargne ni prêt enregistré pour l'instant. "
                "Saisissez les premiers dépôts et l'état se remplira tout seul."
            )
            return EtatCycle(
                verdict="neutre",
                texte=texte_neutre,
                epargne=Decimal(0),
                interets_promis=Decimal(0),
                prets=Decimal(0),
                majoration=Decimal(0),
                rembourse=Decimal(0),
                reste_du=Decimal(0),
                tresorerie=Decimal(0),
                taux_remboursement=0,
            )

        epargne = sum((interest._money(d.montant) for d in depots), Decimal(0))
        promis = sum(
            (interest.interet_depot(d.montant, d.mois_index, params) for d in depots),
            Decimal(0),
        )
        prets = sum((interest._money(loan.montant) for loan in loans), Decimal(0))
        majoration = sum((loan.total_interets_composes for loan in loans), Decimal(0))
        rembourse = sum((loan.total_rembourse for loan in loans), Decimal(0))
        reste = sum((loan.dette for loan in loans), Decimal(0))
        tresorerie = epargne + rembourse - prets
        total_du = prets + majoration
        taux = int(rembourse * 100 / total_du) if total_du > 0 else 100

        # Feu : le pivot est « les majorations couvrent-elles les intérêts promis ? »
        couvre = majoration >= promis
        if tresorerie < 0 or (promis > 0 and majoration < promis / 2):
            verdict = "rouge"
        elif not couvre or taux < 50:
            verdict = "orange"
        else:
            verdict = "vert"

        texte = _texte_etat(
            verdict, epargne, promis, prets, majoration, rembourse, reste, tresorerie, taux, langue
        )
        return EtatCycle(
            verdict=verdict,
            texte=texte,
            epargne=interest.arrondi_final(epargne),
            interets_promis=interest.arrondi_final(promis),
            prets=interest.arrondi_final(prets),
            majoration=interest.arrondi_final(majoration),
            rembourse=interest.arrondi_final(rembourse),
            reste_du=interest.arrondi_final(reste),
            tresorerie=interest.arrondi_final(tresorerie),
            taux_remboursement=taux,
        )

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
    def modifier_pret(
        self, pret_id: strawberry.ID, montant: Decimal, mois_pret: int
    ) -> Pret:
        """Corrige le montant et/ou le mois d'un prêt ; renvoie le prêt recalculé."""
        from apps.loans.models import Loan

        loan = Loan.objects.select_related("member", "cycle").get(id=pret_id)
        loan.montant = montant
        loan.mois_pret = mois_pret
        # Valide que l'échéancier reste calculable (remboursements cohérents) avant de sauvegarder.
        _ = loan.dette
        loan.save(update_fields=["montant", "mois_pret"])
        return _pret(loan)

    @strawberry.mutation
    def ajouter_remboursement(
        self, pret_id: strawberry.ID, mois: int, montant: Decimal
    ) -> ResultatRemboursement:
        """Enregistre un versement. Si le montant dépasse le solde du prêt, le surplus cascade
        sur les autres prêts du membre (le plus ancien d'abord), puis part en épargne (docs/03)."""
        from apps.loans.models import Loan, Remboursement
        from apps.savings.models import Deposit
        from apps.core.domain import interest

        loan = Loan.objects.select_related("member", "cycle").get(id=pret_id)
        member = loan.member
        cycle = loan.cycle
        params = cycle.to_params()

        # Ordre d'imputation : le prêt choisi d'abord, puis les autres du membre (plus ancien d'abord).
        autres = list(
            Loan.objects.filter(cycle=cycle, member=member)
            .exclude(id=loan.id)
            .order_by("mois_pret", "cree_le")
        )
        repartition: List[PartRepartition] = []
        pool = interest._money(montant)

        for pr in [loan, *autres]:
            if pool <= 0:
                break
            # Un prêt est un prêt : on l'impute toujours. Si le versement est daté avant que ce
            # prêt n'existe, le surplus l'atteint à sa 1re réunion possible (mois_pret + 1).
            m_app = mois if mois > pr.mois_pret else pr.mois_pret + 1
            solde = interest.solde_a_la_reunion(
                pr.montant, pr.mois_pret, pr.remboursements_par_mois(), m_app, params
            )
            if solde <= 0:
                continue
            a = (pool if pool < solde else solde).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            if a <= 0:
                continue
            r = Remboursement.objects.create(loan=pr, mois=m_app, montant=a)
            repartition.append(
                PartRepartition(
                    type="pret",
                    montant=a,
                    mois_cible=pr.mois_pret,
                    remboursement_id=strawberry.ID(str(r.id)),
                )
            )
            pool -= a

        # Ce qui reste (aucune dette où aller) → épargne, au mois du versement (plafonné à juin → 0 %).
        if pool > 0:
            reste = pool.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            mois_ep = min(mois, interest.cloture(params))
            depot, cree = Deposit.objects.get_or_create(
                cycle=cycle,
                member=member,
                mois_index=mois_ep,
                defaults={"montant": reste, "date_operation": datetime.date.today()},
            )
            if not cree:
                depot.montant = depot.montant + reste
                depot.save(update_fields=["montant"])
            repartition.append(
                PartRepartition(type="epargne", montant=reste, mois_cible=mois_ep)
            )

        prets_maj = [
            _pret(x)
            for x in Loan.objects.filter(cycle=cycle, member=member)
            .select_related("member", "cycle")
            .prefetch_related("remboursements")
            .order_by("member__nom", "mois_pret")
        ]
        return ResultatRemboursement(prets=prets_maj, repartition=repartition)

    @strawberry.mutation
    def retirer_epargne(
        self, cycle_id: strawberry.ID, member_id: strawberry.ID, mois_index: int, montant: Decimal
    ) -> bool:
        """Retire un montant de l'épargne d'un membre (annulation d'un surplus) ;
        supprime le dépôt s'il tombe à zéro."""
        from apps.savings.models import Deposit

        depot = Deposit.objects.filter(
            cycle_id=cycle_id, member_id=member_id, mois_index=mois_index
        ).first()
        if depot:
            depot.montant = depot.montant - Decimal(str(montant))
            if depot.montant <= 0:
                depot.delete()
            else:
                depot.save(update_fields=["montant"])
        return True

    @strawberry.mutation
    def supprimer_depot(
        self, cycle_id: strawberry.ID, member_id: strawberry.ID, mois_index: int
    ) -> RecapMembre:
        """Supprime le dépôt d'un membre pour un mois donné ; renvoie le récap à jour."""
        from apps.savings.models import Deposit

        cycle = Cycle.objects.get(id=cycle_id)
        member = Member.objects.get(id=member_id)
        Deposit.objects.filter(cycle=cycle, member=member, mois_index=mois_index).delete()
        return _recap_membre(member, cycle)

    @strawberry.mutation
    def supprimer_pret(self, pret_id: strawberry.ID) -> bool:
        """Supprime un prêt et, en cascade, tous ses remboursements."""
        from apps.loans.models import Loan

        Loan.objects.filter(id=pret_id).delete()
        return True

    @strawberry.mutation
    def supprimer_remboursement(self, remboursement_id: strawberry.ID) -> Pret:
        """Supprime un remboursement ; renvoie le prêt recalculé (rechargé après suppression)."""
        from apps.loans.models import Loan, Remboursement

        r = Remboursement.objects.get(id=remboursement_id)
        loan_id = r.loan_id
        r.delete()
        # On recharge le prêt APRÈS la suppression : aucun état de relation figé, solde exact.
        loan = Loan.objects.select_related("member", "cycle").get(id=loan_id)
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

    @strawberry.mutation
    def creer_caisse(self, nom: str, libelle: str) -> ParametresCycle:
        """Crée une nouvelle tontine (caisse) et son premier cycle (règles par défaut)."""
        nom = nom.strip()
        libelle = libelle.strip()
        if not nom:
            raise ValueError("Le nom de la tontine est obligatoire.")
        if not libelle:
            raise ValueError("Le libellé du premier cycle est obligatoire.")
        caisse = Caisse.objects.create(nom=nom)
        c = Cycle.objects.create(caisse=caisse, libelle=libelle)
        return _params_cycle(c)


schema = strawberry.Schema(query=Query, mutation=Mutation)
