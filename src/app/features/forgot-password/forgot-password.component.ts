import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

/**
 * Forgot-password entry point, linked from the login page.
 *
 * UI-only for now: submitting always shows the same generic confirmation, regardless
 * of whether the username/email actually matches an account — this avoids leaking
 * which usernames exist and matches how most real password-reset flows behave, even
 * before there's a backend endpoint or email delivery wired up.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  readonly usernameOrEmail = signal('');
  readonly submitted = signal(false);

  submit(): void {
    if (!this.usernameOrEmail().trim()) return;
    this.submitted.set(true);
  }
}
