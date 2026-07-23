"""Vues d'authentification complémentaires (changement de mot de passe)."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def changer_mot_de_passe(request):
    """Change le mot de passe de l'utilisateur connecté (ancien mot de passe requis)."""
    ancien = request.data.get("ancien", "")
    nouveau = request.data.get("nouveau", "")
    user = request.user

    if not user.check_password(ancien):
        return Response({"detail": "Mot de passe actuel incorrect."}, status=400)
    try:
        validate_password(nouveau, user)
    except ValidationError as exc:
        return Response({"detail": " ".join(exc.messages)}, status=400)

    user.set_password(nouveau)
    user.save(update_fields=["password"])
    return Response({"detail": "Mot de passe mis à jour."})
