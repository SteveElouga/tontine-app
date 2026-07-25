import { gql } from 'apollo-angular';

/** Liste des cycles (pour le sélecteur de cycle courant). */
export const CYCLES = gql`
  query Cycles {
    cycles {
      id
      caisseId
      libelle
      caisseNom
      statut
      moisDebut
      dureeDepot
      moisDelai
    }
  }
`;

/** Crée une nouvelle tontine (caisse) + son premier cycle. */
export const CREER_CAISSE = gql`
  mutation CreerCaisse($nom: String!, $libelle: String!) {
    creerCaisse(nom: $nom, libelle: $libelle) {
      id
      libelle
      statut
      caisseNom
      moisDebut
      dureeDepot
      moisDelai
      tauxEpargne
      tauxMajoration
    }
  }
`;

/** Évolution mensuelle du cycle : épargne cumulée, encours des prêts, trésorerie (graphe). */
export const SERIE_MENSUELLE = gql`
  query SerieMensuelle($cycleId: ID!) {
    serieMensuelle(cycleId: $cycleId) {
      mois
      epargne
      encours
      tresorerie
    }
  }
`;

/** Synthèse « santé » du cycle : feu (vert/orange/rouge) + phrase. */
export const ETAT_CYCLE = gql`
  query EtatCycle($cycleId: ID!) {
    etatCycle(cycleId: $cycleId) {
      verdict
      texte
      epargne
      interetsPromis
      prets
      majoration
      rembourse
      resteDu
      tresorerie
      tauxRemboursement
    }
  }
`;

/** Règles complètes d'un cycle (écran Paramètres). */
export const PARAMETRES_CYCLE = gql`
  query ParametresCycle($cycleId: ID!) {
    parametresCycle(cycleId: $cycleId) {
      id
      libelle
      statut
      caisseNom
      moisDebut
      dureeDepot
      moisDelai
      tauxEpargne
      tauxMajoration
    }
  }
`;

export const MODIFIER_CYCLE = gql`
  mutation ModifierCycle(
    $cycleId: ID!
    $libelle: String!
    $moisDebut: Int!
    $dureeDepot: Int!
    $moisDelai: Int!
    $tauxEpargne: Decimal!
    $tauxMajoration: Decimal!
  ) {
    modifierCycle(
      cycleId: $cycleId
      libelle: $libelle
      moisDebut: $moisDebut
      dureeDepot: $dureeDepot
      moisDelai: $moisDelai
      tauxEpargne: $tauxEpargne
      tauxMajoration: $tauxMajoration
    ) {
      id
      libelle
      statut
      caisseNom
      moisDebut
      dureeDepot
      moisDelai
      tauxEpargne
      tauxMajoration
    }
  }
`;

export const CREER_CYCLE = gql`
  mutation CreerCycle($cycleReferenceId: ID!, $libelle: String!) {
    creerCycle(cycleReferenceId: $cycleReferenceId, libelle: $libelle) {
      id
      libelle
      statut
    }
  }
`;

export const CLOTURER_CYCLE = gql`
  mutation CloturerCycle($cycleId: ID!) {
    cloturerCycle(cycleId: $cycleId) {
      id
      statut
    }
  }
`;

export const RENOMMER_CAISSE = gql`
  mutation RenommerCaisse($cycleId: ID!, $nom: String!) {
    renommerCaisse(cycleId: $cycleId, nom: $nom) {
      id
      caisseNom
    }
  }
`;

/** Récapitulatif des membres d'un cycle, selon le mode de répartition des intérêts. */
export const RECAP_CYCLE = gql`
  query RecapCycle($cycleId: ID!, $mode: String, $nMois: Int) {
    recapCycle(cycleId: $cycleId, mode: $mode, nMois: $nMois) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      dettes
      capitalEmprunte
      majoration
      totalRembourse
      positionNette
    }
  }
`;

/** Contexte de clôture : gains encaissés, intérêts promis, réduction suggérée. */
export const INFOS_CLOTURE = gql`
  query InfosCloture($cycleId: ID!) {
    infosCloture(cycleId: $cycleId) {
      gains
      totalPromis
      reductionSuggeree
    }
  }
`;

/** Enregistre (ou met à jour) un dépôt, et renvoie le récap à jour du membre. */
export const AJOUTER_DEPOT = gql`
  mutation AjouterDepot(
    $cycleId: ID!
    $memberId: ID!
    $moisIndex: Int!
    $montant: Decimal!
    $date: String
  ) {
    ajouterDepot(
      cycleId: $cycleId
      memberId: $memberId
      moisIndex: $moisIndex
      montant: $montant
      date: $date
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
      date
    }
  }
`;

