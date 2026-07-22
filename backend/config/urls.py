"""Routage racine : admin Django, API GraphQL (métier), endpoints REST (santé, auth)."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView

from config.schema import schema


def sante(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # API GraphQL exemptée de CSRF : elle est consommée par le SPA Angular avec auth par JWT
    # (la protection CSRF vise l'auth par cookie de session, hors sujet ici).
    path("graphql/", csrf_exempt(GraphQLView.as_view(schema=schema))),
    path("api/sante/", sante, name="sante"),
    # path("api/auth/token/", TokenObtainPairView.as_view()),   # à activer avec simplejwt
]
