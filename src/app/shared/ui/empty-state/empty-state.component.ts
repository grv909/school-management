import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Enforces the title+hint+action pattern for genuinely-empty data (as opposed to
 * still-loading, which is app-skeleton's job — the two must never share a look,
 * per the redesign audit finding that .empty-state was previously reused for both).
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      @if (icon) {
        <lucide-angular [name]="icon" [size]="32" class="empty-state__icon" aria-hidden="true"></lucide-angular>
      }
      <div class="empty-state__title">{{ title }}</div>
      @if (hint) {
        <div class="empty-state__hint">{{ hint }}</div>
      }
      @if (actionLabel) {
        <button type="button" class="btn btn--secondary btn--sm" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() hint = '';
  @Input() actionLabel = '';
  @Input() icon = '';
  @Output() action = new EventEmitter<void>();
}
