import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);

  readonly username = computed(() => this.auth.session()?.username ?? '');
  readonly role = computed(() => this.auth.role() ?? '');

  logout(): void {
    this.auth.logout();
  }
}
