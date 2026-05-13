import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../core/ui/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss'
})
export class ToastHostComponent {
  readonly service = inject(ToastService);
}
