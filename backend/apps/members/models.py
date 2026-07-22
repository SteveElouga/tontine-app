import uuid

from django.db import models

from apps.cycles.models import Caisse


class Member(models.Model):
    """Un membre de la caisse."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caisse = models.ForeignKey(Caisse, on_delete=models.CASCADE, related_name="membres")
    nom = models.CharField(max_length=120)
    telephone = models.CharField(max_length=20, blank=True)
    actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom
