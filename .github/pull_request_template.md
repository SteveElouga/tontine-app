<!-- Cette PR cible TOUJOURS `develop` (sauf release develop -> main, ou hotfix/* -> main). Voir MEMORY.md. -->

## Story
Réf. **TON-** <!-- id de la story -->

## Description
<!-- Ce que fait cette PR, en une ou deux phrases -->

## Definition of Done
- [ ] Tests écrits (métier avant le code) ; critères d'acceptation passent
- [ ] Pas de régression ; couverture des règles métier touchées
- [ ] **CI verte** (dont **Scan de secrets**)
- [ ] Branche **rebasée** sur sa base ; cette PR **cible `develop`** (ou `main` si hotfix)
- [ ] `MEMORY.md` mis à jour (état courant + journal)
<!-- Ajoute ici les critères spécifiques au projet (contrats GraphQL, migrations, sécurité…) -->

## Vérifications (MEMORY.md)
- [ ] Aucun `.env` ni secret dans la PR (S1/S2/S4)
- [ ] Message(s) de commit en **Conventional Commits**
