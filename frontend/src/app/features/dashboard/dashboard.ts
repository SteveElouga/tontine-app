import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CaisseService } from '../../core/graphql/caisse.service';
import { RecapMembre } from '../../core/domain/caisse.models';

// Cycle pilote (dev). À remplacer par une vraie sélection de cycle plus tard.
const CYCLE_ID = '8e7323b1-1277-47dd-b358-ee0354d52b3d';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly caisse = inject(CaisseService);

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
    this.caisse.recapCycle(CYCLE_ID).subscribe({
      next: (rows) => {
        this.membres.set(rows);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  protected readonly format = (n: number): string => n.toLocaleString('fr-FR');
}
