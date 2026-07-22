import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
  soon?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home' },
    { label: 'Saisie des dépôts', icon: 'pi pi-pencil', active: true },
    { label: 'Prêts', icon: 'pi pi-money-bill' },
    { label: 'Récapitulatif', icon: 'pi pi-list' },
    { label: 'Membres', icon: 'pi pi-users' },
    { label: 'Simulation', icon: 'pi pi-calculator' },
    { label: 'Historique', icon: 'pi pi-history' },
  ];

  protected readonly navBas: NavItem[] = [
    { label: 'Paramètres', icon: 'pi pi-cog', soon: true },
    { label: 'Profil', icon: 'pi pi-user', soon: true },
  ];
}
