import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { ThemeStore } from '../../core/state/theme-store';
import { LangStore, Langue } from '../../core/state/lang-store';
import { ParametresCycle } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-parametres',
  imports: [FormsModule, InputNumber, Select, Button, SelectButton, TranslatePipe],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class Parametres implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  protected readonly theme = inject(ThemeStore);
  protected readonly lang = inject(LangStore);

  // Les noms de langue restent dans leur propre langue (endonymes).
  protected readonly optLangue: { label: string; value: Langue }[] = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' },
  ];

  protected readonly chargement = signal(true);
  protected readonly params = signal<ParametresCycle | null>(null);

  // La caisse
  protected readonly caisseNom = signal('');

  protected readonly optTheme = computed(() => {
    this.lang.langue();
    return [
      { label: this.i18n.instant('param.themeClair'), value: false },
      { label: this.i18n.instant('param.themeSombre'), value: true },
    ];
  });

  // Règles du cycle
  protected readonly libelle = signal('');
  protected readonly tauxEpargnePct = signal(5);
  protected readonly tauxMajoPct = signal(5);
  protected readonly dureeDepot = signal(9);
  protected readonly moisDelai = signal(12);

  // Nouvelle année
  protected readonly nouveauLibelle = signal('');

  protected readonly optDelai = computed(() => {
    this.lang.langue();
    return [
      { label: this.i18n.instant('mois.10'), value: 10 },
      { label: this.i18n.instant('mois.11'), value: 11 },
      { label: this.i18n.instant('mois.12'), value: 12 },
    ];
  });

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.caisse.parametresCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.params.set(p);
        this.caisseNom.set(p.caisseNom);
        this.libelle.set(p.libelle);
        this.tauxEpargnePct.set(Math.round(Number(p.tauxEpargne) * 100));
        this.tauxMajoPct.set(Math.round(Number(p.tauxMajoration) * 100));
        this.dureeDepot.set(p.dureeDepot);
        this.moisDelai.set(p.moisDelai);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur(this.i18n.instant('param.errCharge'));
      },
    });
  }

  enregistrer(): void {
    const lib = this.libelle().trim();
    if (!lib) {
      this.erreur(this.i18n.instant('param.errLibObligatoire'));
      return;
    }
    this.caisse
      .modifierCycle(
        this.cycleStore.cycleId(),
        lib,
        this.dureeDepot(),
        this.moisDelai(),
        this.tauxEpargnePct() / 100,
        this.tauxMajoPct() / 100,
      )
      .subscribe({
        next: (p) => {
          this.params.set(p);
          this.cycleStore.charger();
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('param.okRegles'),
            detail: p.libelle,
            life: 2500,
          });
        },
        error: () => this.erreur(this.i18n.instant('param.errEnr')),
      });
  }

  creer(): void {
    const lib = this.nouveauLibelle().trim();
    if (!lib) {
      this.erreur(this.i18n.instant('param.errNouvNom'));
      return;
    }
    this.caisse.creerCycle(this.cycleStore.cycleId(), lib).subscribe({
      next: (p) => {
        this.nouveauLibelle.set('');
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('param.okNouvelle'),
          detail: this.i18n.instant('param.okNouvelleDetail', { lib: p.libelle }),
          life: 3500,
        });
      },
      error: () => this.erreur(this.i18n.instant('param.errCreer')),
    });
  }

  cloturer(): void {
    if (!confirm(this.i18n.instant('param.confirmCloturer'))) return;
    this.caisse.cloturerCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.params.set(p);
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('param.okCloture'),
          detail: p.libelle,
          life: 2500,
        });
      },
      error: () => this.erreur(this.i18n.instant('param.errCloture')),
    });
  }

  enregistrerCaisse(): void {
    const nom = this.caisseNom().trim();
    if (!nom) {
      this.erreur(this.i18n.instant('param.errCaisseNom'));
      return;
    }
    this.caisse.renommerCaisse(this.cycleStore.cycleId(), nom).subscribe({
      next: (p) => {
        this.params.set(p);
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('param.okCaisse'),
          detail: p.caisseNom,
          life: 2500,
        });
      },
      error: () => this.erreur(this.i18n.instant('param.errEnr')),
    });
  }

  private erreur(detail: string): void {
    this.toast.add({ severity: 'error', summary: this.i18n.instant('param.errTitre'), detail });
  }
}
