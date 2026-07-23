import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../core/state/auth-store';

@Component({
  selector: 'app-login',
  imports: [FormsModule, InputText, Password, Button, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly identifiant = signal('');
  protected readonly motDePasse = signal('');
  protected readonly enCours = signal(false);
  protected readonly erreur = signal(false);

  seConnecter(): void {
    const u = this.identifiant().trim();
    const p = this.motDePasse();
    if (!u || !p) return;
    this.enCours.set(true);
    this.erreur.set(false);
    this.auth.seConnecter(u, p).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.erreur.set(true);
        this.enCours.set(false);
      },
    });
  }
}
