import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CLASS_API } from '../../../core/api/api.tokens';
import { SchoolClass } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-classes-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classes-page.component.html'
})
export class ClassesPageComponent {
  private readonly api = inject(CLASS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);

  readonly formOpen = signal(false);
  readonly newName = signal('');
  readonly newOrder = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (rows) => { this.classes.set(rows); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.logger.error('Failed to load classes', { error: String(err) });
        this.toast.error('Failed to load classes');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.newName.set('');
    this.newOrder.set(null);
  }

  submit(): void {
    const name = this.newName().trim();
    const displayOrder = this.newOrder() ?? 0;
    if (!name) return;
    this.api.create({ name, displayOrder }).subscribe({
      next: (created) => {
        // The server orders GET /api/classes by displayOrder; simplest to just refetch
        // rather than guess where this new row belongs relative to existing ones.
        this.load();
        this.toast.success(`Class "${created.name}" added`);
        this.toggleForm();
      },
      error: (err) => {
        this.logger.error('Failed to create class', { error: String(err) });
        this.toast.error('Failed to create class');
      }
    });
  }
}
