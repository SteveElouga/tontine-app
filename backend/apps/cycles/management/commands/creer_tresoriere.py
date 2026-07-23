"""Crée ou réinitialise le compte de connexion de la trésorière (login unique, v1).

Usage :
    python manage.py creer_tresoriere                     # demande le mot de passe
    python manage.py creer_tresoriere --username therese  # identifiant choisi
"""
from getpass import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crée ou met à jour le compte de la trésorière (identifiant + mot de passe)."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="tresoriere", help="Identifiant de connexion")
        parser.add_argument(
            "--password", default=None, help="Mot de passe (sinon demandé de façon masquée)"
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"].strip()
        password = options["password"] or getpass("Mot de passe : ")
        if not password:
            self.stderr.write(self.style.ERROR("Mot de passe vide, abandon."))
            return

        user, cree = User.objects.get_or_create(
            username=username, defaults={"is_staff": True}
        )
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "créé" if cree else "mis à jour"
        self.stdout.write(self.style.SUCCESS(f"Compte « {username} » {action}."))
