import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { UndoStore } from '../../core/state/undo-store';
import { MoisNomPipe, moisAnnee } from '../../core/i18n/mois.pipe';

interface Ligne {
  label: string;
  memberId: string;
  moisIndex: number;
  montant: number | null; // valeur affichée dans le champ
  montantEnregistre: number | null; // valeur réellement persistée (pour annuler / effacer)
  enregistre: boolean;
  date: string | null; // ISO du jour de la saisie (null si pas encore enregistré)
}

/** Un montant en chaîne (API) → valeur d'affichage (null si 0) + état « déjà enregistré ». */
function versLigne(valeur: string): { montant: number | null; enregistre: boolean } {
  const n = Number(valeur);
  return { montant: n > 0 ? n : null, enregistre: n > 0 };
}

// Mémorise le mois affiché en vue « Par mois » : au retour dans l'app, on retrouve le
// même mois plutôt que de repartir à Octobre.
const CLE_MOIS = 'tontine-saisie-mois';

function moisInitial(): number {
  const brut = Number(localStorage.getItem(CLE_MOIS));
  return brut >= 1 ? brut : 2; // Octobre par défaut, à la première visite
}

@Component({
  selector: 'app-saisie',
  imports: [FormsModule, InputNumber, Button, Select, TranslatePipe, MoisNomPipe],
  templateUrl: './saisie.html',
  styleUrl: './saisie.scss',
})
export class Saisie implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);
  private readonly undo = inject(UndoStore);

  protected readonly vue = signal<'mois' | 'membre'>('mois');
  protected readonly moisIndex = signal(moisInitial());
  protected readonly membres = signal<{ id: string; nom: string }[]>([]);
  protected readonly membreIndex = signal(0);
  protected readonly lignes = signal<Ligne[]>([]);
  protected readonly chargement = signal(true);
  /** Ferme après le tout premier chargement réussi (mois ou membre) : la cascade
   *  d'entrée des lignes (voir grille-membres--entree) ne doit jouer qu'une fois
   *  par visite d'écran, jamais aux changements de mois/membre. */
  protected readonly entreeInitiale = signal(true);
  /** Jour de la saisie (ISO) — par défaut aujourd'hui, modifiable en vue « Par mois ». */
  protected readonly dateSaisie = signal<string>(this.aujourdhui());

  protected readonly moisNom = computed(() => {
    this.lang.langue();
    return moisAnnee(
      this.i18n,
      this.moisIndex(),
      this.cycleStore.moisDebut(),
      this.cycleStore.anneeDebut(),
    );
  });
  /** Tontine et cycle réellement ouverts — le sous-titre les nommait en dur. */
  protected readonly caisseNom = computed(() => this.cycleStore.caisseNom());
  protected readonly cycleLibelle = computed(() => this.cycleStore.libelle());

  protected readonly membreCourant = computed(() => this.membres()[this.membreIndex()]);
  /** Options du sélecteur de membre (vue « Par membre »), pour la recherche directe. */
  protected readonly optMembres = computed(() =>
    this.membres().map((m) => ({ label: m.nom, value: m.id })),
  );
  /** Mois de dépôt possibles : septembre → septembre (jusqu'au délai) ; juin→sept = 0 %. */
  protected readonly nbMoisDepot = computed(() => this.cycleStore.moisDelai());
  protected readonly taux = computed(() =>
    Math.max(0, 5 * (this.cycleStore.dureeDepot() - this.moisIndex() + 1)),
  );
  protected readonly total = computed(() =>
    this.lignes().reduce((s, l) => s + (l.montant ?? 0), 0),
  );
  protected readonly nbEnregistres = computed(() =>
    this.lignes().filter((l) => l.enregistre).length,
  );

  ngOnInit(): void {
    // Le mois mémorisé peut dépasser la plage du cycle courant (ex. tontine différente) :
    // on le borne avant le premier chargement.
    const max = this.nbMoisDepot();
    if (this.moisIndex() > max) this.moisIndex.set(max);
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
      this.memoriserMois();
      this.chargerMois();
    }
  }
  moisSuivant(): void {
    if (this.moisIndex() < this.nbMoisDepot()) {
      this.moisIndex.update((m) => m + 1);
      this.memoriserMois();
      this.chargerMois();
    }
  }

  private memoriserMois(): void {
    localStorage.setItem(CLE_MOIS, String(this.moisIndex()));
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

  /** Va directement au membre choisi dans la recherche. */
  choisirMembre(id: string): void {
    const i = this.membres().findIndex((m) => m.id === id);
    if (i >= 0 && i !== this.membreIndex()) {
      this.membreIndex.set(i);
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
    if (!courant) return;
    const avant = courant.montantEnregistre; // état persistant AVANT l'action
    const apres = courant.montant && courant.montant > 0 ? courant.montant : null;
    if (apres === avant) return; // rien n'a changé
    const jour = this.vue() === 'mois' ? this.dateSaisie() : (courant.date ?? this.aujourdhui());
    const cid = this.cycleStore.cycleId();

    if (apres != null) {
      // Enregistrement (ou modification) du dépôt.
      this.caisse.ajouterDepot(cid, courant.memberId, courant.moisIndex, apres, jour).subscribe({
        next: () => {
          this.majLigne(courant, apres, jour);
          this.undo.proposer(
            this.i18n.instant('saisie.undoEnregistre', { montant: this.format(apres) }),
            () => this.restaurer(courant, avant, jour),
          );
        },
        error: () => this.erreurEnregistrement(),
      });
    } else {
      // Champ vidé alors qu'un dépôt existait → suppression.
      this.caisse.supprimerDepot(cid, courant.memberId, courant.moisIndex).subscribe({
        next: () => {
          this.majLigne(courant, null, null);
          this.undo.proposer(this.i18n.instant('saisie.undoSupprime'), () =>
            this.restaurer(courant, avant, jour),
          );
        },
        error: () => this.erreurEnregistrement(),
      });
    }
  }

  /** Met à jour l'état persistant d'une ligne après un aller-retour serveur. */
  private majLigne(ref: Ligne, valeur: number | null, jour: string | null): void {
    this.lignes.update((ls) =>
      ls.map((l) =>
        l.memberId === ref.memberId && l.moisIndex === ref.moisIndex
          ? {
              ...l,
              montant: valeur,
              montantEnregistre: valeur,
              enregistre: valeur != null,
              date: valeur != null ? jour : null,
            }
          : l,
      ),
    );
  }

  /** Annulation : restaure la ligne à sa valeur persistée précédente. */
  private restaurer(ref: Ligne, valeur: number | null, jour: string): void {
    const cid = this.cycleStore.cycleId();
    if (valeur != null) {
      this.caisse.ajouterDepot(cid, ref.memberId, ref.moisIndex, valeur, jour).subscribe({
        next: () => this.majLigne(ref, valeur, jour),
        error: () => this.erreurEnregistrement(),
      });
    } else {
      this.caisse.supprimerDepot(cid, ref.memberId, ref.moisIndex).subscribe({
        next: () => this.majLigne(ref, null, null),
        error: () => this.erreurEnregistrement(),
      });
    }
  }

  private erreurEnregistrement(): void {
    this.toast.add({
      severity: 'error',
      summary: this.i18n.instant('saisie.errTitre'),
      detail: this.i18n.instant('saisie.reessayez'),
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
            return {
              label: r.nom,
              memberId: r.id,
              moisIndex: mois,
              montant,
              montantEnregistre: montant,
              enregistre,
              date: r.date ?? null,
            };
          }),
        );
        // Pré-remplit le sélecteur avec la date de la réunion du mois, sinon aujourd'hui.
        this.dateSaisie.set(rows.find((r) => r.date)?.date ?? this.aujourdhui());
        this.chargement.set(false);
        if (this.entreeInitiale()) {
          setTimeout(() => this.entreeInitiale.set(false), 600);
        }
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
              montantEnregistre: montant,
              enregistre,
              date: r.date ?? null,
            };
          }),
        );
        this.chargement.set(false);
        if (this.entreeInitiale()) {
          setTimeout(() => this.entreeInitiale.set(false), 600);
        }
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

  /** Date du jour au format ISO local (YYYY-MM-DD), pour l'input date et le défaut. */
  protected aujourdhui(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Jour ISO → « 25 octobre 2026 » (long) ou « 25 oct. 2026 » (court), selon la langue. */
  private formatJour(iso: string, mois: 'long' | 'short'): string {
    if (!iso) return '';
    const loc = this.lang.langue() === 'en' ? 'en-US' : 'fr-FR';
    return new Date(iso + 'T00:00:00').toLocaleDateString(loc, {
      day: 'numeric',
      month: mois,
      year: 'numeric',
    });
  }
  protected readonly jourFormate = computed(() => this.formatJour(this.dateSaisie(), 'long'));
  protected jourCourt(iso: string | null | undefined): string {
    return iso ? this.formatJour(iso, 'short') : '';
  }

  /** Décalage d'entrée en cascade, plafonné pour ne pas s'étirer sur une longue liste. */
  protected retardEntree(i: number): number {
    return Math.min(i * 30, 240);
  }
}
