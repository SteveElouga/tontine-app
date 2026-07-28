import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { TourService } from '../../core/tour/tour-service';
import { EtatCycle, PointSerie, RecapMembre } from '../../core/domain/caisse.models';

type Champ = 'epargne' | 'encours' | 'tresorerie';

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
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);

  protected readonly membres = signal<RecapMembre[]>([]);
  protected readonly chargement = signal(true);
  protected readonly serie = signal<PointSerie[]>([]);
  protected readonly etat = signal<EtatCycle | null>(null);
  protected readonly hoverI = signal<number | null>(null);

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

  /** Vrai si au moins une valeur non nulle : sinon on masque le graphe (tontine vide). */
  protected readonly aDesDonnees = computed(() =>
    this.serie().some((p) => Number(p.epargne) || Number(p.encours) || Number(p.tresorerie)),
  );

  // ── Géométrie du graphe (SVG pur, aucune dépendance) ──────────────────────
  protected readonly VBW = 720;
  protected readonly VBH = 300;
  protected readonly M = { top: 14, right: 16, bottom: 30, left: 62 };
  private readonly plotW = this.VBW - this.M.left - this.M.right;
  private readonly plotH = this.VBH - this.M.top - this.M.bottom;

  /** Plafond « rond » de l'axe Y, juste au-dessus de la plus grande valeur. */
  protected readonly maxY = computed(() => {
    const s = this.serie();
    if (!s.length) return 1;
    const brut = Math.max(
      1,
      ...s.map((p) => Number(p.epargne)),
      ...s.map((p) => Number(p.encours)),
      ...s.map((p) => Number(p.tresorerie)),
    );
    const pas = Math.pow(10, Math.floor(Math.log10(brut))) / 2; // demi-puissance de 10
    return Math.ceil(brut / pas) * pas;
  });

  private x(i: number): number {
    const n = this.serie().length;
    return this.M.left + (n <= 1 ? 0 : (i / (n - 1)) * this.plotW);
  }
  private y(v: number): number {
    return this.M.top + this.plotH - (v / this.maxY()) * this.plotH;
  }
  private ligne(champ: Champ): string {
    return this.serie()
      .map((p, i) => `${this.x(i).toFixed(1)},${this.y(Number(p[champ])).toFixed(1)}`)
      .join(' ');
  }
  protected readonly ptsEpargne = computed(() => this.ligne('epargne'));
  protected readonly ptsEncours = computed(() => this.ligne('encours'));
  protected readonly ptsTresorerie = computed(() => this.ligne('tresorerie'));

  /** 6 graduations Y (0 → plafond), libellées en millions. */
  protected readonly yTicks = computed(() => {
    const max = this.maxY();
    return [0, 1, 2, 3, 4, 5].map((k) => {
      const v = (max * k) / 5;
      return {
        v,
        y: this.y(v),
        label: v === 0 ? '0' : (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M',
      };
    });
  });

  /** Libellés X : abréviation du mois calendaire, réactifs à la langue. */
  protected readonly xLabels = computed(() => {
    this.lang.langue();
    const debut = this.cycleStore.moisDebut();
    return this.serie().map((p, i) => {
      const cal = ((debut - 1 + (p.mois - 1)) % 12) + 1;
      return { i, x: this.x(i), label: this.i18n.instant('moisAbbr.' + cal) };
    });
  });

  /** Libellé du feu (Bonne voie / À surveiller / Attention), réactif à la langue. */
  protected readonly verdictLabel = computed(() => {
    this.lang.langue();
    const e = this.etat();
    return e ? this.i18n.instant('tdb.etat.' + e.verdict) : '';
  });

  /** Survol / appui : retient le mois le plus proche du pointeur. */
  protected survol(ev: PointerEvent): void {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const n = this.serie().length;
    if (!n || rect.width === 0) return;
    const vbX = ((ev.clientX - rect.left) / rect.width) * this.VBW;
    let i = Math.round(((vbX - this.M.left) / this.plotW) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    this.hoverI.set(i);
  }

  /** Ligne verticale de repère au mois survolé (coordonnée SVG). */
  protected readonly hoverX = computed(() => {
    const i = this.hoverI();
    return i === null ? null : this.x(i);
  });

  /** Gros points mis en évidence sur les 3 courbes au mois survolé. */
  protected readonly hoverDots = computed(() => {
    const i = this.hoverI();
    if (i === null) return [];
    const p = this.serie()[i];
    return (['epargne', 'encours', 'tresorerie'] as Champ[]).map((c) => ({
      cls: c,
      x: this.x(i),
      y: this.y(Number(p[c])),
    }));
  });

  /** Bulle d'info : mois + année et les 3 montants au point survolé. */
  protected readonly hoverInfo = computed(() => {
    this.lang.langue();
    const i = this.hoverI();
    if (i === null) return null;
    const p = this.serie()[i];
    const brut = this.cycleStore.moisDebut() - 1 + (p.mois - 1);
    const cal = (brut % 12) + 1;
    const annee = this.cycleStore.anneeDebut() + Math.floor(brut / 12);
    return {
      leftPct: Math.min(85, Math.max(15, (this.x(i) / this.VBW) * 100)),
      label: this.i18n.instant('moisAbbr.' + cal) + ' ' + annee,
      ep: this.format(p.epargne),
      en: this.format(p.encours),
      tr: this.format(p.tresorerie),
    };
  });

  constructor() {
    // La phrase d'état est dans la langue de l'app : on la recharge si la langue
    // change pendant que le tableau de bord est ouvert (pas besoin de re-naviguer).
    effect(() => {
      const langue = this.lang.langue();
      this.caisse.etatCycle(this.cycleStore.cycleId(), langue).subscribe({
        next: (e) => this.etat.set(e),
        error: () => {},
      });
    });
  }

  ngOnInit(): void {
    const id = this.cycleStore.cycleId();
    this.caisse.recapCycle(id).subscribe({
      next: (rows) => {
        this.membres.set(rows);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
    this.caisse.serieMensuelle(id).subscribe({ next: (s) => this.serie.set(s), error: () => {} });
    // Visite guidée à la toute première connexion (délai : laisser le menu s'afficher).
    setTimeout(() => this.tour.demarrerSiPremiereFois(), 600);
  }

  protected readonly format = (n: number | string): string => Number(n).toLocaleString('fr-FR');
}
