#!/bin/sh
# Tontine — installe les hooks Git versionnés (.githooks) PUIS prouve qu'ils sont actifs. Idempotent.
# Usage : sh scripts/install-hooks.sh   (à exécuter une fois après le clone)
set -eu

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ]; then
  echo "✖ Ce dossier n'est pas un dépôt Git. Lance d'abord : git init -b main"
  exit 1
fi
cd "$root"

if [ ! -d .githooks ]; then
  echo "✖ Dossier .githooks introuvable."
  exit 1
fi

chmod +x .githooks/* 2>/dev/null || true
git config core.hooksPath .githooks
echo "✓ Hooks installés (core.hooksPath = .githooks)."

# ─────────────────────────────────────────────────────────────────────────────
# AUTO-TEST (E3) — un core.hooksPath mal réglé rend les hooks silencieusement
# INACTIFS. On le PROUVE : dans un dépôt jetable qui pointe vers TES hooks,
# un commit sur 'main' DOIT être refusé. Si le test échoue → STOP.
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Auto-test des hooks (un commit sur 'main' doit être refusé)…"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if (
  cd "$tmp"
  git init -q -b main
  git config core.hooksPath "$root/.githooks"
  git config user.email "selftest@local"
  git config user.name  "selftest"
  # Semence via --no-verify (bootstrap du test uniquement)
  echo seed > f && git add f && git commit -q --no-verify -m "chore: seed"
  # Tentative de commit sur 'main' → le hook DOIT la refuser
  echo change >> f && git add f
  if git commit -q -m "feat: doit echouer" >/dev/null 2>&1; then
    exit 1   # le commit a réussi → hook INACTIF → test en échec
  fi
  exit 0     # le commit a été refusé → comportement attendu → test OK
); then
  echo "✓ Auto-test OK : les hooks sont actifs (commit sur 'main' bien refusé)."
  echo "  Actifs : pre-commit (branche + secrets + gitleaks), commit-msg (Conventional Commits), pre-push (branche + rebase)."
  echo "  Règles complètes : MEMORY.md"
else
  echo "✖ AUTO-TEST EN ÉCHEC : le pre-commit n'a PAS bloqué un commit sur 'main'."
  echo "  Les hooks sont INACTIFS. Ne travaille pas tant que ce n'est pas corrigé :"
  echo "  - vérifie : git config core.hooksPath   (doit valoir .githooks)"
  echo "  - vérifie : ls -l .githooks/*           (doivent être exécutables)"
  exit 1
fi
