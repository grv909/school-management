import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { LoggerService } from '../../core/logging/logger.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  readonly username = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.submitting()) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    // Do NOT log the password under any circumstance.
    this.logger.debug('Login submit', { username: this.username() });
    this.auth.login(this.username().trim(), this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        const role = this.auth.role();
        this.router.navigate([role === 'ADMIN' ? '/admin' : '/teacher']);
      },
      error: (err: Error) => {
        this.submitting.set(false);
        this.errorMessage.set(err.message || 'Login failed');
      }
    });
  }
}
