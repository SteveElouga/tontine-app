"""Routage racine : admin Django, API GraphQL (métier), endpoints REST (santé, auth)."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from strawberry.django.views import GraphQLView

from config.auth import jwt_protected
from config.schema import schema


def sante(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # API GraphQL exemptée de CSRF et protégée par JWT (jeton dans l'en-tête Authorization).
    path("graphql/", csrf_exempt(jwt_protected(GraphQLView.as_view(schema=schema)))),
    path("api/sante/", sante, name="sante"),
    # Auth JWT (login trésorière) : obtenir puis rafraîchir le jeton.
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
