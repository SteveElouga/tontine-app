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
