import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { MoisNomPipe } from '../../core/i18n/mois.pipe';
import { moisCalendaire } from '../../core/domain/caisse.models';

const NB_MOIS = 9;

interface Ligne {
  label: string;
  memberId: string;
  moisIndex: number;
  montant: number | null;
  enregistre: boolean;
}

/** Un montant en chaîne (API) → valeur d'affichage (null si 0) + état « déjà enregistré ». */
function versLigne(valeur: string): { montant: number | null; enregistre: boolean } {
  const n = Number(valeur);
  return { montant: n > 0 ? n : null, enregistre: n > 0 };
}

@Component({
  selector: 'app-saisie',
  imports: [FormsModule, InputNumber, Button, TranslatePipe, MoisNomPipe],
  templateUrl: './saisie.html',
  styleUrl: './saisie.scss',
})
export class Saisie implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);

  protected readonly vue = signal<'mois' | 'membre'>('mois');
  protected readonly moisIndex = signal(2); // Octobre
  protected readonly membres = signal<{ id: string; nom: string }[]>([]);
  protected readonly membreIndex = signal(0);
  protected readonly lignes = signal<Ligne[]>([]);
  protected readonly chargement = signal(true);

  protected readonly moisNom = computed(() => {
    this.lang.langue();
    return this.i18n.instant('mois.' + moisCalendaire(this.moisIndex(), this.cycleStore.moisDebut()));
  });
  protected readonly membreCourant = computed(() => this.membres()[this.membreIndex()]);
  protected readonly taux = computed(() => 5 * (NB_MOIS - this.moisIndex() + 1));
  protected readonly total = computed(() =>
    this.lignes().reduce((s, l) => s + (l.montant ?? 0), 0),
  );
  protected readonly nbEnregistres = computed(() =>
    this.lignes().filter((l) => l.enregistre).length,
  );

  ngOnInit(): void {
    this.chargerMois();
  }

  changerVue(v: 'mois' | 'membre'): void {
    if (this.vue() === v) return;
    this.vue.set(v);
    if (v === 'mois') this.chargerMois();
    else this.chargerMembre();
  }

  moisPrecedent(): void {
    if (this.moisIndex() > 1) {
      this.moisIndex.update((m) => m - 1);
      this.chargerMois();
    }
  }
  moisSuivant(): void {
    if (this.moisIndex() < NB_MOIS) {
      this.moisIndex.update((m) => m + 1);
      this.chargerMois();
    }
  }

  membrePrecedent(): void {
    if (this.membreIndex() > 0) {
      this.membreIndex.update((i) => i - 1);
      this.chargerMembre();
    }
  }
  membreSuivant(): void {
    if (this.membreIndex() < this.membres().length - 1) {
      this.membreIndex.update((i) => i + 1);
      this.chargerMembre();
    }
  }

  setMontant(ligne: Ligne, valeur: number | null): void {
    this.lignes.update((ls) =>
      ls.map((l) =>
        l.memberId === ligne.memberId && l.moisIndex === ligne.moisIndex
          ? { ...l, montant: valeur }
          : l,
      ),
    );
  }

  enregistrer(ligne: Ligne): void {
    const courant = this.lignes().find(
      (l) => l.memberId === ligne.memberId && l.moisIndex === ligne.moisIndex,
    );
    if (!courant || courant.montant == null) return;
    this.caisse
      .ajouterDepot(this.cycleStore.cycleId(), courant.memberId, courant.moisIndex, courant.montant)
      .subscribe({
        next: () => {
          this.lignes.update((ls) =>
            ls.map((l) =>
              l.memberId === courant.memberId && l.moisIndex === courant.moisIndex
                ? { ...l, enregistre: true }
                : l,
            ),
          );
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('saisie.okTitre'),
            detail:
              this.vue() === 'mois'
                ? `${courant.label}, ${this.moisNom()}`
                : `${this.i18n.instant('mois.' + moisCalendaire(courant.moisIndex, this.cycleStore.moisDebut()))}, ${this.membreCourant()?.nom}`,
            life: 2500,
          });
        },
        error: () =>
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('saisie.errTitre'),
            detail: this.i18n.instant('saisie.reessayez'),
          }),
      });
  }

  terminer(): void {
    this.toast.add({
      severity: 'info',
      summary: this.i18n.instant('saisie.finTitre'),
      detail: this.i18n.instant('saisie.finDetail', {
        k: this.nbEnregistres(),
        montant: this.format(this.total()),
      }),
    });
  }

  private chargerMois(): void {
    this.chargement.set(true);
    const mois = this.moisIndex();
    this.caisse.depotsMois(this.cycleStore.cycleId(), mois).subscribe({
      next: (rows) => {
        this.membres.set(rows.map((r) => ({ id: r.id, nom: r.nom })));
        this.lignes.set(
          rows.map((r) => {
            const { montant, enregistre } = versLigne(r.montant);
            return { label: r.nom, memberId: r.id, moisIndex: mois, montant, enregistre };
          }),
        );
        this.chargement.set(false);
      },
      error: () => this.erreurChargement(),
    });
  }

  private chargerMembre(): void {
    const membre = this.membreCourant();
    if (!membre) {
      this.lignes.set([]);
      this.chargement.set(false);
      return;
    }
    this.chargement.set(true);
    this.caisse.depotsMembre(this.cycleStore.cycleId(), membre.id).subscribe({
      next: (rows) => {
        this.lignes.set(
          rows.map((r) => {
            const { montant, enregistre } = versLigne(r.montant);
            return {
              label: '',
              memberId: membre.id,
              moisIndex: r.moisIndex,
              montant,
              enregistre,
            };
          }),
        );
        this.chargement.set(false);
      },
      error: () => this.erreurChargement(),
    });
  }

  private erreurChargement(): void {
    this.chargement.set(false);
    this.toast.add({
      severity: 'error',
      summary: this.i18n.instant('saisie.chargeTitre'),
      detail: this.i18n.instant('saisie.chargeDetail'),
    });
  }

  protected readonly format = (n: number): string => n.toLocaleString('fr-FR');
}
