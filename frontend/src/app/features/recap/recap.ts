import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

import { CaisseService } from '../../core/graphql/caisse.service';
import { RecapMembre } from '../../core/domain/caisse.models';

// Cycle pilote (dev). À remplacer par une vraie sélection de cycle plus tard.
const CYCLE_ID = '8e7323b1-1277-47dd-b358-ee0354d52b3d';

@Component({
  selector: 'app-recap',
  imports: [Button, RouterLink],
  templateUrl: './recap.html',
  styleUrl: './recap.scss',
})
export class Recap implements OnInit {
  private readonly caisse = inject(CaisseService);

  protected readonly membres = signal<RecapMembre[]>([]);
  protected readonly chargement = signal(true);

  protected readonly totalEpargne = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.epargnePlusInterets), 0),
  );
  protected readonly totalDettes = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.dettes), 0),
  );
  protected readonly totalRecevoir = computed(() =>
    this.membres().reduce((s, m) => s + Number(m.positionNette), 0),
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

  protected readonly n = (v: string): number => Number(v);
  protected readonly format = (v: string | number): string => Number(v).toLocaleString('fr-FR');

  imprimer(): void {
    window.print();
  }
}
