import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { TourService } from '../../core/tour/tour-service';
import { ParametresCycle, moisCalendaire } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-aide',
  imports: [TranslatePipe],
  templateUrl: './aide.html',
  styleUrl: './aide.scss',
})
export class Aide implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);
  private readonly tour = inject(TourService);

  private readonly params = signal<ParametresCycle | null>(null);

  /** Valeurs réelles du cycle pour l'aide (taux, mois), réactives à la langue et au cycle. */
  protected readonly infos = computed(() => {
    this.lang.langue();
    const p = this.params();
    const debut = p ? p.moisDebut : this.cycleStore.moisDebut();
    const duree = p ? p.dureeDepot : 9;
    const delai = p ? p.moisDelai : 12;
    const tauxE = p ? Math.round(Number(p.tauxEpargne) * 100) : 5;
    const tauxM = p ? Math.round(Number(p.tauxMajoration) * 100) : 5;
    const nom = (pos: number): string => this.i18n.instant('mois.' + moisCalendaire(pos, debut));
    return {
      taux: tauxE,
      tauxMajo: tauxM,
      premier: nom(1),
      deuxieme: nom(2),
      dernier: nom(duree),
      delai: nom(delai),
      tauxPremier: tauxE * duree,
      tauxDeuxieme: tauxE * (duree - 1),
    };
  });

  protected readonly ecrans = [
    { icon: 'pi pi-home', nomKey: 'nav.tableau', descKey: 'aide.e1' },
    { icon: 'pi pi-pencil', nomKey: 'nav.saisie', descKey: 'aide.e2' },
    { icon: 'pi pi-money-bill', nomKey: 'nav.prets', descKey: 'aide.e3' },
    { icon: 'pi pi-list', nomKey: 'nav.recap', descKey: 'aide.e4' },
    { icon: 'pi pi-users', nomKey: 'nav.membres', descKey: 'aide.e5' },
    { icon: 'pi pi-calculator', nomKey: 'nav.simulation', descKey: 'aide.e6' },
    { icon: 'pi pi-history', nomKey: 'nav.historique', descKey: 'aide.e7' },
  ];

  ngOnInit(): void {
    this.caisse.parametresCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => this.params.set(p),
      error: () => {},
    });
  }

  revoir(): void {
    this.tour.demarrer();
  }
}
