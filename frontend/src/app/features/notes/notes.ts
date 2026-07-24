import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { moisCalendaire } from '../../core/domain/caisse.models';

/** Cahier de séance : une page de notes libre par réunion mensuelle du cycle. */
@Component({
  selector: 'app-notes',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class Notes implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);

  protected readonly seance = signal(1); // position de la séance affichée
  protected readonly texte = signal('');
  protected readonly chargement = signal(true);
  protected readonly enregistreLe = signal<string | null>(null);

  /** Notes du cycle, indexées par mois de séance. */
  private readonly parMois = signal<Map<number, { texte: string; modifieLe: string }>>(new Map());

  protected readonly seanceNom = computed(() => {
    this.lang.langue();
    return this.i18n.instant('mois.' + moisCalendaire(this.seance(), this.cycleStore.moisDebut()));
  });
  /** Une année de tontine = 12 réunions mensuelles ; le cahier couvre tout le cycle. */
  protected readonly derniereSeance = 12;

  ngOnInit(): void {
    this.charger();
  }

  seancePrecedente(): void {
    if (this.seance() > 1) {
      this.seance.update((s) => s - 1);
      this.afficherSeance();
    }
  }

  seanceSuivante(): void {
    if (this.seance() < this.derniereSeance) {
      this.seance.update((s) => s + 1);
      this.afficherSeance();
    }
  }

  /** Auto-enregistrement quand la trésorière quitte la zone de texte (rien si inchangé). */
  enregistrer(): void {
    const mois = this.seance();
    const texte = this.texte();
    if (texte === (this.parMois().get(mois)?.texte ?? '')) return;
    this.caisse.enregistrerNoteSeance(this.cycleStore.cycleId(), mois, texte).subscribe({
      next: (note) => {
        this.parMois.update((m) =>
          new Map(m).set(note.mois, { texte: note.texte, modifieLe: note.modifieLe }),
        );
        this.enregistreLe.set(note.modifieLe);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('notes.okTitre'),
          detail: this.seanceNom(),
          life: 2000,
        });
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('notes.errTitre'),
          detail: this.i18n.instant('notes.reessayez'),
        }),
    });
  }

  private charger(): void {
    this.chargement.set(true);
    this.caisse.notesSeance(this.cycleStore.cycleId()).subscribe({
      next: (notes) => {
        const m = new Map<number, { texte: string; modifieLe: string }>();
        for (const n of notes) m.set(n.mois, { texte: n.texte, modifieLe: n.modifieLe });
        this.parMois.set(m);
        this.afficherSeance();
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('notes.errTitre'),
          detail: this.i18n.instant('notes.reessayez'),
        });
      },
    });
  }

  private afficherSeance(): void {
    const n = this.parMois().get(this.seance());
    this.texte.set(n?.texte ?? '');
    this.enregistreLe.set(n?.modifieLe ?? null);
  }

  protected readonly dateFr = (iso: string | null): string =>
    iso
      ? new Date(iso).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
}
