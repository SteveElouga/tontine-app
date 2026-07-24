"""Ajoute une date d'opération modifiable au dépôt (le « jour de la saisie »).

Par défaut le jour de l'enregistrement, mais la trésorière peut la corriger (ex. saisir
le 26 la réunion tenue le 25). Les dépôts existants reprennent la date de leur saisi_le.
"""
from datetime import date

from django.db import migrations, models


def backfill_date_operation(apps, schema_editor):
    Deposit = apps.get_model("savings", "Deposit")
    for d in Deposit.objects.all():
        d.date_operation = d.saisi_le.date()
        d.save(update_fields=["date_operation"])


class Migration(migrations.Migration):

    dependencies = [
        ("savings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="deposit",
            name="date_operation",
            field=models.DateField(
                default=date.today,
                help_text="Jour de la saisie (par défaut aujourd'hui, modifiable)",
            ),
        ),
        migrations.RunPython(backfill_date_operation, migrations.RunPython.noop),
    ]
