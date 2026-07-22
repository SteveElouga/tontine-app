import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  soon?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home', route: '/tableau-de-bord' },
    { label: 'Saisie des dépôts', icon: 'pi pi-pencil', route: '/saisie' },
    { label: 'Prêts', icon: 'pi pi-money-bill', route: '/prets' },
    { label: 'Récapitulatif', icon: 'pi pi-list', route: '/recapitulatif' },
    { label: 'Membres', icon: 'pi pi-users', route: '/membres' },
    { label: 'Simulation', icon: 'pi pi-calculator' },
    { label: 'Historique', icon: 'pi pi-history' },
  ];

  protected readonly navBas: NavItem[] = [
    { label: 'Paramètres', icon: 'pi pi-cog', soon: true },
    { label: 'Profil', icon: 'pi pi-user', soon: true },
  ];
}
