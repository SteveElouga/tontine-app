"""Cahier de séance : une note libre éditable par (cycle, mois). Additif, non cassant."""
import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cycles", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="NoteSeance",
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
                        help_text="Séance concernée (1 = 1er mois du cycle)"
                    ),
                ),
                ("texte", models.TextField(blank=True)),
                ("modifie_le", models.DateTimeField(auto_now=True)),
                (
                    "cycle",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes",
                        to="cycles.cycle",
                    ),
                ),
            ],
            options={
                "ordering": ["mois"],
            },
        ),
        migrations.AddConstraint(
            model_name="noteseance",
            constraint=models.UniqueConstraint(
                fields=("cycle", "mois"), name="note_unique_par_seance"
            ),
        ),
    ]
