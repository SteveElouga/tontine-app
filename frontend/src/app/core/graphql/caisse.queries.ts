import { gql } from 'apollo-angular';

/** Récapitulatif de tous les membres d'un cycle. */
export const RECAP_CYCLE = gql`
  query RecapCycle($cycleId: ID!) {
    recapCycle(cycleId: $cycleId) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      dettes
      positionNette
    }
  }
`;

/** Enregistre (ou met à jour) un dépôt, et renvoie le récap à jour du membre. */
export const AJOUTER_DEPOT = gql`
  mutation AjouterDepot($cycleId: ID!, $memberId: ID!, $moisIndex: Int!, $montant: Decimal!) {
    ajouterDepot(
      cycleId: $cycleId
      memberId: $memberId
      moisIndex: $moisIndex
      montant: $montant
    ) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      positionNette
    }
  }
`;

/** Montant déposé par chaque membre pour un mois donné (pré-remplissage « Par mois »). */
export const DEPOTS_MOIS = gql`
  query DepotsMois($cycleId: ID!, $moisIndex: Int!) {
    depotsMois(cycleId: $cycleId, moisIndex: $moisIndex) {
      id
      nom
      montant
    }
  }
`;

/** Montant déposé par un membre à chaque mois (vue « Par membre »). */
export const DEPOTS_MEMBRE = gql`
  query DepotsMembre($cycleId: ID!, $memberId: ID!) {
    depotsMembre(cycleId: $cycleId, memberId: $memberId) {
      moisIndex
      montant
    }
  }
`;

/** Liste des membres actifs de la caisse. */
export const MEMBRES = gql`
  query Membres($cycleId: ID!) {
    membres(cycleId: $cycleId) {
      id
      nom
      telephone
      actif
    }
  }
`;

export const AJOUTER_MEMBRE = gql`
  mutation AjouterMembre($cycleId: ID!, $nom: String!, $telephone: String) {
    ajouterMembre(cycleId: $cycleId, nom: $nom, telephone: $telephone) {
      id
      nom
      telephone
      actif
    }
  }
`;

export const RENOMMER_MEMBRE = gql`
  mutation RenommerMembre($memberId: ID!, $nom: String!) {
    renommerMembre(memberId: $memberId, nom: $nom) {
      id
      nom
    }
  }
`;

export const RETIRER_MEMBRE = gql`
  mutation RetirerMembre($memberId: ID!) {
    retirerMembre(memberId: $memberId)
  }
`;

/** Détail complet d'un membre (transparence : d'où vient son montant). */
export const FICHE_MEMBRE = gql`
  query FicheMembre($cycleId: ID!, $memberId: ID!) {
    ficheMembre(cycleId: $cycleId, memberId: $memberId) {
      id
      nom
      depots {
        moisIndex
        montant
        taux
        interet
      }
      prets {
        montant
        moisPret
        moisRemboursement
        moisDeDette
        majoration
        totalARembourser
      }
      totalDepose
      interets
      epargnePlusInterets
      dettes
      positionNette
    }
  }
`;

/** Tous les prêts d'un cycle (avec majoration, total, statut). */
export const PRETS_CYCLE = gql`
  query PretsCycle($cycleId: ID!) {
    pretsCycle(cycleId: $cycleId) {
      id
      membreId
      nom
      montant
      moisPret
      moisRemboursement
      moisDeDette
      majoration
      totalARembourser
      rembourse
    }
  }
`;

/** Enregistre un prêt accordé à un membre. */
export const AJOUTER_PRET = gql`
  mutation AjouterPret($cycleId: ID!, $memberId: ID!, $montant: Decimal!, $moisPret: Int!) {
    ajouterPret(cycleId: $cycleId, memberId: $memberId, montant: $montant, moisPret: $moisPret) {
      id
      membreId
      nom
      montant
      moisPret
      moisRemboursement
      moisDeDette
      majoration
      totalARembourser
      rembourse
    }
  }
`;

/** Marque un prêt remboursé (mois indiqué ; vide = au délai d'août). */
export const REMBOURSER_PRET = gql`
  mutation RembourserPret($pretId: ID!, $moisRemboursement: Int) {
    rembourserPret(pretId: $pretId, moisRemboursement: $moisRemboursement) {
      id
      membreId
      nom
      montant
      moisPret
      moisRemboursement
      moisDeDette
      majoration
      totalARembourser
      rembourse
    }
  }
`;
