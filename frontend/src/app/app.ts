import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { Select } from 'primeng/select';

import { CycleStore } from './core/state/cycle-store';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  soon?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, FormsModule, Select],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly cycles = inject(CycleStore);

  /** Options du menu : « Caisse · libellé ». */
  protected readonly cyclesOpt = computed(() =>
    this.cycles.cycles().map((c) => ({ label: c.libelle, value: c.id })),
  );

  ngOnInit(): void {
    this.cycles.charger();
  }

  protected readonly nav: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home', route: '/tableau-de-bord' },
    { label: 'Saisie des dépôts', icon: 'pi pi-pencil', route: '/saisie' },
    { label: 'Prêts', icon: 'pi pi-money-bill', route: '/prets' },
    { label: 'Récapitulatif', icon: 'pi pi-list', route: '/recapitulatif' },
    { label: 'Membres', icon: 'pi pi-users', route: '/membres' },
    { label: 'Simulation', icon: 'pi pi-calculator' },
    { label: 'Historique', icon: 'pi pi-history', route: '/historique' },
  ];

  protected readonly navBas: NavItem[] = [
    { label: 'Paramètres', icon: 'pi pi-cog', soon: true },
    { label: 'Profil', icon: 'pi pi-user', soon: true },
  ];
}
