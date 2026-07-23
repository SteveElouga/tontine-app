import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { TourService } from '../../core/tour/tour-service';
import { RecapMembre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly tour = inject(TourService);

  protected readonly membres = signal<RecapMembre[]>([]);
  protected readonly chargement = signal(true);

  protected readonly nbMembres = computed(() => this.membres().length);
  protected readonly epargne = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.totalDepose), 0),
  );
  protected readonly interets = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.interets), 0),
  );
  protected readonly aReverser = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.positionNette), 0),
  );
  protected readonly pretsEnCours = computed(
    () => this.membres().filter((m) => Number(m.dettes) > 0).length,
  );

  ngOnInit(): void {
    this.caisse.recapCycle(this.cycleStore.cycleId()).subscribe({
      next: (rows) => {
        this.membres.set(rows);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
    // Visite guidée à la toute première connexion (délai : laisser le menu s'afficher).
    setTimeout(() => this.tour.demarrerSiPremiereFois(), 600);
  }

  protected readonly format = (n: number): string => n.toLocaleString('fr-FR');
}
