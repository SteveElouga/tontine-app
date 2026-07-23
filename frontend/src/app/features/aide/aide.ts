import { Component } from '@angular/core';

@Component({
  selector: 'app-aide',
  imports: [],
  templateUrl: './aide.html',
  styleUrl: './aide.scss',
})
export class Aide {
  protected readonly ecrans = [
    { icon: 'pi pi-home', nom: 'Tableau de bord', desc: "Les grands totaux de la caisse, d'un seul coup d'œil." },
    { icon: 'pi pi-pencil', nom: 'Saisie des dépôts', desc: 'Noter les versements, par mois ou par membre.' },
    { icon: 'pi pi-money-bill', nom: 'Prêts', desc: "Noter un prêt, puis son remboursement quand l'argent revient." },
    { icon: 'pi pi-list', nom: 'Récapitulatif', desc: "Ce que chaque membre reçoit à la fin de l'année." },
    { icon: 'pi pi-users', nom: 'Membres', desc: 'Ajouter, renommer ou retirer un membre.' },
    { icon: 'pi pi-calculator', nom: 'Simulation', desc: 'Voir ce que rapporterait un dépôt ou un prêt, sans rien enregistrer.' },
    { icon: 'pi pi-history', nom: 'Historique', desc: 'Tout ce qui a été fait, du plus récent au plus ancien.' },
  ];
}
