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
