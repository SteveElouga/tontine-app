import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { InfosCloture, RecapMembre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-recap',
  imports: [Button, RouterLink, FormsModule, InputText, InputNumber, Select, TranslatePipe, Tooltip],
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

  protected readonly totalDepose = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.totalDepose), 0),
  );
  protected readonly totalInterets = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.interets), 0),
  );
  protected readonly totalDettes = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.dettes), 0),
  );
  protected readonly totalRecevoir = computed(() =>
    this.membresFiltres().reduce((s, m) => s + Number(m.positionNette), 0),
  );

  // Mode de répartition des intérêts à la clôture
  protected readonly mode = signal('complet');
  protected readonly nMois = signal(0);
  protected readonly infos = signal<InfosCloture | null>(null);

  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);

  protected readonly optModes = computed(() => {
    this.lang.langue();
    return [
      { label: this.i18n.instant('recap.mode.complet'), value: 'complet' },
      { label: this.i18n.instant('recap.mode.reduction'), value: 'reduction' },
      { label: this.i18n.instant('recap.mode.prorata'), value: 'prorata' },
      { label: this.i18n.instant('recap.mode.egal'), value: 'egal' },
    ];
  });

  ngOnInit(): void {
    this.caisse.infosCloture(this.cycleStore.cycleId()).subscribe({
      next: (i) => this.infos.set(i),
      error: () => {},
    });
    this.recharger();
  }

  changerMode(mode: string): void {
    this.mode.set(mode);
    if (mode === 'reduction' && this.nMois() === 0) {
      this.nMois.set(this.infos()?.reductionSuggeree ?? 0);
    }
    this.recharger();
  }

  setN(n: number | null): void {
    this.nMois.set(Math.max(0, Math.min(9, n ?? 0)));
    this.recharger();
  }

  private recharger(): void {
    this.chargement.set(true);
    this.caisse.recapCycle(this.cycleStore.cycleId(), this.mode(), this.nMois()).subscribe({
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
