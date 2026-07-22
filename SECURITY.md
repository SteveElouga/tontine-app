# Politique de sécurité — Tontine

## Versions supportées
| Version | Corrections de sécurité |
|---------|-------------------------|
| dernière release `main` (vX.Y.Z) | ✅ |
| versions antérieures | ❌ |

## Signaler une vulnérabilité
**Ne créez pas d'issue publique.** Écrivez à nyobeelouga5@icloud.com <!-- remplacer par un contact sécurité dédié si besoin -->,
ou ouvrez un avis privé sur GitHub (onglet **Security → Report a vulnerability**).

- Délai de première réponse visé : **48 heures**.
- Nous confirmons la réception, évaluons l'impact, et convenons avec vous d'une **divulgation coordonnée**.
- Merci de fournir : étapes de reproduction, version concernée, impact estimé.

## Périmètre
- **Dans le périmètre** : le code de ce dépôt et sa configuration de déploiement par défaut.
- **Hors périmètre** : services tiers, dépendances (à signaler en amont), déploiements modifiés par l'utilisateur.

## Rappel métier — l'argent ne transite pas par l'application
L'application **tient les comptes** (dépôts, intérêts, prêts) ; elle ne détient ni ne déplace de fonds.
Toute évolution qui ferait transiter de l'argent par l'app change la surface de risque **et** le statut
réglementaire (agrément) : à traiter comme un changement de sécurité majeur.

## En cas de secret exposé dans le dépôt
Un secret committé (même supprimé ensuite) est **compromis**. Procédure immédiate :
1. **Roter / révoquer** le secret concerné sans attendre (le considérer comme public).
2. **Purger l'historique** Git : `git filter-repo --invert-paths --path <fichier>` (ou BFG), puis
   réécriture forcée côté serveur en coordination (protéger à nouveau les branches après).
3. **Consigner l'incident** dans `MEMORY.md` (§6 journal + §7 registre) : date, secret, portée, actions.
4. **Vérifier les journaux d'accès** du service concerné pour tout usage abusif depuis l'exposition.
5. **Comprendre la cause** et renforcer (règle gitleaks manquante ? fichier hors `.gitignore` ?).

## Mesures appliquées par défaut
- Aucun secret dans Git : `.env` git-ignoré ; scan **gitleaks** en hook de commit **et** en CI (S4).
- Branches `main`/`develop` protégées, CI verte requise, historique linéaire.
- Dépendances : mises à jour automatisées (Renovate/Dependabot) — *à activer*.
- Commits signés : *recommandé* — activer la signature GPG/SSH et l'exiger en protection de branche.
