import uuid
from datetime import date
from decimal import Decimal

from django.db import models

from apps.core.domain import interest
from apps.cycles.models import Cycle
from apps.members.models import Member


class Deposit(models.Model):
    """Un dépôt d'épargne d'un membre, pour un mois donné du cycle."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name="depots")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="depots")
    mois_index = models.PositiveSmallIntegerField(help_text="1 = septembre … 9 = mai")
    montant = models.DecimalField(max_digits=12, decimal_places=0)
    date_operation = models.DateField(
        default=date.today, help_text="Jour de la saisie (par défaut aujourd'hui, modifiable)"
    )
    saisi_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["member__nom", "mois_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["cycle", "member", "mois_index"], name="depot_unique_par_mois"
            )
        ]

    def __str__(self) -> str:
        return f"{self.member.nom} — mois {self.mois_index} : {self.montant}"

    @property
    def interet(self) -> Decimal:
        """Intérêt de ce dépôt, calculé par le moteur de domaine."""
        return interest.interet_depot(self.montant, self.mois_index, self.cycle.to_params())
