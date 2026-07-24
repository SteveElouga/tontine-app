import uuid
from decimal import Decimal

from django.db import models

from apps.core.domain.interest import Cycle as CycleParams


class Caisse(models.Model):
    """Une caisse mutuelle (le fonds d'épargne/prêt d'une tontine)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=120)
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.nom


class Cycle(models.Model):
    """Un cycle annuel. Tous les paramètres de calcul vivent ici — jamais codés en dur."""

    class Statut(models.TextChoices):
        OUVERT = "ouvert", "Ouvert"
        CLOTURE = "cloture", "Clôturé"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caisse = models.ForeignKey(Caisse, on_delete=models.CASCADE, related_name="cycles")
    libelle = models.CharField(max_length=40, help_text="Ex. « 2025-2026 »")

    mois_debut = models.PositiveSmallIntegerField(default=9, help_text="9 = septembre")
    duree_depot = models.PositiveSmallIntegerField(default=9, help_text="Nb de mois de dépôt")
    mois_delai = models.PositiveSmallIntegerField(default=12, help_text="Délai de remboursement")
    taux_epargne = models.DecimalField(max_digits=4, decimal_places=3, default=Decimal("0.05"))
    taux_majoration = models.DecimalField(max_digits=4, decimal_places=3, default=Decimal("0.05"))

    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.OUVERT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["caisse", "libelle"], name="cycle_unique_par_caisse")
        ]

    def __str__(self) -> str:
        return f"{self.caisse.nom} — {self.libelle}"

    def to_params(self) -> CycleParams:
        """Passerelle vers le moteur de calcul (domaine pur)."""
        return CycleParams(
            mois_debut=self.mois_debut,
            duree_depot=self.duree_depot,
            mois_delai=self.mois_delai,
            taux_epargne=self.taux_epargne,
            taux_majoration=self.taux_majoration,
        )


class NoteSeance(models.Model):
    """Cahier de séance : une note libre éditable par (cycle, mois de réunion).

    Le carnet de la trésorière — absences, décisions, incidents d'une séance.
    Une seule page par séance ; on la réécrit à volonté.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name="notes")
    mois = models.PositiveSmallIntegerField(help_text="Séance concernée (1 = 1er mois du cycle)")
    texte = models.TextField(blank=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["mois"]
        constraints = [
            models.UniqueConstraint(fields=["cycle", "mois"], name="note_unique_par_seance")
        ]

    def __str__(self) -> str:
        return f"note séance {self.mois} — {self.cycle.libelle}"
