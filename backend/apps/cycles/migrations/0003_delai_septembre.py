"""Le délai de remboursement passe d'août (12) à septembre (13).

La distribution de l'épargne + intérêts se fait à la réunion de septembre ; on peut donc
rembourser jusque-là. Les cycles existants encore au défaut d'août (12) sont recalés à 13.
"""
from django.db import migrations, models


def delai_septembre(apps, schema_editor):
    Cycle = apps.get_model("cycles", "Cycle")
    Cycle.objects.filter(mois_delai=12).update(mois_delai=13)


def delai_aout(apps, schema_editor):
    Cycle = apps.get_model("cycles", "Cycle")
    Cycle.objects.filter(mois_delai=13).update(mois_delai=12)


class Migration(migrations.Migration):

    dependencies = [
        ("cycles", "0002_noteseance"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cycle",
            name="mois_delai",
            field=models.PositiveSmallIntegerField(
                default=13, help_text="Délai de remboursement (13 = septembre)"
            ),
        ),
        migrations.RunPython(delai_septembre, delai_aout),
    ]
