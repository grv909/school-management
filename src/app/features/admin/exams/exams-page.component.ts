import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ACADEMIC_YEAR_API, CLASS_API, EXAM_API } from '../../../core/api/api.tokens';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AcademicYear, Exam, SchoolClass } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-exams-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent, ModalComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exams-page.component.html'
})
export class ExamsPageComponent {
  private readonly examApi = inject(EXAM_API);
  private readonly yearApi = inject(ACADEMIC_YEAR_API);
  private readonly classApi = inject(CLASS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly exams = signal<Exam[]>([]);
  readonly years = signal<AcademicYear[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);

  // Which class's exams the table is currently showing.
  readonly selectedClassId = signal<number | null>(null);

  readonly formOpen = signal(false);
  readonly form = signal<{ name: string; academicYearId: number | null; classId: number | null; maxMarks: number | null; startDate: string; endDate: string }>({
    name: '', academicYearId: null, classId: null, maxMarks: 100, startDate: '', endDate: ''
  });
  readonly submitted = signal(false);

  // Exam currently being edited, if any.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal<{ name: string; academicYearId: number | null; classId: number | null; maxMarks: number | null; startDate: string; endDate: string }>({
    name: '', academicYearId: null, classId: null, maxMarks: 100, startDate: '', endDate: ''
  });
  readonly editSubmitted = signal(false);

  constructor() {
    this.yearApi.list().subscribe(rows => {
      this.years.set(rows);
      const current = rows.find(y => y.current) ?? rows[0];
      if (current) this.form.update(f => ({ ...f, academicYearId: current.id }));
    });
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);
      const first = rows[0] ?? null;
      if (first) {
        this.selectedClassId.set(first.id);
        this.form.update(f => ({ ...f, classId: first.id }));
      }
      this.loadExams();
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.loadExams();
  }

  private loadExams(): void {
    const classId = this.selectedClassId();
    if (classId == null) { this.exams.set([]); this.loading.set(false); return; }
    this.loading.set(true);
    this.examApi.list(classId).subscribe({
      next: rows => { this.exams.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load exams', { error: String(err) });
        this.toast.error('Failed to load exams');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    const yearId = this.years().find(y => y.current)?.id ?? this.years()[0]?.id ?? null;
    this.form.set({ name: '', academicYearId: yearId, classId: this.selectedClassId(), maxMarks: 100, startDate: '', endDate: '' });
    this.submitted.set(false);
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit() {
    this.submitted.set(true);
    const f = this.form();
    if (!f.name.trim() || !f.academicYearId || !f.classId || !f.maxMarks) return;
    this.examApi.create({
      name: f.name.trim(),
      academicYearId: f.academicYearId,
      classId: f.classId,
      maxMarks: f.maxMarks,
      startDate: f.startDate || null,
      endDate: f.endDate || null
    }).subscribe({
      next: (created) => {
        if (created.classId === this.selectedClassId()) {
          this.exams.update(arr => [created, ...arr]);
        }
        this.toast.success(`Created exam "${created.name}"`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create exam', { error: String(err) });
        this.toast.error('Failed to create exam');
      }
    });
  }

  yearName(id: number): string {
    return this.years().find(y => y.id === id)?.name ?? '—';
  }

  className(id: number): string {
    return this.classes().find(c => c.id === id)?.name ?? '—';
  }

  readonly classOptions = computed<SelectOption<number | null>[]>(() =>
    this.classes().map(c => ({ value: c.id, label: c.name }))
  );

  readonly academicYearOptions = computed<SelectOption<number | null>[]>(() =>
    this.years().map(y => ({ value: y.id, label: y.name + (y.current ? ' (current)' : '') }))
  );

  examById(id: number): Exam | undefined {
    return this.exams().find(e => e.id === id);
  }

  startEdit(e: Exam): void {
    this.editingId.set(e.id);
    this.editForm.set({
      name: e.name,
      academicYearId: e.academicYearId,
      classId: e.classId,
      maxMarks: e.maxMarks,
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? ''
    });
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
    if (!f.name.trim() || !f.academicYearId || !f.classId || !f.maxMarks) return;
    this.examApi.update(id, {
      name: f.name.trim(),
      academicYearId: f.academicYearId,
      classId: f.classId,
      maxMarks: f.maxMarks,
      startDate: f.startDate || null,
      endDate: f.endDate || null
    }).subscribe({
      next: updated => {
        if (updated.classId === this.selectedClassId()) {
          this.exams.update(arr => arr.map(e => e.id === id ? updated : e));
        } else {
          // Moved to a different class — drop it from this class-scoped list.
          this.exams.update(arr => arr.filter(e => e.id !== id));
        }
        this.toast.success(`Updated exam "${updated.name}"`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update exam', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update exam'));
      }
    });
  }

  remove(e: Exam): void {
    this.examApi.remove(e.id).subscribe({
      next: () => {
        this.exams.update(arr => arr.filter(x => x.id !== e.id));
        this.toast.success(`Removed exam "${e.name}"`);
      },
      error: err => {
        this.logger.error('Failed to remove exam', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to remove exam'));
      }
    });
  }
}
