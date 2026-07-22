"""Routage racine : admin Django, API GraphQL (métier), endpoints REST (santé, auth)."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from strawberry.django.views import GraphQLView

from config.schema import schema


def sante(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("graphql/", GraphQLView.as_view(schema=schema)),
    path("api/sante/", sante, name="sante"),
    # path("api/auth/token/", TokenObtainPairView.as_view()),   # à activer avec simplejwt
]
