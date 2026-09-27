import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly layout = inject(LayoutService);

  readonly username = computed(() => this.auth.session()?.username ?? '');
  readonly role = computed(() => this.auth.role() ?? '');
  readonly mobileNavOpen = this.layout.mobileNavOpen;

  toggleMobileNav(): void {
    this.layout.toggleMobileNav();
  }

  logout(): void {
    this.auth.logout();
  }
}
