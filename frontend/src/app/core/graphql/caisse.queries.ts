/** Requêtes et mutations GraphQL de la caisse mutuelle. */
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

/** Sonde de santé de l'API. */
export const SANTE = gql`
  query Sante {
    sante
  }
`;
