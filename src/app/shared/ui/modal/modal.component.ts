import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Generic modal dialog shell. Replaces the inline "add"/"edit" forms that
 * previously appeared directly in the page flow (toggled by a formOpen/editingId
 * signal) across every admin CRUD page — the parent keeps owning that same
 * open/close signal and its form state; this component only supplies the
 * backdrop/dialog chrome via content projection, so no create/edit/save logic
 * needed to move.
 *
 * Usage:
 *   @if (formOpen()) {
 *     <app-modal title="New teacher" (close)="toggleForm()">
 *       <form (ngSubmit)="submit()"> ... </form>
 *     </app-modal>
 *   }
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal" [class.modal--wide]="wide" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <div class="modal__header">
          <div class="modal__title">{{ title }}</div>
          <button type="button" class="modal__close" aria-label="Close dialog" (click)="close.emit()">
            <lucide-angular name="x" [size]="18" aria-hidden="true"></lucide-angular>
          </button>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ModalComponent {
  @Input({ required: true }) title = '';
  @Input() wide = false;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
