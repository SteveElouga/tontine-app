"""Registre de remboursements partiels (modèle v2 — intérêts composés). Additif, non cassant."""
import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Remboursement",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "mois",
                    models.PositiveSmallIntegerField(
                        help_text="Réunion du remboursement (1 = 1er mois de dépôt)"
                    ),
                ),
                ("montant", models.DecimalField(decimal_places=0, max_digits=12)),
                ("cree_le", models.DateTimeField(auto_now_add=True)),
                (
                    "loan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="remboursements",
                        to="loans.loan",
                    ),
                ),
            ],
            options={
                "ordering": ["mois", "cree_le"],
            },
        ),
    ]
