import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TEACHER_API } from '../../../core/api/api.tokens';
import { Teacher } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-teachers-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teachers-page.component.html'
})
export class TeachersPageComponent {
  private readonly api = inject(TEACHER_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly teachers = signal<Teacher[]>([]);
  readonly loading = signal(true);

  readonly formOpen = signal(false);
  readonly form = signal({ firstName: '', lastName: '', employeeNo: '', username: '', password: '' });

  // Teacher currently being edited, if any — drives the inline edit form below its row.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal({ firstName: '', lastName: '', employeeNo: '' });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: rows => { this.teachers.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load teachers', { error: String(err) });
        this.toast.error('Failed to load teachers');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ firstName: '', lastName: '', employeeNo: '', username: '', password: '' });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit(): void {
    const f = this.form();
    if (!f.firstName.trim() || !f.lastName.trim() || !f.username.trim() || !f.password) return;
    this.api.create({
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      employeeNo: f.employeeNo.trim(),
      username: f.username.trim(),
      password: f.password
    }).subscribe({
      next: (created) => {
        this.teachers.update(arr => [...arr, created]);
        this.toast.success(`Added ${created.firstName} ${created.lastName}`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create teacher', { error: String(err) });
        this.toast.error('Failed to add teacher');
      }
    });
  }

  startEdit(t: Teacher): void {
    this.editingId.set(t.id);
    this.editForm.set({ firstName: t.firstName, lastName: t.lastName, employeeNo: t.employeeNo ?? '' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  patchEdit<K extends keyof ReturnType<typeof this.editForm>>(key: K, value: ReturnType<typeof this.editForm>[K]) {
    this.editForm.update(f => ({ ...f, [key]: value }));
  }

  saveEdit(id: number): void {
    const f = this.editForm();
    if (!f.firstName.trim() || !f.lastName.trim()) return;
    this.api.update(id, {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      employeeNo: f.employeeNo.trim()
    }).subscribe({
      next: (updated) => {
        this.teachers.update(arr => arr.map(t => t.id === id ? updated : t));
        this.toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update teacher', { error: String(err) });
        this.toast.error('Failed to update teacher');
      }
    });
  }
}
