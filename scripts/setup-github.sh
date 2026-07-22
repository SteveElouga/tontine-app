#!/bin/sh
# Tontine — protection des branches main/develop côté serveur (E1).
# À lancer SUR TA MACHINE.
# Prérequis : gh CLI installé et authentifié (gh auth login) ; main et develop poussés sur origin.
# Note : dépôt PUBLIC ⇒ protection GRATUITE. Dépôt privé en plan gratuit ⇒ nécessite GitHub Pro.
set -eu

REPO_PATH="${1:-}"   # ex. "<owner>/<repo>"
if [ -z "$REPO_PATH" ]; then
  echo "Usage : sh scripts/setup-github.sh <owner>/<repo>"
  exit 1
fi

protect() {
  br="$1"
  echo "→ Protection de '$br'…"
  if gh api -X PUT "repos/$REPO_PATH/branches/$br/protection" \
       -H "Accept: application/vnd.github+json" --input - >/dev/null 2>&1 <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["Garde-fous PR", "Scan de secrets", "CI OK"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
  then
    echo "  ✓ '$br' protégée : PR obligatoire, branche à jour (rebase), historique linéaire, conversations résolues, force-push & suppression interdits."
  else
    echo "  ✖ Échec sur '$br' (dépôt privé gratuit ? → GitHub Pro ou dépôt public)."
    echo "    En attendant, E1 repose sur les hooks locaux (scripts/install-hooks.sh)."
  fi
}

protect main
protect develop
echo "Terminé. Checks requis : 'Garde-fous PR' + 'Scan de secrets' + 'CI OK' (vérifie les noms exacts après le 1er run CI)."
