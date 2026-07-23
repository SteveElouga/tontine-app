import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { RecapMembre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-recap',
  imports: [Button, RouterLink, FormsModule, InputText],
  templateUrl: './recap.html',
  styleUrl: './recap.scss',
})
export class Recap implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);

  protected readonly membres = signal<RecapMembre[]>([]);
  protected readonly chargement = signal(true);
  protected readonly recherche = signal('');

  /** Lignes filtrées par la recherche (par nom). */
  protected readonly membresFiltres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const rows = this.membres();
    return q ? rows.filter((m) => m.nom.toLowerCase().includes(q)) : rows;
  });

  protected readonly totalEpargne = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.epargnePlusInterets), 0),
  );
  protected readonly totalDettes = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.dettes), 0),
  );
  protected readonly totalRecevoir = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.positionNette), 0),
  );

  ngOnInit(): void {
    this.caisse.recapCycle(this.cycleStore.cycleId()).subscribe({
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
