"""Tests d'authentification : login JWT, protection de /graphql/, changement de mot de passe."""
import pytest

# Doit correspondre à MDP_TRESORIERE dans conftest.py.
MDP = "secret-tresoriere-123"


@pytest.mark.django_db
def test_login_ok(api, tresoriere):
    r = api.post(
        "/api/auth/token/",
        {"username": "therese", "password": MDP},
        format="json",
    )
    assert r.status_code == 200
    assert "access" in r.data
    assert "refresh" in r.data


@pytest.mark.django_db
def test_login_mauvais_mot_de_passe(api, tresoriere):
    r = api.post(
        "/api/auth/token/",
        {"username": "therese", "password": "faux"},
        format="json",
    )
    assert r.status_code == 401


@pytest.mark.django_db
def test_graphql_refuse_sans_jeton(api):
    r = api.post("/graphql/", {"query": "{ sante }"}, format="json")
    assert r.status_code == 401


@pytest.mark.django_db
def test_graphql_accepte_avec_jeton(api_auth):
    r = api_auth.post("/graphql/", {"query": "{ sante }"}, format="json")
    assert r.status_code == 200
    assert r.json()["data"]["sante"] == "ok"


@pytest.mark.django_db
def test_changer_mot_de_passe(api_auth, tresoriere):
    r = api_auth.post(
        "/api/auth/mot-de-passe/",
        {"ancien": MDP, "nouveau": "un-nouveau-mdp-456"},
        format="json",
    )
    assert r.status_code == 200
    tresoriere.refresh_from_db()
    assert tresoriere.check_password("un-nouveau-mdp-456")


@pytest.mark.django_db
def test_changer_mot_de_passe_ancien_faux(api_auth):
    r = api_auth.post(
        "/api/auth/mot-de-passe/",
        {"ancien": "faux", "nouveau": "un-nouveau-mdp-456"},
        format="json",
    )
    assert r.status_code == 400
