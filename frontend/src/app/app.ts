import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Tooltip } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CycleStore } from './core/state/cycle-store';
import { AuthStore } from './core/state/auth-store';
import { LayoutStore } from './core/state/layout-store';
import { CaisseService } from './core/graphql/caisse.service';
import { UndoBanner } from './shared/undo-banner/undo-banner';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  soon?: boolean;
  tour?: string;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Toast,
    FormsModule,
    Select,
    Dialog,
    InputText,
    Tooltip,
    TranslatePipe,
    UndoBanner,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly cycles = inject(CycleStore);
  protected readonly auth = inject(AuthStore);
  protected readonly layout = inject(LayoutStore);
  private readonly router = inject(Router);
  private readonly caisse = inject(CaisseService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  /** Options du sélecteur de tontine (caisse). */
  protected readonly caissesOpt = computed(() =>
    this.cycles.caisses().map((c) => ({ label: c.nom, value: c.id })),
  );

  /** Options du sélecteur de cycle : les années de la tontine courante. */
  protected readonly cyclesOpt = computed(() =>
    this.cycles.cyclesCaisse().map((c) => ({ label: c.libelle, value: c.id })),
  );

  // Création d'une nouvelle tontine
  protected readonly creationOuverte = signal(false);
  protected readonly nouvNom = signal('');
  protected readonly nouvLibelle = signal('');
  protected readonly envoi = signal(false);

  constructor() {
    // Charge (ou recharge) les cycles dès que la trésorière est connectée.
    effect(() => {
      if (this.auth.sessionActive()) this.cycles.charger();
    });
  }

  deconnecter(): void {
    this.auth.deconnecter();
    this.router.navigate(['/login']);
  }

  /** Change de cycle et recharge l'écran courant pour qu'il lise le nouveau cycle. */
  changerCycle(id: string): void {
    if (id === this.cycles.cycleId()) return;
    this.cycles.choisir(id);
    this.rechargerEcran();
  }

  /** Change de tontine (bascule sur son cycle courant) et recharge l'écran. */
  changerCaisse(id: string): void {
    if (id === this.cycles.caisseId()) return;
    this.cycles.choisirCaisse(id);
    this.rechargerEcran();
  }

  ouvrirCreation(): void {
    this.nouvNom.set('');
    this.nouvLibelle.set('');
    this.creationOuverte.set(true);
  }

  /** Crée la tontine (caisse + premier cycle) puis bascule dessus. */
  creer(): void {
    const nom = this.nouvNom().trim();
    const libelle = this.nouvLibelle().trim();
    if (!nom || !libelle || this.envoi()) return;
    this.envoi.set(true);
    this.caisse.creerCaisse(nom, libelle).subscribe({
      next: (cyc) => {
        this.envoi.set(false);
        this.creationOuverte.set(false);
        this.cycles.charger();
        this.cycles.choisir(cyc.id);
        this.rechargerEcran();
        this.messages.add({ severity: 'success', summary: this.i18n.instant('tontine.okCree') });
      },
      error: () => {
        this.envoi.set(false);
        this.messages.add({ severity: 'error', summary: this.i18n.instant('tontine.errCree') });
      },
    });
  }

  /** Recrée le composant de la route courante pour qu'il relise le cycle. */
  private rechargerEcran(): void {
    const strategie = this.router.routeReuseStrategy;
    const reuseInitial = strategie.shouldReuseRoute;
    strategie.shouldReuseRoute = () => false; // force la recréation du composant courant
    void this.router.navigateByUrl(this.router.url).then(() => {
      strategie.shouldReuseRoute = reuseInitial;
    });
  }

  protected readonly nav: NavItem[] = [
    { label: 'nav.tableau', icon: 'pi pi-home', route: '/tableau-de-bord', tour: 'tableau' },
    { label: 'nav.saisie', icon: 'pi pi-pencil', route: '/saisie', tour: 'saisie' },
    { label: 'nav.prets', icon: 'pi pi-money-bill', route: '/prets', tour: 'prets' },
    { label: 'nav.recap', icon: 'pi pi-list', route: '/recapitulatif', tour: 'recap' },
    { label: 'nav.membres', icon: 'pi pi-users', route: '/membres', tour: 'membres' },
    { label: 'nav.simulation', icon: 'pi pi-calculator', route: '/simulation', tour: 'simulation' },
    { label: 'nav.historique', icon: 'pi pi-history', route: '/historique', tour: 'historique' },
    { label: 'nav.notes', icon: 'pi pi-book', route: '/notes' },
  ];

  protected readonly navBas: NavItem[] = [
    { label: 'nav.aide', icon: 'pi pi-question-circle', route: '/aide', tour: 'aide' },
    { label: 'nav.parametres', icon: 'pi pi-cog', route: '/parametres', tour: 'parametres' },
    { label: 'nav.profil', icon: 'pi pi-user', route: '/profil', tour: 'profil' },
  ];
}
