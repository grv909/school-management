import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ACADEMIC_YEAR_API } from '../../../core/api/api.tokens';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AcademicYear } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-academic-years-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './academic-years-page.component.html'
})
export class AcademicYearsPageComponent {
  private readonly api = inject(ACADEMIC_YEAR_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly years = signal<AcademicYear[]>([]);
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly form = signal({ name: '', startDate: '', endDate: '', current: false });

  // Academic year currently being edited, if any.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal({ name: '', startDate: '', endDate: '', current: false });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: rows => { this.years.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load academic years', { error: String(err) });
        this.toast.error('Failed to load academic years');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ name: '', startDate: '', endDate: '', current: false });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit(): void {
    const f = this.form();
    if (!f.name.trim() || !f.startDate || !f.endDate) return;
    this.api.create({
      name: f.name.trim(),
      startDate: f.startDate,
      endDate: f.endDate,
      current: f.current
    }).subscribe({
      next: (created) => {
        this.load();
        this.toast.success(`Academic year "${created.name}" added`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create academic year', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to add academic year'));
      }
    });
  }

  yearById(id: number): AcademicYear | undefined {
    return this.years().find(y => y.id === id);
  }

  startEdit(y: AcademicYear): void {
    this.editingId.set(y.id);
    this.editForm.set({ name: y.name, startDate: y.startDate, endDate: y.endDate, current: y.current });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  patchEdit<K extends keyof ReturnType<typeof this.editForm>>(key: K, value: ReturnType<typeof this.editForm>[K]) {
    this.editForm.update(f => ({ ...f, [key]: value }));
  }

  saveEdit(id: number): void {
    const f = this.editForm();
    if (!f.name.trim() || !f.startDate || !f.endDate) return;
    this.api.update(id, {
      name: f.name.trim(),
      startDate: f.startDate,
      endDate: f.endDate,
      current: f.current
    }).subscribe({
      next: () => {
        this.load();
        this.editingId.set(null);
        this.toast.success(`Academic year "${f.name.trim()}" updated`);
      },
      error: err => {
        this.logger.error('Failed to update academic year', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update academic year'));
      }
    });
  }

  remove(y: AcademicYear): void {
    this.api.remove(y.id).subscribe({
      next: () => {
        this.years.update(arr => arr.filter(x => x.id !== y.id));
        this.toast.success(`Removed academic year "${y.name}"`);
      },
      error: err => {
        this.logger.error('Failed to remove academic year', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to remove academic year'));
      }
    });
  }
}
