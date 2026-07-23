import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { Operation } from '../../core/domain/caisse.models';

type FiltreType = 'tout' | 'depot' | 'pret';

@Component({
  selector: 'app-historique',
  imports: [FormsModule, InputText, SelectButton, TranslatePipe],
  templateUrl: './historique.html',
  styleUrl: './historique.scss',
})
export class Historique implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly lang = inject(LangStore);
  private readonly i18n = inject(TranslateService);

  protected readonly operations = signal<Operation[]>([]);
  protected readonly chargement = signal(true);

  protected readonly recherche = signal('');
  protected readonly typeFiltre = signal<FiltreType>('tout');

  /** Options du filtre par type, réactives à la langue. */
  protected readonly optType = computed(() => {
    this.lang.langue();
    return [
      { label: this.i18n.instant('historique.tout'), value: 'tout' as FiltreType },
      { label: this.i18n.instant('historique.filtreDepots'), value: 'depot' as FiltreType },
      { label: this.i18n.instant('historique.filtrePrets'), value: 'pret' as FiltreType },
    ];
  });

  /** Opérations filtrées par nom de membre et par type. */
  protected readonly operationsFiltrees = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const type = this.typeFiltre();
    return this.operations().filter((op) => {
      const okType = type === 'tout' || op.type === type;
      const okNom = !q || op.membreNom.toLowerCase().includes(q);
      return okType && okNom;
    });
  });

  ngOnInit(): void {
    this.caisse.historique(this.cycleStore.cycleId()).subscribe({
      next: (ops) => {
        this.operations.set(ops);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  protected fmt(v: string | number): string {
    return Number(v).toLocaleString('fr-FR');
  }

  /** ISO → date localisée selon la langue. */
  protected date(iso: string): string {
    const locale = this.lang.langue() === 'en' ? 'en-GB' : 'fr-FR';
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
