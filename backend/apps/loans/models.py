import uuid
from decimal import Decimal

from django.db import models

from apps.core.domain import interest
from apps.cycles.models import Cycle
from apps.members.models import Member


class Loan(models.Model):
    """Un prêt accordé à un membre par la caisse."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name="prets")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="prets")
    montant = models.DecimalField(max_digits=12, decimal_places=0)
    mois_pret = models.PositiveSmallIntegerField(help_text="Mois du prêt (1 = septembre … 9 = mai)")
    mois_remboursement = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Vide = remboursé au délai (août)"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["member__nom", "mois_pret"]

    def __str__(self) -> str:
        return f"{self.member.nom} — prêt {self.montant} (mois {self.mois_pret})"

    def _to_domain(self) -> interest.Pret:
        return interest.Pret(
            montant=self.montant,
            mois_pret=self.mois_pret,
            mois_remboursement=self.mois_remboursement,
        )

    @property
    def mois_de_dette(self) -> int:
        return interest.mois_de_dette(self._to_domain(), self.cycle.to_params())

    @property
    def majoration(self) -> Decimal:
        return interest.majoration_pret(self._to_domain(), self.cycle.to_params())

    @property
    def total_a_rembourser(self) -> Decimal:
        return interest.total_a_rembourser(self._to_domain(), self.cycle.to_params())

    # --- Modèle v2 : intérêts composés + registre de remboursements (docs/03) ---
    def remboursements_par_mois(self) -> dict:
        """Somme des remboursements par réunion : {position: montant}."""
        agg: "dict[int, Decimal]" = {}
        for r in self.remboursements.all():
            agg[r.mois] = agg.get(r.mois, Decimal(0)) + r.montant
        return agg

    def echeancier_compose(self):
        """Déroulé composé du prêt, réunion par réunion (montants exacts)."""
        return interest.echeancier_pret(
            self.montant, self.mois_pret, self.remboursements_par_mois(), self.cycle.to_params()
        )

    @property
    def dette(self) -> Decimal:
        """Dette finale (juin) en intérêts composés — arrondie à 1 décimale."""
        return interest.dette_finale(
            self.montant, self.mois_pret, self.remboursements_par_mois(), self.cycle.to_params()
        )

    @property
    def total_interets_composes(self) -> Decimal:
        """Total des intérêts composés facturés sur la vie du prêt (arrondi final 1 décimale)."""
        return interest.total_interets_pret(
            self.montant, self.mois_pret, self.remboursements_par_mois(), self.cycle.to_params()
        )

    @property
    def total_rembourse(self) -> Decimal:
        return sum((r.montant for r in self.remboursements.all()), Decimal(0))

    @property
    def est_solde(self) -> bool:
        return self.dette == Decimal("0")


class Remboursement(models.Model):
    """Un remboursement partiel d'un prêt, versé à une réunion (modèle v2, intérêts composés)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name="remboursements")
    mois = models.PositiveSmallIntegerField(help_text="Réunion du remboursement (1 = 1er mois de dépôt)")
    montant = models.DecimalField(max_digits=12, decimal_places=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["mois", "cree_le"]

    def __str__(self) -> str:
        return f"remboursement {self.montant} (mois {self.mois})"
