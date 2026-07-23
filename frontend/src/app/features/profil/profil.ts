import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthStore } from '../../core/state/auth-store';

@Component({
  selector: 'app-profil',
  imports: [FormsModule, Password, Button, TranslatePipe],
  templateUrl: './profil.html',
  styleUrl: './profil.scss',
})
export class Profil {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  protected readonly username = this.auth.username;

  protected readonly ancien = signal('');
  protected readonly nouveau = signal('');
  protected readonly confirmation = signal('');
  protected readonly enCours = signal(false);

  changer(): void {
    const a = this.ancien();
    const n = this.nouveau();
    const c = this.confirmation();
    if (!a || !n) return;
    if (n !== c) {
      this.toast.add({
        severity: 'error',
        summary: this.i18n.instant('profil.erreurTitre'),
        detail: this.i18n.instant('profil.pasIdentiques'),
      });
      return;
    }
    this.enCours.set(true);
    this.auth.changerMotDePasse(a, n).subscribe({
      next: () => {
        this.enCours.set(false);
        this.ancien.set('');
        this.nouveau.set('');
        this.confirmation.set('');
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('profil.okTitre'),
          detail: this.i18n.instant('profil.okDetail'),
          life: 3000,
        });
      },
      error: () => {
        this.enCours.set(false);
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('profil.erreurTitre'),
          detail: this.i18n.instant('profil.erreurMdp'),
        });
      },
    });
  }

  deconnecter(): void {
    this.auth.deconnecter();
    this.router.navigate(['/login']);
  }
}
