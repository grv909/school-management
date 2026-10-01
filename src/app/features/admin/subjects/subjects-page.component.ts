import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CLASS_API, SUBJECT_API } from '../../../core/api/api.tokens';
import { apiErrorMessage } from '../../../core/api/api-error';
import { SchoolClass, Subject } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-subjects-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent, ModalComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subjects-page.component.html'
})
export class SubjectsPageComponent {
  private readonly api = inject(SUBJECT_API);
  private readonly classApi = inject(CLASS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly subjects = signal<Subject[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly form = signal({ name: '', code: '', maxMarks: 100 });
  readonly submitted = signal(false);

  // Which class's subjects the table is currently showing.
  readonly selectedClassId = signal<number | null>(null);

  // Subject currently being edited, if any.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal({ name: '', code: '', maxMarks: 100 });
  readonly editSubmitted = signal(false);

  readonly classOptions = computed<SelectOption<number | null>[]>(() =>
    this.classes().map(c => ({ value: c.id, label: c.name }))
  );

  constructor() {
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);
      const first = rows[0] ?? null;
      if (first) this.selectedClassId.set(first.id);
      this.loadSubjects();
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.loadSubjects();
  }

  private loadSubjects(): void {
    const classId = this.selectedClassId();
    if (classId == null) { this.subjects.set([]); this.loading.set(false); return; }
    this.loading.set(true);
    this.api.list(classId).subscribe({
      next: rows => { this.subjects.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load subjects', { error: String(err) });
        this.toast.error('Failed to load subjects');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ name: '', code: '', maxMarks: 100 });
    this.submitted.set(false);
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit() {
    this.submitted.set(true);
    const f = this.form();
    if (!f.name.trim() || !f.code.trim()) return;
    this.api.create({ name: f.name.trim(), code: f.code.trim().toUpperCase(), maxMarks: f.maxMarks })
      .subscribe({
        next: (created) => {
          this.toast.success(`Added subject "${created.name}". Assign it to a class from the Classes page.`);
          this.toggleForm();
        },
        error: err => {
          this.logger.error('Failed to create subject', { error: String(err) });
          this.toast.error('Failed to add subject');
        }
      });
  }

  subjectById(id: number): Subject | undefined {
    return this.subjects().find(s => s.id === id);
  }

  startEdit(s: Subject): void {
    this.editingId.set(s.id);
    this.editForm.set({ name: s.name, code: s.code, maxMarks: s.maxMarks });
    this.editSubmitted.set(false);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  patchEdit<K extends keyof ReturnType<typeof this.editForm>>(key: K, value: ReturnType<typeof this.editForm>[K]) {
    this.editForm.update(f => ({ ...f, [key]: value }));
  }

  saveEdit(id: number): void {
    this.editSubmitted.set(true);
    const f = this.editForm();
    if (!f.name.trim() || !f.code.trim()) return;
    this.api.update(id, { name: f.name.trim(), code: f.code.trim().toUpperCase(), maxMarks: f.maxMarks }).subscribe({
      next: updated => {
        this.subjects.update(arr => arr.map(s => s.id === id ? updated : s));
        this.toast.success(`Updated subject "${updated.name}"`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update subject', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update subject'));
      }
    });
  }

  remove(s: Subject): void {
    this.api.remove(s.id).subscribe({
      next: () => {
        this.subjects.update(arr => arr.filter(x => x.id !== s.id));
        this.toast.success(`Removed subject "${s.name}"`);
      },
      error: err => {
        this.logger.error('Failed to remove subject', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to remove subject'));
      }
    });
  }
}
