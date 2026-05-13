import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html'
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
