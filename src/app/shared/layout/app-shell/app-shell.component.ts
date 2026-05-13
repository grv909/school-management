import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastHostComponent } from '../../ui/toast-host/toast-host.component';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {}
