"""Fixtures partagées pour les tests (pytest-django)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

MDP_TRESORIERE = "secret-tresoriere-123"


@pytest.fixture
def api():
    """Client HTTP de test (DRF)."""
    return APIClient()


@pytest.fixture
def tresoriere(db):
    """Compte trésorière prêt à se connecter."""
    return get_user_model().objects.create_user(username="therese", password=MDP_TRESORIERE)


@pytest.fixture
def token(api, tresoriere):
    """Jeton d'accès JWT valide pour la trésorière."""
    r = api.post(
        "/api/auth/token/",
        {"username": "therese", "password": MDP_TRESORIERE},
        format="json",
    )
    return r.data["access"]


@pytest.fixture
def api_auth(api, token):
    """Client HTTP déjà authentifié (en-tête Authorization)."""
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api
