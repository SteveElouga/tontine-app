"""Retrait du champ mois_remboursement (obsolète : remplacé par le registre de remboursements v2)."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0002_remboursement"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="loan",
            name="mois_remboursement",
        ),
    ]
