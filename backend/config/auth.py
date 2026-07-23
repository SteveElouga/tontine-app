"""Protection de l'endpoint GraphQL par jeton JWT.

La vue Strawberry n'est pas une vue DRF : les réglages `REST_FRAMEWORK`
(authentification + permission) ne s'y appliquent donc pas automatiquement.
Ce petit wrapper impose un jeton valide avant de laisser passer la requête.
"""
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication


def jwt_protected(view):
    """Refuse toute requête sans jeton JWT valide ; sinon renseigne `request.user`."""
    authenticator = JWTAuthentication()

    def wrapped(request, *args, **kwargs):
        try:
            resultat = authenticator.authenticate(request)
        except Exception:
            resultat = None
        if resultat is None:
            return JsonResponse({"detail": "Authentification requise."}, status=401)
        request.user, request.auth = resultat
        return view(request, *args, **kwargs)

    return wrapped
