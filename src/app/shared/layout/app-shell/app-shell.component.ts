import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastHostComponent } from '../../ui/toast-host/toast-host.component';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly layout = inject(LayoutService);

  readonly mobileNavOpen = this.layout.mobileNavOpen;

  closeMobileNav(): void {
    this.layout.closeMobileNav();
  }
}
