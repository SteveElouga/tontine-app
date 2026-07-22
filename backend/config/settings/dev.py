"""Réglages de développement."""
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["*"]

# En dev on ouvre l'API sans JWT pour itérer vite (à retirer avant prod).
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_AUTHENTICATION_CLASSES": (),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
}
