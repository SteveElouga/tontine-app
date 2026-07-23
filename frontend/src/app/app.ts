import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { Select } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';

import { CycleStore } from './core/state/cycle-store';
import { AuthStore } from './core/state/auth-store';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  soon?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, FormsModule, Select, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly cycles = inject(CycleStore);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Options du menu : « libellé du cycle ». */
  protected readonly cyclesOpt = computed(() =>
    this.cycles.cycles().map((c) => ({ label: c.libelle, value: c.id })),
  );

  constructor() {
    // Charge (ou recharge) les cycles dès que la trésorière est connectée.
    effect(() => {
      if (this.auth.connecte()) this.cycles.charger();
    });
  }

  deconnecter(): void {
    this.auth.deconnecter();
    this.router.navigate(['/login']);
  }

  protected readonly nav: NavItem[] = [
    { label: 'nav.tableau', icon: 'pi pi-home', route: '/tableau-de-bord' },
    { label: 'nav.saisie', icon: 'pi pi-pencil', route: '/saisie' },
    { label: 'nav.prets', icon: 'pi pi-money-bill', route: '/prets' },
    { label: 'nav.recap', icon: 'pi pi-list', route: '/recapitulatif' },
    { label: 'nav.membres', icon: 'pi pi-users', route: '/membres' },
    { label: 'nav.simulation', icon: 'pi pi-calculator', route: '/simulation' },
    { label: 'nav.historique', icon: 'pi pi-history', route: '/historique' },
  ];

  protected readonly navBas: NavItem[] = [
    { label: 'nav.aide', icon: 'pi pi-question-circle', route: '/aide' },
    { label: 'nav.parametres', icon: 'pi pi-cog', route: '/parametres' },
    { label: 'nav.profil', icon: 'pi pi-user', route: '/profil' },
  ];
}