/** Montant déposé par un membre à chaque mois (vue « Par membre »). */
export const DEPOTS_MEMBRE = gql`
  query DepotsMembre($cycleId: ID!, $memberId: ID!) {
    depotsMembre(cycleId: $cycleId, memberId: $memberId) {
      moisIndex
      montant
      date
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
        solde
        totalRembourse
        totalInterets
        echeancier {
          mois
          interet
          paiement
          solde
        }
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
      solde
      totalInterets
      totalRembourse
      remboursements {
        id
        mois
        montant
      }
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
      solde
      totalInterets
      totalRembourse
      remboursements {
        id
        mois
        montant
      }
    }
  }
`;

/** Corrige le montant et/ou le mois d'un prêt. */
export const MODIFIER_PRET = gql`
  mutation ModifierPret($pretId: ID!, $montant: Decimal!, $moisPret: Int!) {
    modifierPret(pretId: $pretId, montant: $montant, moisPret: $moisPret) {
      id
      membreId
      nom
      montant
      moisPret
      solde
      totalInterets
      totalRembourse
      remboursements {
        id
        mois
        montant
      }
    }
  }
`;

/** Enregistre un remboursement partiel d'un prêt (registre v2, intérêts composés). */
export const AJOUTER_REMBOURSEMENT = gql`
  mutation AjouterRemboursement($pretId: ID!, $mois: Int!, $montant: Decimal!) {
    ajouterRemboursement(pretId: $pretId, mois: $mois, montant: $montant) {
      prets {
        id
        membreId
        nom
        montant
        moisPret
        solde
        totalInterets
        totalRembourse
        remboursements {
          id
          mois
          montant
        }
      }
      repartition {
        type
        montant
        moisCible
        remboursementId
      }
    }
  }
`;

/** Retire un montant de l'épargne d'un membre (annulation d'un surplus). */
export const RETIRER_EPARGNE = gql`
  mutation RetirerEpargne($cycleId: ID!, $memberId: ID!, $moisIndex: Int!, $montant: Decimal!) {
    retirerEpargne(cycleId: $cycleId, memberId: $memberId, moisIndex: $moisIndex, montant: $montant)
  }
`;

/** Supprime le dépôt d'un membre pour un mois (annuler / effacer) ; renvoie le récap à jour. */
export const SUPPRIMER_DEPOT = gql`
  mutation SupprimerDepot($cycleId: ID!, $memberId: ID!, $moisIndex: Int!) {
    supprimerDepot(cycleId: $cycleId, memberId: $memberId, moisIndex: $moisIndex) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      positionNette
    }
  }
`;

/** Supprime un prêt (et ses remboursements, en cascade). */
export const SUPPRIMER_PRET = gql`
  mutation SupprimerPret($pretId: ID!) {
    supprimerPret(pretId: $pretId)
  }
`;

/** Supprime un remboursement ; renvoie le prêt à jour. */
export const SUPPRIMER_REMBOURSEMENT = gql`
  mutation SupprimerRemboursement($remboursementId: ID!) {
    supprimerRemboursement(remboursementId: $remboursementId) {
      id
      membreId
      nom
      montant
      moisPret
      solde
      totalInterets
      totalRembourse
      remboursements {
        id
        mois
        montant
      }
    }
  }
`;

/** Journal chronologique des opérations du cycle (dépôts + prêts). */
export const HISTORIQUE = gql`
  query Historique($cycleId: ID!) {
    historique(cycleId: $cycleId) {
      type
      date
      membreNom
      montant
      mois
    }
  }
`;

/** Simulation d'un dépôt hypothétique. */
export const SIMULER_EPARGNE = gql`
  query SimulerEpargne($cycleId: ID!, $montant: Decimal!, $moisIndex: Int!) {
    simulerEpargne(cycleId: $cycleId, montant: $montant, moisIndex: $moisIndex) {
      taux
      interet
      total
    }
  }
`;

/** Simulation d'un prêt hypothétique. */
export const SIMULER_PRET = gql`
  query SimulerPret($cycleId: ID!, $montant: Decimal!, $moisPret: Int!) {
    simulerPret(cycleId: $cycleId, montant: $montant, moisPret: $moisPret) {
      moisDeDette
      majoration
      total
    }
  }
`;

/** Notes de séance d'un cycle (cahier de séance). */
export const NOTES_SEANCE = gql`
  query NotesSeance($cycleId: ID!) {
    notesSeance(cycleId: $cycleId) {
      mois
      texte
      modifieLe
    }
  }
`;

/** Enregistre (remplace) la note d'une séance. */
export const ENREGISTRER_NOTE_SEANCE = gql`
  mutation EnregistrerNoteSeance($cycleId: ID!, $mois: Int!, $texte: String!) {
    enregistrerNoteSeance(cycleId: $cycleId, mois: $mois, texte: $texte) {
      mois
      texte
      modifieLe
    }
  }
`;
